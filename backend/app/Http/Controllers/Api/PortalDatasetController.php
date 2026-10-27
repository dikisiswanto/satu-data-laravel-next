<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\ProcessDatasetConversion;
use App\Models\ConversionJob;
use App\Models\Dataset;
use App\Models\DatasetResource;
use App\Models\DatasetSdiMetadata;
use App\Models\DatasetVersion;
use App\Models\User;
use App\Services\AccessService;
use App\Services\AuditService;
use App\Services\DatasetWorkflowService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PortalDatasetController extends Controller
{
    public function __construct(private readonly AccessService $access, private readonly DatasetWorkflowService $workflow, private readonly AuditService $audit) {}

    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'q' => ['sometimes', 'string', 'max:100'],
            'status' => ['sometimes', 'in:draft,review,published,archived'],
            'statuses' => ['sometimes', 'string', 'max:100'],
            'organization_id' => ['sometimes', 'uuid'],
            'organization_ids' => ['sometimes', 'string', 'max:20000'],
            'created_from' => ['sometimes', 'date_format:Y-m-d'],
            'created_to' => ['sometimes', 'date_format:Y-m-d', 'after_or_equal:created_from'],
            'organization_active' => ['sometimes', 'boolean'],
            'published_at_not_null' => ['sometimes', 'boolean'],
            'published_before' => ['sometimes', 'date'],
            'include_sdi_metadata' => ['sometimes', 'boolean'],
            'limit' => ['sometimes', 'integer', 'min:1', 'max:500'],
            'offset' => ['sometimes', 'integer', 'min:0', 'max:100000'],
            'sort' => ['sometimes', 'in:updated_desc,updated_asc,title_asc,title_desc,created_asc,created_desc'],
        ]);
        /** @var User $user */
        $user = $request->user();
        $query = Dataset::query()->with(['organization:id,name,slug,code,is_active,official_email,official_url,created_at,updated_at', 'resources' => fn ($q) => $q->select('id', 'dataset_id', 'dataset_version', 'original_filename', 'format', 'size_bytes', 'row_count', 'column_schema', 'preview_enabled', 'is_source', 'is_public', 'conversion_status', 'created_at')]);
        $this->scopeDatasets($query, $user);

        $allowedStatuses = ['draft', 'review', 'published', 'archived'];
        $statusesRaw = $request->query('statuses');
        $statuses = is_string($statusesRaw)
            ? array_values(array_intersect($allowedStatuses, array_filter(array_map('trim', explode(',', $statusesRaw)))))
            : [];
        if ($statuses !== []) {
            $query->whereIn('status', $statuses);
        } elseif ($request->filled('status') && in_array($request->query('status'), $allowedStatuses, true)) {
            $query->where('status', $request->query('status'));
        }

        if ($request->filled('organization_id')) {
            $query->where('organization_id', $request->string('organization_id')->toString());
        }
        if ($request->filled('organization_ids')) {
            $organizationIds = array_values(array_filter(array_slice(explode(',', (string) $request->query('organization_ids')), 0, 500), fn ($id) => is_string($id) && preg_match('/^[0-9a-fA-F-]{36}$/', $id)));
            if ($organizationIds !== []) {
                $query->whereIn('organization_id', $organizationIds);
            } else {
                $query->whereRaw('1 = 0');
            }
        }
        if ($request->filled('q')) {
            $term = '%'.str_replace(['%', '_'], ['\\%', '\\_'], mb_substr(trim($request->string('q')->toString()), 0, 100)).'%';
            $query->where(fn ($q) => $q->whereRaw('LOWER(title) LIKE LOWER(?)', [$term])->orWhereRaw('LOWER(description) LIKE LOWER(?)', [$term])->orWhereRaw('LOWER(source_name) LIKE LOWER(?)', [$term])->orWhereRaw('LOWER(code) LIKE LOWER(?)', [$term])->orWhereRaw('LOWER(slug) LIKE LOWER(?)', [$term]));
        }
        foreach (['created_from' => '>=', 'created_to' => '<='] as $field => $operator) {
            if ($request->filled($field)) {
                $date = substr((string) $request->query($field), 0, 10);
                if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
                    $query->whereDate('created_at', $operator, $date);
                }
            }
        }
        if ($request->boolean('organization_active')) {
            $query->whereHas('organization', fn ($q) => $q->where('is_active', true));
        }
        if ($request->boolean('published_at_not_null')) {
            $query->whereNotNull('published_at');
        }
        if ($request->filled('published_before')) {
            $query->where('published_at', '<=', $request->query('published_before'));
        }

        $sort = (string) $request->query('sort', 'updated_desc');
        match ($sort) {
            'updated_asc' => $query->orderBy('updated_at'),
            'title_asc', 'title' => $query->orderBy('title'),
            'title_desc' => $query->orderByDesc('title'),
            'created_asc' => $query->orderBy('created_at'),
            'created_desc' => $query->orderByDesc('created_at'),
            default => $query->orderByDesc('updated_at'),
        };

        $total = (clone $query)->count('datasets.id');
        $limit = min(500, max(1, (int) $request->query('limit', 100)));
        $offset = min(100000, max(0, (int) $request->query('offset', 0)));
        $datasets = $query->offset($offset)->limit($limit)->get();
        $data = $datasets->map(fn ($dataset) => $this->datasetArray($dataset))->all();

        // The SDI readiness screen consumes metadata across versions. Return it only
        // when explicitly requested instead of expanding every ordinary portal list.
        if ($request->boolean('include_sdi_metadata') && $datasets->isNotEmpty()) {
            $metadataRows = DB::table('dataset_sdi_metadata as m')
                ->leftJoin('sdi_standard_registry as s', 's.id', '=', 'm.sds_registry_id')
                ->leftJoin('reference_code_systems as r', 'r.id', '=', 'm.reference_system_id')
                ->whereIn('m.dataset_id', $datasets->pluck('id'))
                ->orderBy('m.dataset_version')
                ->get([
                    'm.*',
                    's.id as joined_standard_id', 's.standard_code as joined_standard_code', 's.title as joined_standard_title', 's.definition as joined_standard_definition', 's.version_label as joined_standard_version',
                    's.status as joined_standard_status', 's.valid_from as joined_standard_valid_from', 's.valid_until as joined_standard_valid_until',
                    'r.id as joined_system_id', 'r.system_code as joined_system_code', 'r.title as joined_system_title', 'r.version_label as joined_system_version',
                    'r.status as joined_system_status', 'r.valid_from as joined_system_valid_from', 'r.valid_until as joined_system_valid_until',
                ])
                ->map(function ($item) {
                    $row = (array) $item;
                    $row['sdi_standard_registry'] = $row['joined_standard_id'] ? [
                        'id' => $row['joined_standard_id'], 'standard_code' => $row['joined_standard_code'],
                        'title' => $row['joined_standard_title'], 'definition' => $row['joined_standard_definition'], 'version_label' => $row['joined_standard_version'], 'status' => $row['joined_standard_status'],
                        'valid_from' => $row['joined_standard_valid_from'], 'valid_until' => $row['joined_standard_valid_until'],
                    ] : null;
                    $row['reference_code_systems'] = $row['joined_system_id'] ? [
                        'id' => $row['joined_system_id'], 'system_code' => $row['joined_system_code'], 'title' => $row['joined_system_title'],
                        'version_label' => $row['joined_system_version'], 'status' => $row['joined_system_status'],
                        'valid_from' => $row['joined_system_valid_from'], 'valid_until' => $row['joined_system_valid_until'],
                    ] : null;
                    if (isset($row['presentation_classification']) && is_string($row['presentation_classification'])) {
                        $decoded = json_decode($row['presentation_classification'], true);
                        $row['presentation_classification'] = is_array($decoded) ? $decoded : [];
                    }
                    if (isset($row['available_year'])) {
                        $row['available_year'] = (int) $row['available_year'];
                    }
                    if (isset($row['dataset_version'])) {
                        $row['dataset_version'] = (int) $row['dataset_version'];
                    }
                    foreach (['joined_standard_id', 'joined_standard_code', 'joined_standard_title', 'joined_standard_definition', 'joined_standard_version', 'joined_standard_status', 'joined_standard_valid_from', 'joined_standard_valid_until', 'joined_system_id', 'joined_system_code', 'joined_system_title', 'joined_system_version', 'joined_system_status', 'joined_system_valid_from', 'joined_system_valid_until'] as $joinedColumn) {
                        unset($row[$joinedColumn]);
                    }

                    return $row;
                })
                ->groupBy('dataset_id');
            foreach ($data as &$row) {
                $row['dataset_sdi_metadata'] = ($metadataRows->get($row['id']) ?? collect())->values()->all();
            }
            unset($row);
        }

        return response()->json(['data' => $data, 'meta' => ['total' => $total, 'limit' => $limit, 'offset' => $offset]], 200, ['Cache-Control' => 'private, no-store']);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $dataset = Dataset::query()->with(['organization:id,name,slug,code,is_active,official_email,official_url,created_at,updated_at', 'resources' => fn ($q) => $q->orderByDesc('created_at'), 'versions' => fn ($q) => $q->orderByDesc('version')])->find($id);
        if (! $dataset) {
            return response()->json(['error' => 'not_found'], 404);
        }
        if (! $this->access->hasPermissionInOrganization($request->user(), $dataset->organization_id, 'datasets.read')) {
            return response()->json(['error' => 'forbidden'], 403);
        }
        $data = $this->datasetArray($dataset);
        $data['versions'] = $dataset->versions->map(fn ($version) => ['id' => $version->id, 'version' => $version->version, 'version_status' => $version->version_status, 'change_summary' => $version->change_summary, 'created_at' => $version->created_at, 'metadata_snapshot' => $version->metadata_snapshot])->all();
        if ($dataset->status === 'published' && $dataset->draft_version) {
            $draftSnapshot = $dataset->versions->firstWhere('version', (int) $dataset->draft_version)?->metadata_snapshot;
            if (is_array($draftSnapshot)) {
                foreach (['title', 'description', 'category', 'keywords', 'reference_period_start', 'reference_period_end', 'geographic_scope', 'update_frequency', 'source_name', 'source_url', 'methodology', 'unit', 'license_text', 'contact'] as $field) {
                    if (array_key_exists($field, $draftSnapshot)) {
                        $data[$field] = $draftSnapshot[$field];
                    }
                }
                $data['draft_metadata_snapshot'] = $draftSnapshot;
            }
        }
        $data['conversion_jobs'] = ConversionJob::query()->where('dataset_id', $dataset->id)->orderByDesc('created_at')->limit(20)->get(['id', 'dataset_version', 'source_resource_id', 'status', 'attempts', 'max_attempts', 'safe_error_message', 'created_at', 'started_at', 'finished_at', 'updated_at', 'lease_expires_at']);
        $data['sdi_metadata'] = DatasetSdiMetadata::query()->where('dataset_id', $dataset->id)->where('dataset_version', $dataset->draft_version ?: $dataset->current_version)->first();
        // Compatibility relation used by existing edit and integration pages:
        // callers select a specific dataset_version after fetching the dataset.
        // Return every metadata version so filtering never depends on which
        // version is currently active or on an arbitrary page cap.
        $data['dataset_sdi_metadata'] = DatasetSdiMetadata::query()->where('dataset_id', $dataset->id)->orderBy('dataset_version')->get();

        return response()->json(['data' => $data], 200, ['Cache-Control' => 'private, no-store']);
    }

    public function create(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'min:5', 'max:180'],
            // Draf yang dapat ditelusuri harus mudah dibuat. Metadata penting untuk publikasi
            // dilengkapi kemudian dan divalidasi saat submit_for_review.
            'description' => ['nullable', 'string', 'min:20', 'max:5000'],
            'organization_id' => ['required', 'uuid', 'exists:organizations,id'],
            'source_name' => ['nullable', 'string', 'min:2', 'max:240'],
            'geographic_scope' => ['nullable', 'string', 'min:2', 'max:240'],
            'license_text' => ['nullable', 'string', 'min:2', 'max:240'],
            'update_frequency' => ['nullable', 'in:daily,weekly,monthly,quarterly,yearly,irregular,one_time'],
            'reference_period_start' => ['nullable', 'date_format:Y-m-d'],
            'reference_period_end' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:reference_period_start'],
            'sdi_metadata' => ['sometimes', 'array'],
        ]);
        $dataset = $this->workflow->createDraft($request->user(), $data);

        return response()->json(['data' => $this->datasetArray($dataset)], 201, ['Cache-Control' => 'no-store']);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $dataset = Dataset::query()->find($id);
        if (! $dataset) {
            return response()->json(['error' => 'not_found'], 404);
        }
        $data = $request->validate([
            'title' => ['required', 'string', 'min:5', 'max:180'],
            'description' => ['required', 'string', 'min:20', 'max:5000'],
            'category' => ['nullable', 'string', 'max:120'],
            'keywords' => ['sometimes', 'array', 'max:30'], 'keywords.*' => ['string', 'min:1', 'max:80'],
            'reference_period_start' => ['nullable', 'date_format:Y-m-d'],
            'reference_period_end' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:reference_period_start'],
            'geographic_scope' => ['required', 'string', 'min:2', 'max:240'],
            'update_frequency' => ['required', 'in:daily,weekly,monthly,quarterly,yearly,irregular,one_time'],
            'source_name' => ['required', 'string', 'min:2', 'max:240'],
            'source_url' => ['nullable', 'url:http,https', 'max:2048'],
            'methodology' => ['nullable', 'string', 'max:10000'], 'unit' => ['nullable', 'string', 'max:100'],
            'license_text' => ['required', 'string', 'min:2', 'max:240'], 'sdi_metadata' => ['sometimes', 'array'],
        ]);
        $updated = $this->workflow->updateMetadata($request->user(), $dataset, $data);

        return response()->json(['data' => $this->datasetArray($updated)], 200, ['Cache-Control' => 'no-store']);
    }

    public function workflowAction(Request $request, string $id): JsonResponse
    {
        $dataset = Dataset::query()->find($id);
        if (! $dataset) {
            return response()->json(['error' => 'not_found'], 404);
        }
        $data = $request->validate(['action' => ['required', 'in:submit_for_review,publish,archive,return_for_changes,abandon_version,start_version'], 'reason' => ['sometimes', 'string', 'max:1000'], 'change_summary' => ['sometimes', 'string', 'min:5', 'max:500']]);
        if ($data['action'] === 'start_version') {
            $version = $this->workflow->startVersion($request->user(), $dataset, $data['change_summary'] ?? 'Pembaruan dataset');

            return response()->json(['data' => ['dataset_id' => $dataset->id, 'draft_version' => $version]], 201, ['Cache-Control' => 'no-store']);
        }
        $updated = $this->workflow->transition($request->user(), $dataset, $data['action'], $data['reason'] ?? '');

        return response()->json(['data' => $this->datasetArray($updated)], 200, ['Cache-Control' => 'no-store']);
    }

    public function updateSdiMetadata(Request $request, string $id): JsonResponse
    {
        $data = $request->validate([
            'sdi_metadata' => ['required', 'array'],
            'sdi_metadata.ddp_id' => ['nullable', 'string', 'max:160'],
            'sdi_metadata.ddp_name' => ['nullable', 'string', 'max:240'],
            'sdi_metadata.available_year' => ['nullable', 'integer', 'between:1900,2200'],
            'sdi_metadata.presentation_classification' => ['sometimes', 'array', 'max:100'],
            'sdi_metadata.presentation_classification.*' => ['string', 'max:160'],
        ]);

        $metadata = DB::transaction(function () use ($request, $id, $data): object {
            $dataset = Dataset::query()->lockForUpdate()->findOrFail($id);
            $this->access->requirePermissionInOrganization($request->user(), $dataset->organization_id, 'datasets.metadata.write');

            if (! in_array($dataset->status, ['draft', 'published'], true)) {
                throw ValidationException::withMessages(['status' => ['dataset_not_editable']]);
            }
            // Never mutate metadata attached to the currently published version.
            // A published dataset must first open a draft replacement version.
            if ($dataset->status === 'published' && ! $dataset->draft_version) {
                throw ValidationException::withMessages(['status' => ['start_a_draft_version_first']]);
            }

            $version = (int) ($dataset->draft_version ?: $dataset->current_version);
            $versionRow = DatasetVersion::query()
                ->where('dataset_id', $dataset->id)
                ->where('version', $version)
                ->lockForUpdate()
                ->first();
            if (! $versionRow || ($dataset->status === 'published' && $versionRow->version_status !== 'draft')) {
                throw ValidationException::withMessages(['status' => ['dataset_not_editable']]);
            }

            $this->workflow->saveSdiMetadata($dataset, $version, $data['sdi_metadata']);
            $this->audit->record($request->user()->id, 'dataset.sdi_metadata_update', 'dataset', $dataset->id, $dataset->organization_id, 'success', ['version' => $version]);

            return (object) [
                'dataset_id' => $dataset->id,
                'dataset_version' => $version,
                'metadata' => DB::table('dataset_sdi_metadata')->where('dataset_id', $dataset->id)->where('dataset_version', $version)->first(),
            ];
        }, 3);

        return response()->json(['data' => $metadata->metadata], 200, ['Cache-Control' => 'no-store']);
    }

    public function uploadControl(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        $data = $request->validate(['action' => ['required', 'in:prepare,complete,cleanup'], 'filename' => ['required_if:action,prepare', 'string', 'max:255'], 'size' => ['required_if:action,prepare', 'integer', 'min:1', 'max:'.(int) config('satu_data.conversion.max_upload_bytes', 26214400)], 'mimeType' => ['nullable', 'string', 'max:160'], 'path' => ['required_unless:action,prepare', 'string', 'max:1024'], 'checksumSha256' => ['required_if:action,complete', 'regex:/^[a-f0-9]{64}$/']]);
        $dataset = Dataset::query()->find($id);
        if (! $dataset) {
            return response()->json(['error' => 'dataset_not_found'], 404, ['Cache-Control' => 'no-store']);
        }
        $version = $this->editableVersion($user, $dataset);
        if (! $version) {
            return response()->json(['error' => 'dataset_not_editable'], 409, ['Cache-Control' => 'no-store']);
        }

        if ($data['action'] === 'prepare') {
            $filename = $this->sanitizeFilename($data['filename']);
            $format = $this->detectFormat($filename, (string) ($data['mimeType'] ?? ''));
            if (! $format) {
                return response()->json(['error' => 'file_type_not_allowed'], 415, ['Cache-Control' => 'no-store']);
            }
            $path = $dataset->organization_id.'/'.$dataset->id.'/v'.$version.'/source/'.Str::uuid().'.'.$format;
            $token = Str::random(64);
            DB::table('dataset_upload_sessions')->insert([
                'id' => (string) Str::uuid(), 'dataset_id' => $dataset->id, 'user_id' => $user->id,
                'dataset_version' => $version, 'storage_path' => $path, 'token_hash' => hash('sha256', $token),
                'original_filename' => $filename, 'format' => $format, 'mime_type' => $this->mimeFor($format),
                'expected_size' => $data['size'], 'expires_at' => now()->addMinutes(15), 'created_at' => now(),
            ]);
            $configuredPublicApi = trim((string) config('satu_data.public_backend_api_url', ''));
            $uploadBase = $configuredPublicApi !== '' ? rtrim($configuredPublicApi, '/') : '';
            $uploadUrl = $uploadBase.'/api/v1/portal/datasets/'.$dataset->id.'/uploads/content?path='.rawurlencode($path);

            return response()->json(['path' => $path, 'token' => $token, 'mimeType' => $this->mimeFor($format), 'format' => $format, 'uploadUrl' => $uploadUrl], 200, ['Cache-Control' => 'no-store']);
        }

        $session = DB::table('dataset_upload_sessions')->where('dataset_id', $dataset->id)->where('user_id', $user->id)->where('storage_path', $data['path'])->where('expires_at', '>', now())->first();
        if (! $session) {
            return response()->json(['error' => 'upload_path_invalid'], 409, ['Cache-Control' => 'no-store']);
        }
        if ($data['action'] === 'cleanup') {
            Storage::disk('private')->delete($session->storage_path);
            DB::table('dataset_upload_sessions')->where('id', $session->id)->delete();

            return response()->json(['data' => ['cleaned' => true]], 200, ['Cache-Control' => 'no-store']);
        }
        if (! $session->uploaded_at || ! Storage::disk('private')->exists($session->storage_path)) {
            return response()->json(['error' => 'upload_not_received'], 409, ['Cache-Control' => 'no-store']);
        }
        $stream = Storage::disk('private')->readStream($session->storage_path);
        if (! is_resource($stream)) {
            return response()->json(['error' => 'upload_not_received'], 409, ['Cache-Control' => 'no-store']);
        }
        $hasher = hash_init('sha256');
        $actualSize = 0;
        try {
            while (! feof($stream)) {
                $chunk = fread($stream, 1024 * 1024);
                if ($chunk === false) {
                    throw new \RuntimeException('storage_read_failed');
                }
                if ($chunk === '') {
                    break;
                }
                $actualSize += strlen($chunk);
                hash_update($hasher, $chunk);
            }
        } finally {
            fclose($stream);
        }
        if ($actualSize !== (int) $session->expected_size) {
            return response()->json(['error' => 'file_size_invalid'], 422, ['Cache-Control' => 'no-store']);
        }
        $checksum = hash_final($hasher);
        if (! hash_equals($checksum, strtolower($data['checksumSha256']))) {
            return response()->json(['error' => 'checksum_invalid'], 422, ['Cache-Control' => 'no-store']);
        }

        $result = DB::transaction(function () use ($session, $dataset, $user, $checksum, $version): array {
            $sessionLock = DB::table('dataset_upload_sessions')->where('id', $session->id)->lockForUpdate()->first();
            if (! $sessionLock) {
                throw ValidationException::withMessages(['path' => ['upload_path_invalid']]);
            }
            $resource = DatasetResource::query()->create([
                'dataset_id' => $dataset->id, 'dataset_version' => $version, 'storage_path' => $session->storage_path,
                'original_filename' => $session->original_filename, 'format' => $session->format, 'mime_type' => $session->mime_type,
                'size_bytes' => (int) $session->expected_size, 'checksum_sha256' => $checksum, 'is_source' => true, 'is_public' => false,
                'conversion_status' => 'queued', 'converter_version' => null, 'created_by' => $user->id, 'column_schema' => [], 'preview_enabled' => false, 'created_at' => now(),
            ]);
            $idempotencyKey = hash('sha256', implode('|', [$dataset->id, $version, $checksum]));
            $job = ConversionJob::query()->firstOrCreate(['idempotency_key' => $idempotencyKey], [
                'dataset_id' => $dataset->id, 'dataset_version' => $version, 'source_resource_id' => $resource->id,
                'target_format' => 'multi', 'status' => 'queued', 'attempts' => 0, 'requested_by' => $user->id, 'max_attempts' => 3,
            ]);
            $jobWasCreated = $job->wasRecentlyCreated;
            $job = ConversionJob::query()->lockForUpdate()->findOrFail($job->id);
            if (! $jobWasCreated) {
                if ($job->status === 'succeeded') {
                    throw ValidationException::withMessages(['source' => ['source_already_processed']]);
                }
                if (! in_array($job->status, ['failed', 'cancelled'], true)) {
                    throw ValidationException::withMessages(['source' => ['conversion_already_pending']]);
                }
                $job->update([
                    'source_resource_id' => $resource->id, 'status' => 'queued', 'attempts' => 0,
                    'requested_by' => $user->id, 'started_at' => null, 'finished_at' => null,
                    'error_code' => null, 'safe_error_message' => null, 'worker_id' => null,
                    'lease_expires_at' => null,
                ]);
                $job->refresh();
            }
            DB::table('dataset_versions')->where('dataset_id', $dataset->id)->where('version', $version)->update(['source_resource_id' => $resource->id]);
            DB::table('dataset_upload_sessions')->where('id', $session->id)->delete();
            $this->audit->record($user->id, 'dataset.source_upload', 'dataset', $dataset->id, $dataset->organization_id, 'success', ['resource_id' => $resource->id, 'version' => $version, 'size' => $resource->size_bytes, 'format' => $resource->format]);

            return ['resource' => $resource, 'job' => $job];
        });
        ProcessDatasetConversion::dispatch($result['job']->id)->afterCommit();

        return response()->json(['status' => 'queued', 'resourceId' => $result['resource']->id, 'data' => ['resource' => $result['resource'], 'job' => ['id' => $result['job']->id, 'status' => $result['job']->status]]], 201, ['Cache-Control' => 'no-store']);
    }

    public function uploadContent(Request $request, string $id): JsonResponse
    {
        $path = (string) $request->query('path', '');
        $token = (string) $request->header('X-Upload-Token', '');
        if ($path === '' || strlen($path) > 700 || str_contains($path, '..') || str_starts_with($path, '/')) {
            return response()->json(['error' => 'upload_path_invalid'], 400, ['Cache-Control' => 'no-store']);
        }
        $file = $request->file('file');
        if (! $file || ! $file->isValid()) {
            return response()->json(['error' => 'upload_file_invalid'], 400, ['Cache-Control' => 'no-store']);
        }

        $maxBytes = (int) config('satu_data.conversion.max_upload_bytes', 26214400);
        if ($file->getSize() < 1 || $file->getSize() > $maxBytes) {
            return response()->json(['error' => 'file_size_invalid'], 413, ['Cache-Control' => 'no-store']);
        }

        try {
            $result = DB::transaction(function () use ($id, $path, $token, $file, $maxBytes): array {
                $session = DB::table('dataset_upload_sessions')
                    ->where('dataset_id', $id)->where('storage_path', $path)->where('expires_at', '>', now())
                    ->lockForUpdate()->first();
                if (! $session || $token === '' || ! hash_equals($session->token_hash, hash('sha256', $token))) {
                    throw ValidationException::withMessages(['upload' => ['upload_token_invalid']]);
                }
                if ($session->uploaded_at) {
                    throw ValidationException::withMessages(['upload' => ['upload_already_received']]);
                }
                if ((int) $file->getSize() !== (int) $session->expected_size || (int) $file->getSize() > $maxBytes) {
                    throw ValidationException::withMessages(['file' => ['file_size_invalid']]);
                }
                if ($this->detectFormat($session->original_filename, (string) $file->getMimeType()) !== $session->format) {
                    throw ValidationException::withMessages(['file' => ['file_type_not_allowed']]);
                }

                $disk = Storage::disk('private');
                if ($disk->exists($session->storage_path)) {
                    throw ValidationException::withMessages(['upload' => ['upload_already_received']]);
                }
                $stream = fopen($file->getRealPath(), 'rb');
                if (! is_resource($stream)) {
                    throw new \RuntimeException('upload_stream_unavailable');
                }
                try {
                    $written = $disk->writeStream($session->storage_path, $stream);
                    if ($written === false) {
                        throw new \RuntimeException('upload_storage_write_failed');
                    }
                } finally {
                    if (is_resource($stream)) {
                        fclose($stream);
                    }
                }
                DB::table('dataset_upload_sessions')->where('id', $session->id)->update(['uploaded_at' => now()]);

                return ['uploaded' => true, 'size' => (int) $file->getSize()];
            }, 3);
        } catch (ValidationException $exception) {
            $first = collect($exception->errors())->flatten()->first();
            $code = is_string($first) && preg_match('/^[a-z0-9_]+$/', $first) ? $first : 'upload_invalid';
            $status = in_array($code, ['upload_token_invalid'], true) ? 403 : (str_contains($code, 'already_received') ? 409 : 422);

            return response()->json(['error' => $code], $status, ['Cache-Control' => 'no-store']);
        }

        return response()->json(['data' => $result], 201, ['Cache-Control' => 'no-store']);
    }

    public function conversionStatus(Request $request, string $id): JsonResponse
    {
        $versionParam = $request->query('version');
        if (! is_string($versionParam) || ! ctype_digit($versionParam) || (int) $versionParam < 1) {
            return response()->json(['error' => 'version_invalid'], 400, ['Cache-Control' => 'no-store']);
        }
        $dataset = Dataset::query()->find($id);
        if (! $dataset) {
            return response()->json(['error' => 'dataset_not_found'], 404, ['Cache-Control' => 'no-store']);
        }
        if (! $this->access->canAccessOrganization($request->user(), $dataset->organization_id, ['super_admin', 'data_admin', 'admin_opd', 'editor', 'reviewer'])) {
            return response()->json(['error' => 'forbidden'], 403, ['Cache-Control' => 'no-store']);
        }
        $job = ConversionJob::query()->where('dataset_id', $id)->where('dataset_version', (int) $versionParam)->orderByDesc('created_at')->first();

        return response()->json(['job' => $job ? ['id' => $job->id, 'status' => $job->status, 'attempts' => $job->attempts, 'maxAttempts' => $job->max_attempts, 'safeErrorMessage' => $job->safe_error_message, 'createdAt' => $job->created_at, 'startedAt' => $job->started_at, 'finishedAt' => $job->finished_at, 'updatedAt' => $job->updated_at, 'leaseExpiresAt' => $job->lease_expires_at] : null, 'checkedAt' => now()->toISOString()], 200, ['Cache-Control' => 'private, no-store, max-age=0']);
    }

    private function scopeDatasets(Builder $query, User $user): void
    {
        $organizationIds = $this->access->organizationIdsWithPermission($user, 'datasets.read');
        if ($organizationIds === null) {
            return;
        } // Explicit global read permission.
        if ($organizationIds === []) {
            $query->whereRaw('1 = 0');
        } else {
            $query->whereIn('organization_id', $organizationIds);
        }
    }

    private function editableVersion(User $user, Dataset $dataset): ?int
    {
        if (! $this->access->hasPermissionInOrganization($user, $dataset->organization_id, 'datasets.write')) {
            return null;
        }
        if ($dataset->status === 'draft') {
            return (int) $dataset->current_version;
        }
        if ($dataset->status === 'published' && $dataset->draft_version) {
            $isDraft = DatasetVersion::query()->where('dataset_id', $dataset->id)->where('version', $dataset->draft_version)->where('version_status', 'draft')->exists();
            if ($isDraft) {
                return (int) $dataset->draft_version;
            }
        }

        return null;
    }

    private function datasetArray(Dataset $dataset): array
    {
        $data = $dataset->toArray();
        $data['organizations'] = $dataset->organization ? ['id' => $dataset->organization->id, 'name' => $dataset->organization->name, 'code' => $dataset->organization->code, 'slug' => $dataset->organization->slug, 'is_active' => (bool) $dataset->organization->is_active, 'official_email' => $dataset->organization->official_email, 'official_url' => $dataset->organization->official_url, 'created_at' => $dataset->organization->created_at, 'updated_at' => $dataset->organization->updated_at] : null;
        $data['dataset_resources'] = array_map(function ($resource) {
            unset($resource['storage_path']);

            return $resource;
        }, $data['resources'] ?? []);
        unset($data['resources']);

        return $data;
    }

    private function sanitizeFilename(string $filename): string
    {
        $name = preg_replace('/[\x00-\x1F\x7F\/\\"\']/', '_', trim(Str::of($filename)->replaceMatches('/\s+/', ' ')->toString()));

        return mb_substr($name ?: 'data.csv', 0, 255);
    }

    private function detectFormat(string $filename, string $mime): ?string
    {
        $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        $allowed = ['csv' => 'csv', 'xlsx' => 'xlsx', 'json' => 'json', 'geojson' => 'geojson'];
        if (! isset($allowed[$extension])) {
            return null;
        }
        if ($extension === 'csv' && $mime && ! in_array(strtolower($mime), ['text/csv', 'text/plain', 'application/vnd.ms-excel', 'application/octet-stream'], true)) {
            return null;
        }
        if ($extension === 'xlsx' && $mime && ! in_array(strtolower($mime), ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/zip', 'application/octet-stream'], true)) {
            return null;
        }
        if (in_array($extension, ['json', 'geojson'], true) && $mime && ! in_array(strtolower($mime), ['application/json', 'application/geo+json', 'text/json', 'text/plain', 'application/octet-stream'], true)) {
            return null;
        }

        return $allowed[$extension];
    }

    private function mimeFor(string $format): string
    {
        return match ($format) {
            'csv' => 'text/csv', 'xlsx' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'geojson' => 'application/geo+json', default => 'application/json'
        };
    }
}
