<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Indicator;
use App\Models\IndicatorObservation;
use App\Services\AccessService;
use App\Services\AuditService;
use App\Services\PublicCatalogRevisionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class PortalIndicatorController extends Controller
{
    public function __construct(private readonly AccessService $access, private readonly AuditService $audit, private readonly PublicCatalogRevisionService $catalogRevision) {}

    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'q' => ['sometimes', 'string', 'max:100'],
            'status' => ['sometimes', 'in:draft,review,published,archived'],
            'statuses' => ['sometimes', 'string', 'max:100'],
            'organization_id' => ['sometimes', 'uuid'],
            'organization_ids' => ['sometimes', 'string', 'max:20000'],
            'limit' => ['sometimes', 'integer', 'min:1', 'max:500'],
            'offset' => ['sometimes', 'integer', 'min:0', 'max:100000'],
            'sort' => ['sometimes', 'in:updated_desc,updated_asc,title_asc,title_desc'],
        ]);
        $query = Indicator::query()->with('organization:id,name,slug,code,is_active');
        $user = $request->user();
        $organizationIds = $this->access->organizationIdsWithPermission($user, 'indicators.read');
        if ($organizationIds !== null) {
            if ($organizationIds === []) {
                $query->whereRaw('1 = 0');
            } else {
                $query->whereIn('organization_id', $organizationIds);
            }
        }
        $allowedStatuses = ['draft', 'review', 'published', 'archived'];
        $statusesRaw = $request->query('statuses');
        $statuses = is_string($statusesRaw) ? array_values(array_intersect($allowedStatuses, array_filter(array_map('trim', explode(',', $statusesRaw))))) : [];
        if ($statuses !== []) {
            $query->whereIn('status', $statuses);
        } elseif ($request->filled('status') && in_array($request->query('status'), $allowedStatuses, true)) {
            $query->where('status', $request->query('status'));
        }
        if ($request->filled('organization_id')) {
            $query->where('organization_id', $request->query('organization_id'));
        }
        if ($request->filled('organization_ids')) {
            $ids = array_values(array_filter(array_slice(explode(',', (string) $request->query('organization_ids')), 0, 500), fn ($id) => is_string($id) && preg_match('/^[0-9a-fA-F-]{36}$/', $id)));
            if ($ids !== []) {
                $query->whereIn('organization_id', $ids);
            } else {
                $query->whereRaw('1 = 0');
            }
        }
        if ($request->filled('q')) {
            $term = '%'.str_replace(['%', '_'], ['\\%', '\\_'], mb_substr(trim($request->string('q')->toString()), 0, 100)).'%';
            $query->where(fn ($q) => $q->whereRaw('LOWER(title) LIKE LOWER(?)', [$term])->orWhereRaw('LOWER(code) LIKE LOWER(?)', [$term])->orWhereRaw('LOWER(source_name) LIKE LOWER(?)', [$term]));
        }
        $sort = (string) $request->query('sort', 'updated_desc');
        match ($sort) {
            'updated_asc' => $query->orderBy('updated_at'),
            'title_asc', 'title' => $query->orderBy('title'),
            'title_desc' => $query->orderByDesc('title'),
            default => $query->orderByDesc('updated_at'),
        };
        $total = (clone $query)->count('indicators.id');
        $limit = min(500, max(1, (int) $request->query('limit', 100)));
        $offset = min(100000, max(0, (int) $request->query('offset', 0)));
        $data = $query->offset($offset)->limit($limit)->get()->map(fn ($indicator) => $this->serialize($indicator))->all();

        return response()->json(['data' => $data, 'meta' => ['total' => $total, 'limit' => $limit, 'offset' => $offset]], 200, ['Cache-Control' => 'private, no-store']);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $indicator = Indicator::query()->with('organization:id,name,slug,code,is_active')->find($id);
        if (! $indicator) {
            return response()->json(['error' => 'not_found'], 404);
        }
        if (! $this->access->hasPermissionInOrganization($request->user(), $indicator->organization_id, 'indicators.read')) {
            return response()->json(['error' => 'forbidden'], 403);
        }

        return response()->json(['data' => $this->serialize($indicator)], 200, ['Cache-Control' => 'private, no-store']);
    }

    public function save(Request $request): JsonResponse
    {
        // Keep uniqueness checks aligned with the canonical values stored below.
        $request->merge([
            'code' => is_string($request->input('code')) ? trim($request->input('code')) : $request->input('code'),
            'slug' => is_string($request->input('slug')) ? strtolower(trim($request->input('slug'))) : $request->input('slug'),
        ]);
        $candidateId = $request->input('id');
        $ignoreId = is_string($candidateId) && Str::isUuid($candidateId) ? $candidateId : null;
        $data = $request->validate([
            'id' => ['sometimes', 'nullable', 'uuid'],
            'code' => ['required', 'string', 'min:3', 'max:50', Rule::unique('indicators', 'code')->ignore($ignoreId)],
            'slug' => ['required', 'string', 'max:120', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/', Rule::unique('indicators', 'slug')->ignore($ignoreId)],
            'title' => ['required', 'string', 'min:3', 'max:180'], 'definition' => ['required', 'string', 'min:10', 'max:5000'],
            'unit' => ['required', 'string', 'min:1', 'max:100'], 'organization_id' => ['required', 'uuid', 'exists:organizations,id'],
            'source_name' => ['required', 'string', 'min:2', 'max:240'], 'period_label' => ['nullable', 'string', 'max:120'],
            'value_numeric' => ['nullable', 'numeric'], 'value_text' => ['nullable', 'string', 'max:500'],
            'reference_period_start' => ['nullable', 'date_format:Y-m-d'], 'reference_period_end' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:reference_period_start'],
        ]);
        if (($data['value_numeric'] ?? null) !== null && trim((string) ($data['value_text'] ?? '')) !== '') {
            throw ValidationException::withMessages(['value_text' => ['Isi nilai numerik atau teks, bukan keduanya.']]);
        }
        $this->access->requirePermissionInOrganization($request->user(), $data['organization_id'], 'indicators.manage');
        $id = $data['id'] ?? null;
        $wasPublic = false;
        $indicator = DB::transaction(function () use ($request, $data, $id, &$wasPublic): Indicator {
            $indicator = $id ? Indicator::query()->lockForUpdate()->findOrFail($id) : new Indicator;
            if ($id && ! $this->access->hasPermissionInOrganization($request->user(), $indicator->organization_id, 'indicators.manage')) {
                abort(403);
            }
            if ($id && ! in_array($indicator->status, ['draft', 'published'], true)) {
                throw ValidationException::withMessages(['status' => ['Indikator yang sedang ditinjau atau telah diarsipkan tidak dapat diedit langsung. Kembalikan ke draf melalui alur kerja terlebih dahulu.']]);
            }
            $wasPublic = $indicator->status === 'published' && $indicator->published_at !== null;
            $indicator->fill([
                'code' => trim($data['code']), 'slug' => $data['slug'], 'title' => trim($data['title']), 'definition' => trim($data['definition']),
                'unit' => trim($data['unit']), 'organization_id' => $data['organization_id'], 'source_name' => trim($data['source_name']),
                'period_label' => $data['period_label'] ?? null, 'value_numeric' => $data['value_numeric'] ?? null,
                'value_text' => ($data['value_text'] ?? '') !== '' ? trim($data['value_text']) : null,
                'reference_period_start' => $data['reference_period_start'] ?? null, 'reference_period_end' => $data['reference_period_end'] ?? null,
                'updated_by' => $request->user()->id,
            ]);
            if (! $id) {
                $indicator->id = (string) Str::uuid();
                $indicator->created_by = $request->user()->id;
                $indicator->status = 'draft';
            }
            if ($id && $indicator->status === 'published') {
                // Indicator metadata has no separate draft-version table. Return an edited
                // publication to draft explicitly so it can be reviewed and published again;
                // never leave it in the impossible state published + published_at=null.
                $indicator->status = 'draft';
                $indicator->published_at = null;
            }
            $changedFields = $id
                ? array_values(array_diff(
                    array_keys($indicator->getDirty()),
                    ['updated_by', 'updated_at'],
                ))
                : [];
            $indicator->save();
            if ($wasPublic) {
                $this->catalogRevision->bump();
            }
            $this->audit->record($request->user()->id, $id ? 'indicator.update' : 'indicator.create', 'indicator', $indicator->id, $indicator->organization_id, 'success', ['changed_fields' => $changedFields]);

            return $indicator->fresh('organization');
        }, 3);

        return response()->json(['data' => $this->serialize($indicator)], $id ? 200 : 201, ['Cache-Control' => 'no-store']);
    }

    public function action(Request $request, string $id): JsonResponse
    {
        $data = $request->validate(['action' => ['required', 'in:submit_for_review,publish,return_for_changes,archive'], 'reason' => ['nullable', 'string', 'max:1000']]);
        $action = $data['action'];
        $permission = match ($action) {
            'submit_for_review' => 'indicators.submit',
            'publish' => 'indicators.publish',
            'return_for_changes' => 'indicators.review',
            'archive' => 'indicators.archive',
        };
        $wasPublic = false;
        $indicator = DB::transaction(function () use ($request, $id, $data, $action, $permission, &$wasPublic): Indicator {
            $indicator = Indicator::query()->lockForUpdate()->findOrFail($id);
            $this->access->requirePermissionInOrganization($request->user(), $indicator->organization_id, $permission);
            $wasPublic = $indicator->status === 'published' && $indicator->published_at !== null;
            if ($action === 'submit_for_review') {
                if ($indicator->status !== 'draft') {
                    throw ValidationException::withMessages(['status' => ['Hanya indikator draf yang dapat diajukan untuk ditinjau.']]);
                }
                $indicator->status = 'review';
                $indicator->published_at = null;
            } elseif ($action === 'publish') {
                if ($indicator->status !== 'review') {
                    throw ValidationException::withMessages(['status' => ['Indikator harus berstatus ditinjau sebelum diterbitkan.']]);
                }
                $indicator->status = 'published';
                $indicator->published_at = now();
            } elseif ($action === 'return_for_changes') {
                if ($indicator->status !== 'review') {
                    throw ValidationException::withMessages(['status' => ['Hanya indikator yang sedang ditinjau yang dapat dikembalikan.']]);
                }
                $indicator->status = 'draft';
                $indicator->published_at = null;
            } else {
                if ($indicator->status === 'archived') {
                    throw ValidationException::withMessages(['status' => ['Indikator sudah diarsipkan.']]);
                }
                $indicator->status = 'archived';
                $indicator->published_at = null;
            }
            $indicator->updated_by = $request->user()->id;
            $indicator->save();
            if ($action === 'publish' || ($action === 'archive' && $wasPublic)) {
                $this->catalogRevision->bump();
            }
            $this->audit->record($request->user()->id, 'indicator.'.$action, 'indicator', $indicator->id, $indicator->organization_id, 'success', ['reason' => $data['reason'] ?? null]);

            return $indicator->fresh('organization');
        }, 3);

        return response()->json(['data' => $this->serialize($indicator)], 200, ['Cache-Control' => 'no-store']);
    }

    public function observations(Request $request, string $id): JsonResponse
    {
        $indicator = Indicator::query()->findOrFail($id);
        $this->access->requirePermissionInOrganization($request->user(), $indicator->organization_id, 'indicators.read');
        $rows = IndicatorObservation::query()->where('indicator_id', $id)->orderByDesc('created_at')->limit(500)->get();

        return response()->json(['data' => $rows], 200, ['Cache-Control' => 'private, no-store']);
    }

    public function saveObservation(Request $request, string $id): JsonResponse
    {
        $indicator = Indicator::query()->findOrFail($id);
        $this->access->requirePermissionInOrganization($request->user(), $indicator->organization_id, 'indicators.manage');
        if ($indicator->status === 'archived') {
            throw ValidationException::withMessages(['indicator' => ['Indikator sudah diarsipkan dan hanya dapat dilihat. Aktifkan atau buat indikator baru sebelum menambahkan nilai.']]);
        }
        $data = $request->validate([
            'id' => ['sometimes', 'nullable', 'uuid'], 'period_start' => ['nullable', 'date_format:Y-m-d'],
            'period_end' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:period_start'], 'period_label' => ['required', 'string', 'min:1', 'max:160'],
            'geographic_code' => ['nullable', 'string', 'max:160'], 'geographic_name' => ['nullable', 'string', 'max:240'],
            'dimension_key' => ['nullable', 'string', 'max:240'], 'value_numeric' => ['nullable', 'numeric'], 'value_text' => ['nullable', 'string', 'max:500'],
            'unit' => ['required', 'string', 'min:1', 'max:100'], 'source_name' => ['required', 'string', 'min:2', 'max:240'], 'source_url' => ['nullable', 'url:http,https', 'max:2048'],
        ]);
        $numeric = $data['value_numeric'] ?? null;
        $text = trim((string) ($data['value_text'] ?? ''));
        if (($numeric === null) === ($text === '')) {
            throw ValidationException::withMessages(['value_text' => ['Isi tepat satu nilai: angka atau teks.']]);
        }
        $observation = DB::transaction(function () use ($data, $indicator, $request, $numeric, $text) {
            $lockedIndicator = Indicator::query()->lockForUpdate()->findOrFail($indicator->id);
            $this->access->requirePermissionInOrganization($request->user(), $lockedIndicator->organization_id, 'indicators.manage');
            if ($lockedIndicator->status === 'archived') {
                throw ValidationException::withMessages(['indicator' => ['Indikator sudah diarsipkan dan hanya dapat dilihat. Aktifkan atau buat indikator baru sebelum menambahkan nilai.']]);
            }
            $dimensionKey = trim((string) ($data['dimension_key'] ?? 'overall')) ?: 'overall';
            if (! empty($data['id'])) {
                $previous = IndicatorObservation::query()->where('id', $data['id'])->where('indicator_id', $lockedIndicator->id)->lockForUpdate()->firstOrFail();
                if ($previous->period_label !== trim($data['period_label']) || ($previous->dimension_key ?: 'overall') !== $dimensionKey) {
                    throw ValidationException::withMessages(['id' => ['Revisi harus menggunakan periode dan dimensi yang sama. Buat observasi baru untuk periode/dimensi berbeda.']]);
                }
            }
            $revision = ((int) IndicatorObservation::query()->where('indicator_id', $lockedIndicator->id)
                ->where('period_label', trim($data['period_label']))->where('dimension_key', $dimensionKey)->max('revision_no')) + 1;
            $observation = new IndicatorObservation;
            $observation->id = (string) Str::uuid();
            $observation->fill([
                'indicator_id' => $lockedIndicator->id, 'period_start' => $data['period_start'] ?? null, 'period_end' => $data['period_end'] ?? null,
                'period_label' => trim($data['period_label']), 'geographic_code' => $data['geographic_code'] ?? null, 'geographic_name' => $data['geographic_name'] ?? null,
                'dimension_key' => $dimensionKey, 'dimensions' => [], 'value_numeric' => $numeric, 'value_text' => $text !== '' ? $text : null,
                'unit' => $data['unit'], 'source_name' => trim($data['source_name']), 'source_url' => $data['source_url'] ?? null,
                'revision_no' => $revision, 'is_current' => false, 'status' => 'draft', 'quality_status' => 'unreviewed', 'created_by' => $request->user()->id,
            ]);
            $observation->save();
            $this->audit->record($request->user()->id, 'indicator.observation_create', 'indicator_observation', $observation->id, $lockedIndicator->organization_id, 'success', ['indicator_id' => $lockedIndicator->id]);

            return $observation;
        }, 3);

        return response()->json(['data' => $observation, 'message' => 'Observasi disimpan sebagai draf. Data belum tampil di halaman publik sampai diterbitkan.'], 201, ['Cache-Control' => 'no-store']);
    }

    public function publishObservation(Request $request, string $id, ?string $observationId = null): JsonResponse
    {
        $request->validate(['action' => ['required', 'in:publish']]);
        $observationId = $observationId ?: $request->query('observation');
        if (! is_string($observationId) || ! Str::isUuid($observationId)) {
            throw ValidationException::withMessages(['observation' => ['ID observasi tidak valid.']]);
        }
        $published = DB::transaction(function () use ($request, $id, $observationId): IndicatorObservation {
            $indicator = Indicator::query()->lockForUpdate()->findOrFail($id);
            $this->access->requirePermissionInOrganization($request->user(), $indicator->organization_id, 'indicators.publish');
            if ($indicator->status !== 'published' || $indicator->published_at === null) {
                throw ValidationException::withMessages(['indicator' => ['Terbitkan definisi indikator terlebih dahulu sebelum menerbitkan nilai statistik.']]);
            }
            $observation = IndicatorObservation::query()->where('id', $observationId)->where('indicator_id', $id)->lockForUpdate()->firstOrFail();
            if ($observation->status !== 'draft') {
                throw ValidationException::withMessages(['observation' => ['Hanya observasi draf yang dapat diterbitkan. Buat revisi baru untuk mengembalikan data historis.']]);
            }
            IndicatorObservation::query()->where('indicator_id', $indicator->id)
                ->where('period_label', $observation->period_label)->where('dimension_key', $observation->dimension_key)
                ->where('id', '<>', $observation->id)->update(['is_current' => false]);
            $observation->status = 'published';
            $observation->quality_status = 'verified';
            $observation->is_current = true;
            $observation->published_by = $request->user()->id;
            $observation->published_at = now();
            $observation->save();
            $this->catalogRevision->bump();
            $this->audit->record($request->user()->id, 'indicator.observation_publish', 'indicator_observation', $observation->id, $indicator->organization_id, 'success');

            return $observation;
        }, 3);

        return response()->json(['data' => ['id' => $published->id, 'indicator_id' => $id, 'status' => 'published']], 200, ['Cache-Control' => 'no-store']);
    }

    private function serialize(Indicator $indicator): array
    {
        $item = $indicator->toArray();
        $item['organizations'] = $indicator->organization ? ['id' => $indicator->organization->id, 'name' => $indicator->organization->name, 'slug' => $indicator->organization->slug, 'code' => $indicator->organization->code, 'is_active' => (bool) $indicator->organization->is_active] : null;

        return $item;
    }
}
