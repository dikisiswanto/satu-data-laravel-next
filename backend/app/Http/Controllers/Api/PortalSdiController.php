<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Dataset;
use App\Models\DatasetResource;
use App\Models\DatasetSdiMetadata;
use App\Models\ReferenceCodeEntry;
use App\Models\ReferenceCodeSystem;
use App\Models\SdiStandard;
use App\Services\AccessService;
use App\Services\AuditService;
use App\Services\PublicCatalogRevisionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PortalSdiController extends Controller
{
    public function __construct(private readonly AccessService $access, private readonly AuditService $audit, private readonly PublicCatalogRevisionService $catalogRevision) {}

    public function saveRegistry(Request $request): JsonResponse
    {
        $this->access->requireAnyRole($request->user(), ['super_admin', 'data_admin']);
        $data = $request->validate([
            'kind' => ['required', 'in:standard,reference_system,reference_entry'],
            'standard_code' => ['required_if:kind,standard', 'nullable', 'string', 'max:160'],
            'standard_type' => ['required_if:kind,standard', 'nullable', 'in:statistical,geospatial,metadata,interoperability,other'],
            'title' => ['required_if:kind,standard,reference_system', 'nullable', 'string', 'min:3', 'max:300'],
            'definition' => ['nullable', 'string', 'min:10', 'max:10000'], 'description' => ['required_if:kind,reference_system', 'nullable', 'string', 'min:10', 'max:10000'],
            'authority_name' => ['required_if:kind,standard,reference_system', 'nullable', 'string', 'min:2', 'max:240'],
            'version_label' => ['required_if:kind,standard,reference_system', 'nullable', 'string', 'min:1', 'max:100'],
            'system_code' => ['required_if:kind,reference_system', 'nullable', 'string', 'max:160'],
            'source_url' => ['nullable', 'url:http,https', 'max:2048'], 'evidence_url' => ['nullable', 'url:http,https', 'max:2048'],
            'valid_from' => ['nullable', 'date_format:Y-m-d'], 'valid_until' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:valid_from'],
            'system_id' => ['required_if:kind,reference_entry', 'nullable', 'uuid', 'exists:reference_code_systems,id'],
            'code' => ['required_if:kind,reference_entry', 'nullable', 'string', 'max:160'], 'label' => ['required_if:kind,reference_entry', 'nullable', 'string', 'max:500'],
            'parent_code' => ['nullable', 'string', 'max:160'], 'source_reference' => ['nullable', 'url:http,https', 'max:2048'],
        ]);
        if ($data['kind'] === 'standard') {
            $record = SdiStandard::query()->create([
                'standard_code' => trim($data['standard_code']), 'standard_type' => $data['standard_type'], 'title' => trim($data['title']),
                'definition' => trim((string) ($data['definition'] ?? '')), 'authority_name' => trim($data['authority_name']), 'version_label' => trim($data['version_label']),
                'source_url' => $data['source_url'] ?? null, 'evidence_url' => $data['evidence_url'] ?? null, 'valid_from' => $data['valid_from'] ?? null,
                'valid_until' => $data['valid_until'] ?? null, 'status' => 'draft', 'created_by' => $request->user()->id,
            ]);
            $result = $record->only(['id', 'status', 'standard_code', 'title']);
        } elseif ($data['kind'] === 'reference_system') {
            $record = ReferenceCodeSystem::query()->create([
                'system_code' => trim($data['system_code']), 'title' => trim($data['title']), 'description' => trim($data['description']),
                'authority_name' => trim($data['authority_name']), 'version_label' => trim($data['version_label']), 'source_url' => $data['source_url'] ?? null,
                'evidence_url' => $data['evidence_url'] ?? null, 'valid_from' => $data['valid_from'] ?? null, 'valid_until' => $data['valid_until'] ?? null,
                'status' => 'draft', 'created_by' => $request->user()->id,
            ]);
            $result = $record->only(['id', 'status', 'system_code', 'title']);
        } else {
            $record = ReferenceCodeEntry::query()->create([
                'system_id' => $data['system_id'], 'code' => trim($data['code']), 'label' => trim($data['label']), 'definition' => $data['definition'] ?? null,
                'parent_code' => $data['parent_code'] ?? null, 'source_reference' => $data['source_reference'] ?? null,
                'valid_from' => $data['valid_from'] ?? null, 'valid_until' => $data['valid_until'] ?? null, 'created_by' => $request->user()->id,
            ]);
            $result = $record->only(['id', 'system_id', 'code', 'label']);
        }
        $this->audit->record($request->user()->id, 'sdi.registry_create', 'sdi_registry', $result['id'], null, 'success', ['kind' => $data['kind']]);

        return response()->json(['data' => $result, 'message' => 'Catatan tersimpan sebagai draf. Periksa sumber resmi sebelum memverifikasinya.'], 201, ['Cache-Control' => 'no-store']);
    }

    public function reviewRegistry(Request $request): JsonResponse
    {
        $this->access->requireAnyRole($request->user(), ['super_admin', 'data_admin']);
        $data = $request->validate(['kind' => ['required', 'in:standard,reference_system'], 'id' => ['required', 'uuid'], 'action' => ['required', 'in:verify,deprecate']]);
        $model = $data['kind'] === 'standard' ? SdiStandard::class : ReferenceCodeSystem::class;
        $record = DB::transaction(function () use ($model, $data, $request) {
            $record = $model::query()->lockForUpdate()->findOrFail($data['id']);
            $record->status = $data['action'] === 'verify' ? 'verified' : 'deprecated';
            $record->reviewed_by = $request->user()->id;
            $record->reviewed_at = now();
            $record->save();
            $this->catalogRevision->bump();
            $this->audit->record($request->user()->id, 'sdi.registry_'.$data['action'], 'sdi_registry', $record->id, null, 'success', ['kind' => $data['kind']]);

            return $record->fresh();
        });

        return response()->json(['data' => $record], 200, ['Cache-Control' => 'no-store']);
    }

    public function qualitySummary(Request $request): JsonResponse
    {
        $user = $request->user();
        $global = $this->access->hasAnyRole($user, AccessService::GLOBAL_ROLES);
        $organizationIds = $this->access->accessibleOrganizationIds($user);
        $scopedDatasets = DB::table('datasets as d')->join('organizations as o', 'o.id', '=', 'd.organization_id')->where('o.is_active', true);
        if (! $global) {
            if ($organizationIds === []) {
                $scopedDatasets->whereRaw('1 = 0');
            } else {
                $scopedDatasets->whereIn('d.organization_id', $organizationIds);
            }
        }
        $published = (clone $scopedDatasets)->whereIn('d.status', ['published', 'review'])->whereNotNull('d.published_at')->where('d.published_at', '<=', now());
        $visibleDatasets = (clone $scopedDatasets)->count();
        $publishedDatasets = (clone $published)->count();
        $classificationLengthExpression = match (DB::connection()->getDriverName()) {
            'pgsql' => 'json_array_length(CAST(m.presentation_classification AS json)) > 0',
            'sqlite' => 'json_array_length(m.presentation_classification) > 0',
            default => 'JSON_LENGTH(m.presentation_classification) > 0',
        };
        $missingMetadata = (clone $published)->whereNotExists(function ($query) use ($classificationLengthExpression): void {
            $query->selectRaw('1')->from('dataset_sdi_metadata as m')->whereColumn('m.dataset_id', 'd.id')->whereColumn('m.dataset_version', 'd.current_version')
                ->whereRaw("NULLIF(TRIM(m.ddp_id), '') IS NOT NULL AND NULLIF(TRIM(m.ddp_name), '') IS NOT NULL AND m.available_year IS NOT NULL")
                ->whereRaw("NULLIF(TRIM(m.sds_code), '') IS NOT NULL AND NULLIF(TRIM(m.sds_type), '') IS NOT NULL AND NULLIF(TRIM(m.sds_version), '') IS NOT NULL")
                ->whereRaw("NULLIF(TRIM(m.standard_definition), '') IS NOT NULL AND NULLIF(TRIM(m.measurement), '') IS NOT NULL AND {$classificationLengthExpression}")
                ->whereRaw("NULLIF(TRIM(m.reference_code), '') IS NOT NULL AND NULLIF(TRIM(m.reference_code_version), '') IS NOT NULL")
                ->whereRaw("(NULLIF(TRIM(m.source_reference), '') IS NOT NULL OR NULLIF(TRIM(d.source_url), '') IS NOT NULL)")
                ->whereRaw("(NULLIF(TRIM(m.method_description), '') IS NOT NULL OR NULLIF(TRIM(d.methodology), '') IS NOT NULL)")
                ->whereRaw("NULLIF(TRIM(d.unit), '') IS NOT NULL");
        })->count();
        $missingResources = (clone $published)->whereNotExists(function ($query): void {
            $query->selectRaw('1')->from('dataset_resources as r')->whereColumn('r.dataset_id', 'd.id')->whereColumn('r.dataset_version', 'd.current_version')->where('r.is_public', true)->where('r.conversion_status', 'succeeded');
        })->count();
        $overdue = (clone $published)->where('d.update_frequency', '<>', 'one_time')->where(function ($query): void {
            $query->whereNull('d.last_data_updated_at')
                ->orWhere(fn ($q) => $q->where('d.update_frequency', 'daily')->where('d.last_data_updated_at', '<', now()->subDays(2)))
                ->orWhere(fn ($q) => $q->where('d.update_frequency', 'weekly')->where('d.last_data_updated_at', '<', now()->subDays(9)))
                ->orWhere(fn ($q) => $q->where('d.update_frequency', 'monthly')->where('d.last_data_updated_at', '<', now()->subDays(35)))
                ->orWhere(fn ($q) => $q->where('d.update_frequency', 'quarterly')->where('d.last_data_updated_at', '<', now()->subDays(100)))
                ->orWhere(fn ($q) => $q->where('d.update_frequency', 'yearly')->where('d.last_data_updated_at', '<', now()->subDays(370)))
                ->orWhere(fn ($q) => $q->whereNotIn('d.update_frequency', ['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'one_time'])->where('d.last_data_updated_at', '<', now()->subYears(100)));
        })->count();
        $indicatorQuery = DB::table('indicators as i')->join('organizations as o', 'o.id', '=', 'i.organization_id')->where('o.is_active', true)->where('i.status', 'published')->whereNotNull('i.published_at')->where('i.published_at', '<=', now());
        if (! $global) {
            if ($organizationIds === []) {
                $indicatorQuery->whereRaw('1 = 0');
            } else {
                $indicatorQuery->whereIn('i.organization_id', $organizationIds);
            }
        }
        $publishedIndicators = (clone $indicatorQuery)->count();
        $indicatorsWithoutObservations = (clone $indicatorQuery)->whereNull('i.value_numeric')->whereRaw("NULLIF(TRIM(COALESCE(i.value_text, '')), '') IS NULL")->whereNotExists(function ($query): void {
            $query->selectRaw('1')->from('indicator_observations as io')->whereColumn('io.indicator_id', 'i.id')->where('io.status', 'published')->where('io.is_current', true);
        })->count();
        $verifiedStandards = DB::table('sdi_standard_registry')->where('status', 'verified')->where(fn ($query) => $query->whereNull('valid_from')->orWhereDate('valid_from', '<=', today()))->where(fn ($query) => $query->whereNull('valid_until')->orWhereDate('valid_until', '>=', today()))->count();
        $verifiedSystems = DB::table('reference_code_systems')->where('status', 'verified')->where(fn ($query) => $query->whereNull('valid_from')->orWhereDate('valid_from', '<=', today()))->where(fn ($query) => $query->whereNull('valid_until')->orWhereDate('valid_until', '>=', today()))->count();
        $withoutStandard = (clone $published)->leftJoin('dataset_sdi_metadata as m', function ($join): void {
            $join->on('m.dataset_id', '=', 'd.id')->on('m.dataset_version', '=', 'd.current_version');
        })
            ->leftJoin('sdi_standard_registry as s', 's.id', '=', 'm.sds_registry_id')->where(function ($query): void {
                $query->whereNull('s.id')->orWhere('s.status', '<>', 'verified')->orWhere(fn ($q) => $q->whereNotNull('s.valid_from')->whereDate('s.valid_from', '>', today()))->orWhere(fn ($q) => $q->whereNotNull('s.valid_until')->whereDate('s.valid_until', '<', today()));
            })->count('d.id');
        $withoutSystem = (clone $published)->leftJoin('dataset_sdi_metadata as m', function ($join): void {
            $join->on('m.dataset_id', '=', 'd.id')->on('m.dataset_version', '=', 'd.current_version');
        })
            ->leftJoin('reference_code_systems as r', 'r.id', '=', 'm.reference_system_id')->where(function ($query): void {
                $query->whereNull('r.id')->orWhere('r.status', '<>', 'verified')->orWhere(fn ($q) => $q->whereNotNull('r.valid_from')->whereDate('r.valid_from', '>', today()))->orWhere(fn ($q) => $q->whereNotNull('r.valid_until')->whereDate('r.valid_until', '<', today()));
            })->count('d.id');

        return response()->json(['data' => [
            'visible_datasets' => $visibleDatasets,
            'published_datasets' => $publishedDatasets,
            'missing_sdi_metadata' => $missingMetadata,
            'missing_current_resource' => $missingResources,
            'overdue_datasets' => $overdue,
            'published_indicators' => $publishedIndicators,
            'indicators_without_observations' => $indicatorsWithoutObservations,
            'verified_standards' => $verifiedStandards,
            'verified_reference_systems' => $verifiedSystems,
            'datasets_without_verified_sds_registry' => $withoutStandard,
            'datasets_without_verified_reference_system' => $withoutSystem,
        ]], 200, ['Cache-Control' => 'private, no-store']);
    }

    public function preflight(Request $request): JsonResponse
    {
        $this->access->requireAnyRole($request->user(), ['super_admin', 'data_admin']);
        $input = $request->validate(['target' => ['required', 'in:sdi_flat,dcat_jsonld,geoportal']]);
        $startedAt = now();
        $datasets = Dataset::query()->with('organization:id,name,code,is_active')->whereIn('status', ['published', 'review'])->whereNotNull('published_at')->where('published_at', '<=', $startedAt)->whereHas('organization', fn ($query) => $query->where('is_active', true))->orderByDesc('updated_at')->limit(1000)->get();
        $resourcesByDataset = $this->currentPublicResourcesFor($datasets);
        $metadataByDataset = $this->currentSdiMetadataFor($datasets);
        $items = $datasets->map(function ($dataset) use ($input, $resourcesByDataset, $metadataByDataset) {
            $resources = $resourcesByDataset->get($dataset->id, collect());
            $issues = [];
            if ($input['target'] === 'geoportal') {
                if (! $resources->contains(fn ($r) => $r->format === 'geojson')) {
                    $issues[] = 'Tidak ada distribusi GeoJSON publik yang berhasil pada versi aktif';
                }
            } else {
                $metadata = $metadataByDataset->get($dataset->id);
                foreach (['ddp_id', 'ddp_name', 'source_reference', 'available_year', 'sds_code', 'sds_type', 'sds_version', 'standard_definition', 'measurement', 'reference_code', 'reference_code_version', 'method_description'] as $field) {
                    if (! $metadata || blank($metadata->{$field})) {
                        $issues[] = 'Metadata belum lengkap: '.$field;
                    }
                }
                if (! $metadata || ! $metadata->standardRegistry || $metadata->standardRegistry->status !== 'verified') {
                    $issues[] = 'Standar SDS belum tertaut ke registri terverifikasi';
                }
                if (! $metadata || ! $metadata->referenceSystem || $metadata->referenceSystem->status !== 'verified') {
                    $issues[] = 'Kode referensi belum tertaut ke sistem terverifikasi';
                }
                if ($resources->isEmpty()) {
                    $issues[] = 'Tidak ada distribusi publik yang berhasil pada versi aktif';
                }
            }

            return ['id' => $dataset->id, 'code' => $dataset->code, 'title' => $dataset->title, 'issues' => array_values(array_unique($issues))];
        });
        $eligible = $items->filter(fn ($item) => count($item['issues']) === 0)->count();
        $excluded = $items->filter(fn ($item) => count($item['issues']) > 0)->values();
        $targetEndpoint = match ($input['target']) {
            'sdi_flat' => '/api/sdi/v1/data.json', 'dcat_jsonld' => '/api/sdi/v1/catalog', default => '/api/sdi/v1/geoportal-manifest'
        };
        $summary = ['published_datasets' => $datasets->count(), 'eligible_count' => $eligible, 'excluded_count' => $excluded->count(), 'issue_count' => $excluded->sum(fn ($item) => count($item['issues'])), 'actual_harvest_performed' => false, 'target_endpoint' => $targetEndpoint, 'analysis_limit' => 1000, 'truncated' => $datasets->count() >= 1000, 'note' => 'Pemeriksaan kesiapan lokal saja; tidak mengirim data ke SPLP/harvester dan tidak mengonfirmasi penerimaan oleh GeoPortal.'];
        $runId = (string) Str::uuid();
        DB::table('sdi_harvest_runs')->insert(['id' => $runId, 'target' => $input['target'], 'run_type' => 'preflight', 'status' => $excluded->isEmpty() && $datasets->isNotEmpty() ? 'passed' : 'warnings', 'started_at' => $startedAt, 'finished_at' => now(), 'requested_by' => $request->user()->id, 'summary' => json_encode($summary), 'sample_issues' => json_encode($excluded->take(25)->all()), 'created_at' => now(), 'updated_at' => now()]);
        $this->audit->record($request->user()->id, 'sdi.preflight', 'sdi_harvest_run', $runId, null, 'success', ['target' => $input['target'], 'eligible' => $eligible, 'excluded' => $excluded->count()]);

        return response()->json(['data' => ['id' => $runId, 'target' => $input['target'], 'status' => $summary['excluded_count'] === 0 && $datasets->isNotEmpty() ? 'passed' : 'warnings', 'started_at' => $startedAt, 'finished_at' => now(), 'summary' => $summary, 'sample_issues' => $excluded->take(25)->values()]], 200, ['Cache-Control' => 'no-store']);
    }

    public function standards(Request $request): JsonResponse
    {
        $query = SdiStandard::query()->where('status', 'verified')->where(fn ($q) => $q->whereNull('valid_from')->orWhereDate('valid_from', '<=', today()))->where(fn ($q) => $q->whereNull('valid_until')->orWhereDate('valid_until', '>=', today()));
        if ($request->filled('type') && in_array($request->query('type'), ['statistical', 'geospatial', 'metadata', 'interoperability', 'other'], true)) {
            $query->where('standard_type', $request->query('type'));
        }
        if ($request->filled('q')) {
            $term = '%'.str_replace(['%', '_'], ['\\%', '\\_'], mb_substr($request->string('q')->toString(), 0, 100)).'%';
            $query->where(fn ($q) => $q->whereRaw('LOWER(title) LIKE LOWER(?)', [$term])->orWhereRaw('LOWER(standard_code) LIKE LOWER(?)', [$term])->orWhereRaw('LOWER(definition) LIKE LOWER(?)', [$term]));
        }
        $page = min(10000, max(1, (int) $request->query('page', 1)));
        $limit = min(200, max(1, (int) $request->query('limit', 100)));
        $result = $query->orderBy('standard_type')->orderBy('title')->paginate($limit, ['id', 'standard_code', 'standard_type', 'title', 'definition', 'authority_name', 'version_label', 'source_url', 'evidence_url', 'valid_from', 'valid_until', 'updated_at'], 'page', $page);

        return response()->json(['data' => $result->items(), 'meta' => ['page' => $page, 'limit' => $limit, 'total' => $result->total(), 'total_pages' => (int) ceil($result->total() / $limit)]], 200, ['Cache-Control' => 'public, max-age=60, stale-while-revalidate=300', 'X-Content-Type-Options' => 'nosniff']);
    }

    public function referenceCodes(Request $request): JsonResponse
    {
        $query = ReferenceCodeEntry::query()->join('reference_code_systems as s', 's.id', '=', 'reference_code_entries.system_id')->where('s.status', 'verified')->where(fn ($q) => $q->whereNull('reference_code_entries.valid_from')->orWhereDate('reference_code_entries.valid_from', '<=', today()))->where(fn ($q) => $q->whereNull('reference_code_entries.valid_until')->orWhereDate('reference_code_entries.valid_until', '>=', today()))->where(fn ($q) => $q->whereNull('s.valid_from')->orWhereDate('s.valid_from', '<=', today()))->where(fn ($q) => $q->whereNull('s.valid_until')->orWhereDate('s.valid_until', '>=', today()));
        if ($request->filled('system') && preg_match('/^[a-zA-Z0-9._:-]{1,160}$/', $request->query('system'))) {
            $query->where('s.system_code', $request->query('system'));
        }
        if ($request->filled('q')) {
            $term = '%'.str_replace(['%', '_'], ['\\%', '\\_'], mb_substr($request->string('q')->toString(), 0, 100)).'%';
            $query->where(fn ($q) => $q->whereRaw('LOWER(reference_code_entries.code) LIKE LOWER(?)', [$term])->orWhereRaw('LOWER(reference_code_entries.label) LIKE LOWER(?)', [$term])->orWhereRaw('LOWER(reference_code_entries.definition) LIKE LOWER(?)', [$term]));
        }
        $page = min(10000, max(1, (int) $request->query('page', 1)));
        $limit = min(200, max(1, (int) $request->query('limit', 100)));
        $base = $query->select('reference_code_entries.id', 'reference_code_entries.code', 'reference_code_entries.label', 'reference_code_entries.definition', 'reference_code_entries.parent_code', 'reference_code_entries.valid_from', 'reference_code_entries.valid_until', 'reference_code_entries.source_reference', 's.id as system_id', 's.system_code', 's.title as system_title', 's.version_label', 's.authority_name', 's.source_url');
        $result = $base->orderBy('reference_code_entries.code')->paginate($limit, ['*'], 'page', $page);

        return response()->json(['data' => $result->items(), 'meta' => ['page' => $page, 'limit' => $limit, 'total' => $result->total(), 'total_pages' => (int) ceil($result->total() / $limit), 'system' => $request->query('system')]], 200, ['Cache-Control' => 'public, max-age=60, stale-while-revalidate=300', 'X-Content-Type-Options' => 'nosniff']);
    }

    public function profile(): JsonResponse
    {
        $origin = rtrim((string) config('app.url'), '/');
        $fields = [
            ['name' => 'Nama Data', 'meaning' => 'Judul dataset yang diterbitkan.', 'required_for_local_readiness' => true],
            ['name' => 'Kode Instansi', 'meaning' => 'Kode organisasi produsen yang terdaftar pada portal.', 'required_for_local_readiness' => true],
            ['name' => 'Nama Instansi', 'meaning' => 'Nama organisasi produsen data.', 'required_for_local_readiness' => true],
            ['name' => 'ID DDP', 'meaning' => 'Identitas DDP sesuai terminologi registri/sistem sumber; konfirmasikan maknanya kepada pengelola SDI.', 'required_for_local_readiness' => true],
            ['name' => 'Nama DDP', 'meaning' => 'Nama DDP sebagaimana dicatat dalam registri/sistem sumber.', 'required_for_local_readiness' => true],
            ['name' => 'Sumber Referensi', 'meaning' => 'Sumber resmi atau publikasi rujukan data.', 'required_for_local_readiness' => true],
            ['name' => 'Tahun Tersedia', 'meaning' => 'Tahun ketika data tersedia.', 'required_for_local_readiness' => true],
            ['name' => 'Kode SDS', 'meaning' => 'Kode standar data statistik yang dirujuk.', 'required_for_local_readiness' => true],
            ['name' => 'Type SDS', 'meaning' => 'Jenis standar data sesuai registri sumber.', 'required_for_local_readiness' => true],
            ['name' => 'Versi SDS', 'meaning' => 'Versi standar data yang dipakai.', 'required_for_local_readiness' => true],
            ['name' => 'Konsep', 'meaning' => 'Konsep statistik atau standar yang mendasari data.', 'required_for_local_readiness' => false],
            ['name' => 'Definisi', 'meaning' => 'Definisi dari standar atau sumber berwenang.', 'required_for_local_readiness' => true],
            ['name' => 'Ukuran', 'meaning' => 'Ukuran statistik, misalnya jumlah, rasio, persentase, atau indeks.', 'required_for_local_readiness' => true],
            ['name' => 'Satuan', 'meaning' => 'Satuan yang digunakan dataset.', 'required_for_local_readiness' => true],
            ['name' => 'Klasifikasi Penyajian', 'meaning' => 'Klasifikasi resmi yang digunakan ketika data disajikan.', 'required_for_local_readiness' => true],
            ['name' => 'Kode Referensi', 'meaning' => 'Kode referensi/data induk yang dipakai oleh dataset.', 'required_for_local_readiness' => true],
            ['name' => 'Versi Kode Referensi', 'meaning' => 'Versi referensi/data induk yang digunakan.', 'required_for_local_readiness' => true],
            ['name' => 'Metode', 'meaning' => 'Metode pengumpulan, kompilasi, atau perhitungan data.', 'required_for_local_readiness' => true],
        ];

        return response()->json(['profile_id' => config('satu_data.sdi_export_profile_id', 'regional-sdi-harvest-flat'), 'profile_version' => '1.1.0', 'generated_by' => config('satu_data.brand_name', config('app.name')), 'description' => 'Profil ekspor JSON datar untuk kompatibilitas pengambilan data otomatis SDI; bukan sertifikat penerimaan SPLP.', 'authentication_required' => false, 'transport' => 'HTTPS GET', 'content_type' => 'application/json; charset=utf-8', 'endpoints' => ['harvest_json' => $origin.'/api/sdi/v1/data.json', 'catalog_dcat_jsonld' => $origin.'/api/sdi/v1/catalog', 'profile' => $origin.'/api/sdi/v1/profile', 'public_dataset_api' => $origin.'/api/v1/datasets', 'standards_registry' => $origin.'/api/sdi/v1/standards', 'reference_codes' => $origin.'/api/sdi/v1/reference-codes', 'geoportal_manifest' => $origin.'/api/sdi/v1/geoportal-manifest', 'public_indicator_observations_template' => $origin.'/api/v1/indicators/{slug}/observations'], 'limits' => ['requests' => 30, 'window_seconds' => 60, 'pagination' => false], 'local_readiness_rules' => ['Only published datasets, active organizations, current-version public resources and successful conversions are considered.', 'Records missing locally required metadata are excluded from the harvest JSON and DCAT catalog.', 'SDS and reference-code fields must link to verified registry records currently in their validity window.', 'A readiness pass does not prove that a target connector accepted the payload.'], 'fields' => $fields, 'linked_registry_requirements' => ['sds_registry_id' => 'Required for local readiness; link to an active verified sdi_standard_registry record.', 'reference_system_id' => 'Required for local readiness; link to an active verified reference_code_systems record.'], 'target_connector_status' => 'requires_registration_and_end_to_end_acceptance_test'], 200, ['Cache-Control' => 'public, max-age=300', 'X-Content-Type-Options' => 'nosniff']);
    }

    public function harvestData(): JsonResponse
    {
        $records = Cache::remember('public:sdi-harvest:v1', now()->addSeconds(60), fn (): array => $this->harvestRecords());

        return response()->json($records, 200, ['Cache-Control' => 'public, max-age=15, stale-while-revalidate=60', 'X-SDI-Export-Profile' => config('satu_data.sdi_export_profile_id', 'regional-sdi-harvest-flat'), 'X-SDI-Exported-Count' => (string) count($records), 'X-SDI-Export-Profile-Version' => '1.1.0']);
    }

    public function catalog(): JsonResponse
    {
        $data = Cache::remember('public:sdi-catalog:v1', now()->addSeconds(60), function (): array {
            $origin = rtrim((string) config('app.url'), '/');
            $records = $this->harvestRecords();
            $datasetList = [];
            foreach ($records as $record) {
                $datasetList[] = ['@type' => 'Dataset', '@id' => $origin.'/dataset/'.$record['slug'], 'identifier' => $record['code'], 'title' => $record['title'], 'description' => $record['description'] ?? '', 'publisher' => ['@type' => 'Organization', 'name' => $record['organization_name'] ?? config('satu_data.organization_name')], 'modified' => $record['updated_at'] ?? null, 'distribution' => array_map(fn ($resource) => ['@type' => 'DataDownload', 'name' => $resource['filename'], 'encodingFormat' => $resource['format'], 'contentUrl' => $origin.'/api/dataset/'.$record['slug'].'/resources/'.$resource['id']], $record['resources'] ?? [])];
            }

            return ['@context' => ['dcat' => 'http://www.w3.org/ns/dcat#', 'dct' => 'http://purl.org/dc/terms/', 'foaf' => 'http://xmlns.com/foaf/0.1/'], '@type' => 'Catalog', 'title' => 'Katalog Data '.config('satu_data.region_name'), 'publisher' => ['@type' => 'Organization', 'name' => config('satu_data.organization_name')], 'homepage' => $origin, 'dataset' => $datasetList];
        });
        $count = count($data['dataset'] ?? []);

        return response()->json($data, 200, ['Cache-Control' => 'public, max-age=15, stale-while-revalidate=60', 'Content-Type' => 'application/ld+json; charset=utf-8', 'X-SDI-Export-Profile' => 'dcat-jsonld-v1', 'X-SDI-Exported-Count' => (string) $count, 'X-SDI-Export-Profile-Version' => '1.1.0']);
    }

    public function geoportalManifest(): JsonResponse
    {
        $data = Cache::remember('public:geoportal-manifest:v1', now()->addSeconds(60), function (): array {
            $origin = rtrim((string) config('app.url'), '/');
            $datasets = Dataset::query()->with('organization:id,name,code,slug')->whereIn('status', ['published', 'review'])->whereNotNull('published_at')->where('published_at', '<=', now())->whereHas('organization', fn ($q) => $q->where('is_active', true))->orderByDesc('updated_at')->limit(10000)->get();
            $resourcesByDataset = $this->currentPublicResourcesFor($datasets, 'geojson');
            $features = [];
            foreach ($datasets as $dataset) {
                foreach ($resourcesByDataset->get($dataset->id, collect()) as $resource) {
                    $features[] = ['dataset_id' => $dataset->id, 'dataset_code' => $dataset->code, 'dataset_slug' => $dataset->slug, 'title' => $dataset->title, 'description' => $dataset->description, 'category' => $dataset->category, 'keywords' => $dataset->keywords ?? [], 'geographic_scope' => $dataset->geographic_scope, 'organization' => $dataset->organization?->name, 'organization_code' => $dataset->organization?->code, 'dataset_version' => $dataset->current_version, 'updated_at' => $dataset->updated_at, 'resource_id' => $resource->id, 'filename' => $resource->original_filename, 'media_type' => $resource->mime_type ?: 'application/geo+json', 'size_bytes' => $resource->size_bytes, 'checksum_sha256' => $resource->checksum_sha256, 'modified' => $resource->created_at, 'download_url' => $origin.'/api/dataset/'.rawurlencode($dataset->slug).'/resources/'.rawurlencode($resource->id), 'metadata_url' => $origin.'/api/v1/datasets/'.rawurlencode($dataset->slug)];
                }
            }

            return ['profile' => config('satu_data.geoportal_manifest_profile_id', 'regional-geoportal-manifest-v1'), 'title' => 'Distribusi GeoJSON publik '.config('satu_data.region_name'), 'generated_at' => now()->toISOString(), 'source_catalog' => $origin.'/api/v1/datasets', 'feature_count' => count($features), 'note' => 'Manifest hanya menyatakan distribusi GeoJSON publik pada versi aktif. Keberhasilan memuat layer tetap harus diuji oleh aplikasi GeoPortal.', 'data' => $features];
        });

        return response()->json($data, 200, ['Cache-Control' => 'public, max-age=15, stale-while-revalidate=60', 'X-Content-Type-Options' => 'nosniff']);
    }

    /**
     * Load only current-version public resources in one bounded query instead of
     * hydrating every historical resource for every dataset in an SDI export.
     */
    private function currentPublicResourcesFor($datasets, ?string $format = null)
    {
        $ids = $datasets->pluck('id')->all();
        if ($ids === []) {
            return collect();
        }

        return DatasetResource::query()
            ->join('datasets as d', 'd.id', '=', 'dataset_resources.dataset_id')
            ->whereIn('d.id', $ids)
            ->whereColumn('dataset_resources.dataset_version', 'd.current_version')
            ->where('dataset_resources.is_public', true)
            ->where('dataset_resources.conversion_status', 'succeeded')
            ->when($format !== null, fn ($query) => $query->where('dataset_resources.format', $format))
            ->select('dataset_resources.*')
            ->get()
            ->groupBy('dataset_id');
    }

    /** Load only the SDI metadata matching each dataset's current version. */
    private function currentSdiMetadataFor($datasets)
    {
        $ids = $datasets->pluck('id')->all();
        if ($ids === []) {
            return collect();
        }

        return DatasetSdiMetadata::query()
            ->join('datasets as d', 'd.id', '=', 'dataset_sdi_metadata.dataset_id')
            ->whereIn('d.id', $ids)
            ->whereColumn('dataset_sdi_metadata.dataset_version', 'd.current_version')
            ->select('dataset_sdi_metadata.*')
            ->with(['standardRegistry', 'referenceSystem'])
            ->get()
            ->keyBy('dataset_id');
    }

    private function harvestRecords(): array
    {
        $origin = rtrim((string) config('app.url'), '/');
        $datasets = Dataset::query()->with('organization:id,name,code,is_active')->whereIn('status', ['published', 'review'])->whereNotNull('published_at')->where('published_at', '<=', now())->whereHas('organization', fn ($q) => $q->where('is_active', true))->orderByDesc('updated_at')->limit(10000)->get();
        $resourcesByDataset = $this->currentPublicResourcesFor($datasets);
        $metadataByDataset = $this->currentSdiMetadataFor($datasets);
        $records = [];
        foreach ($datasets as $dataset) {
            $resources = $resourcesByDataset->get($dataset->id, collect());
            $metadata = $metadataByDataset->get($dataset->id);
            $standard = $metadata?->standardRegistry;
            if ($standard && $standard->status !== 'verified') {
                $standard = null;
            }
            $system = $metadata?->referenceSystem;
            if ($system && $system->status !== 'verified') {
                $system = null;
            }
            $required = [$metadata?->ddp_id, $metadata?->ddp_name, $metadata?->source_reference, $metadata?->available_year, $metadata?->sds_code, $metadata?->sds_type, $metadata?->sds_version, $metadata?->standard_definition, $metadata?->measurement, $metadata?->reference_code, $metadata?->reference_code_version, $metadata?->method_description, $standard, $system];
            if (in_array(null, $required, true) || in_array('', $required, true) || $resources->isEmpty()) {
                continue;
            }
            if ($standard->standard_code !== $metadata->sds_code || $standard->version_label !== $metadata->sds_version || $system->system_code !== $metadata->reference_code || $system->version_label !== $metadata->reference_code_version) {
                continue;
            }
            $records[] = ['id' => $dataset->id, 'code' => $dataset->code, 'slug' => $dataset->slug, 'title' => $dataset->title, 'description' => $dataset->description, 'organization_code' => $dataset->organization?->code, 'organization_name' => $dataset->organization?->name, 'source_name' => $dataset->source_name, 'current_version' => $dataset->current_version, 'ddp_id' => $metadata->ddp_id, 'ddp_name' => $metadata->ddp_name, 'source_reference' => $metadata->source_reference, 'available_year' => $metadata->available_year, 'sds_code' => $standard->standard_code, 'sds_type' => $standard->standard_type, 'sds_version' => $standard->version_label, 'concept' => $metadata->standard_concept, 'definition' => $metadata->standard_definition, 'measurement' => $metadata->measurement, 'unit' => $dataset->unit, 'presentation_classification' => $metadata->presentation_classification ?? [], 'reference_code' => $system->system_code, 'reference_code_version' => $system->version_label, 'method' => $metadata->method_description, 'geographic_scope' => $dataset->geographic_scope, 'update_frequency' => $dataset->update_frequency, 'last_data_updated_at' => $dataset->last_data_updated_at, 'updated_at' => $dataset->updated_at, 'published_at' => $dataset->published_at, 'resources' => $resources->map(fn ($resource) => ['id' => $resource->id, 'filename' => $resource->original_filename, 'format' => $resource->format, 'size_bytes' => $resource->size_bytes, 'checksum_sha256' => $resource->checksum_sha256])->values()->all()];
        }

        return $records;
    }
}
