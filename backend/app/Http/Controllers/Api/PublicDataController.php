<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Dataset;
use App\Models\Indicator;
use App\Services\PublicDatasetSearch;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class PublicDataController extends Controller
{
    private function publishedDatasetQuery(): Builder
    {
        return Dataset::query()
            ->whereIn('datasets.status', ['published', 'review'])
            ->whereNotNull('datasets.published_at')->where('datasets.published_at', '<=', now())
            ->whereHas('organization', fn (Builder $query) => $query->where('is_active', true))
            ->whereHas('resources', fn (Builder $query) => $query->whereColumn('dataset_resources.dataset_version', 'datasets.current_version')->where('is_source', false)->where('is_public', true)->where('conversion_status', 'succeeded'));
    }

    public function datasets(Request $request, PublicDatasetSearch $datasetSearch)
    {
        $request->validate([
            'q' => ['sometimes', 'string', 'max:100'],
            'query' => ['sometimes', 'string', 'max:100'],
            'category' => ['sometimes', 'string', 'max:120'],
            'organization_id' => ['sometimes', 'string', 'max:180'],
            'organization' => ['sometimes', 'string', 'max:180'],
            'year' => ['sometimes', 'nullable', 'integer', 'between:1900,2200'],
            'format' => ['sometimes', 'string', 'in:csv,xlsx,pdf,json,geojson'],
            'sort' => ['sometimes', 'string', 'in:updated,updated_asc,title,title_asc,relevance'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'limit' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'page' => ['sometimes', 'integer', 'min:1', 'max:50000'],
        ]);
        $query = trim((string) $request->query('q', $request->query('query', '')));
        $category = trim((string) $request->query('category', ''));
        $organization = $request->query('organization_id', $request->query('organization'));
        $year = filter_var($request->query('year'), FILTER_VALIDATE_INT);
        $format = strtolower((string) $request->query('format', ''));
        $sort = (string) $request->query('sort', 'updated');
        $perPage = min(100, max(1, (int) $request->query('per_page', $request->query('limit', 24))));
        $builder = $this->publishedDatasetQuery()->with([
            'organization:id,name,slug,code',
            'resources' => fn ($q) => $q
                ->join('datasets as d', 'd.id', '=', 'dataset_resources.dataset_id')
                ->whereColumn('dataset_resources.dataset_version', 'd.current_version')
                ->where('dataset_resources.is_source', false)
                ->where('dataset_resources.is_public', true)
                ->where('dataset_resources.conversion_status', 'succeeded')
                ->select('dataset_resources.id', 'dataset_resources.dataset_id', 'dataset_resources.dataset_version', 'dataset_resources.original_filename', 'dataset_resources.format', 'dataset_resources.size_bytes', 'dataset_resources.row_count', 'dataset_resources.column_schema', 'dataset_resources.preview_enabled', 'dataset_resources.is_source', 'dataset_resources.is_public', 'dataset_resources.conversion_status', 'dataset_resources.created_at'),
        ]);
        if ($query !== '') {
            $datasetSearch->apply($builder, mb_substr($query, 0, 100), $sort === 'relevance');
        }
        if ($category !== '') {
            $builder->where('category', $category);
        }
        if (is_string($organization) && $organization !== '') {
            if (Str::isUuid($organization)) {
                $builder->where('organization_id', $organization);
            } else {
                $builder->whereHas('organization', fn (Builder $orgQuery) => $orgQuery->where('slug', $organization));
            }
        }
        if (is_int($year) && $year >= 1900 && $year <= 2200) {
            $yearStart = sprintf('%04d-01-01', $year);
            $yearEnd = sprintf('%04d-12-31', $year);
            // Keep date columns bare in predicates so MariaDB can use indexes;
            // wrapping them in YEAR() made the previous filter non-sargable.
            $builder->where(function (Builder $where) use ($yearStart, $yearEnd): void {
                $where->where(function (Builder $overlap) use ($yearStart, $yearEnd): void {
                    $overlap->whereNotNull('reference_period_start')->whereNotNull('reference_period_end')
                        ->where('reference_period_start', '<=', $yearEnd)
                        ->where('reference_period_end', '>=', $yearStart);
                })->orWhereBetween('reference_period_start', [$yearStart, $yearEnd])
                    ->orWhereBetween('reference_period_end', [$yearStart, $yearEnd]);
            });
        }
        if (in_array($format, ['csv', 'xlsx', 'pdf', 'json', 'geojson'], true)) {
            $builder->whereHas('resources', fn ($q) => $q
                ->whereColumn('dataset_resources.dataset_version', 'datasets.current_version')
                ->where('dataset_resources.is_source', false)
                ->where('dataset_resources.is_public', true)
                ->where('dataset_resources.conversion_status', 'succeeded')
                ->where('dataset_resources.format', $format));
        }
        match ($sort) {
            'title', 'title_asc' => $builder->orderBy('title'),
            'relevance' => $query !== '' ? $builder : $builder->orderByDesc('updated_at'),
            'updated_asc' => $builder->orderBy('updated_at'),
            default => $builder->orderByDesc('updated_at'),
        };
        $result = $builder->paginate($perPage)->withQueryString();
        $data = collect($result->items())->map(fn ($dataset) => $this->serializeDataset($dataset, true))->all();

        return response()->json(['data' => $data, 'meta' => ['total' => $result->total(), 'per_page' => $result->perPage(), 'current_page' => $result->currentPage(), 'last_page' => $result->lastPage()], 'pagination' => ['total' => $result->total(), 'limit' => $result->perPage(), 'offset' => ($result->currentPage() - 1) * $result->perPage()]], 200, ['Cache-Control' => 'public, max-age=30, stale-while-revalidate=60']);
    }

    public function dataset(string $slug)
    {
        $dataset = $this->publishedDatasetQuery()->with([
            'organization:id,name,slug,code',
            'resources' => fn ($q) => $q
                ->join('datasets as d', 'd.id', '=', 'dataset_resources.dataset_id')
                ->whereColumn('dataset_resources.dataset_version', 'd.current_version')
                ->where('dataset_resources.is_source', false)
                ->where('dataset_resources.is_public', true)
                ->where('dataset_resources.conversion_status', 'succeeded')
                ->select('dataset_resources.id', 'dataset_resources.dataset_id', 'dataset_resources.dataset_version', 'dataset_resources.original_filename', 'dataset_resources.format', 'dataset_resources.mime_type', 'dataset_resources.size_bytes', 'dataset_resources.checksum_sha256', 'dataset_resources.row_count', 'dataset_resources.column_schema', 'dataset_resources.preview_enabled', 'dataset_resources.is_source', 'dataset_resources.is_public', 'dataset_resources.conversion_status', 'dataset_resources.created_at'),
        ])->where('slug', $slug)->first();
        if (! $dataset) {
            return response()->json(['error' => 'not_found'], 404);
        }
        $data = $this->serializeDataset($dataset, true);
        $metadata = DB::table('dataset_sdi_metadata')->where('dataset_id', $dataset->id)->where('dataset_version', $dataset->current_version)->first();
        $data['sdi_metadata'] = $metadata ? (array) $metadata : null;

        return response()->json(['data' => $data], 200, ['Cache-Control' => 'public, max-age=30, stale-while-revalidate=60']);
    }

    private function publicOrganizationsQuery()
    {
        return DB::table('organizations as o')->where('o.is_active', true)
            ->select('o.id', 'o.code', 'o.slug', 'o.name', 'o.short_name', 'o.description', 'o.official_email', 'o.official_url', 'o.updated_at')
            ->selectSub(function ($query): void {
                $query->from('datasets as d')->join('dataset_resources as r', 'r.dataset_id', '=', 'd.id')->whereColumn('d.organization_id', 'o.id')->whereIn('d.status', ['published', 'review'])->whereNotNull('d.published_at')->where('d.published_at', '<=', now())->whereColumn('r.dataset_version', 'd.current_version')->where('r.is_source', false)->where('r.is_public', true)->where('r.conversion_status', 'succeeded')->selectRaw('count(distinct d.id)');
            }, 'published_dataset_count')->orderBy('o.name');
    }

    public function organizations(Request $request)
    {
        $request->validate([
            'limit' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'page' => ['sometimes', 'integer', 'min:1', 'max:50000'],
        ]);
        $perPage = min(100, max(1, (int) $request->query('limit', $request->query('per_page', 50))));
        $result = $this->publicOrganizationsQuery()->paginate($perPage);

        return response()->json([
            'data' => $result->items(),
            'meta' => ['total' => $result->total(), 'per_page' => $result->perPage(), 'current_page' => $result->currentPage(), 'last_page' => $result->lastPage()],
        ], 200, ['Cache-Control' => 'public, max-age=60']);
    }

    public function organization(string $slug)
    {
        $organization = $this->publicOrganizationsQuery()->where('o.slug', $slug)->first();
        if (! $organization) {
            return response()->json(['error' => 'not_found'], 404);
        }

        return response()->json(['data' => $organization], 200, ['Cache-Control' => 'public, max-age=60']);
    }

    public function indicators(Request $request)
    {
        $request->validate([
            'q' => ['sometimes', 'string', 'max:100'],
            'limit' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'page' => ['sometimes', 'integer', 'min:1', 'max:50000'],
        ]);
        $query = trim((string) $request->query('q', ''));
        $builder = Indicator::query()->with('organization:id,name,slug')->where('status', 'published')->whereNotNull('published_at')->where('published_at', '<=', now())->whereHas('organization', fn ($q) => $q->where('is_active', true));
        if ($query !== '') {
            $term = '%'.str_replace(['%', '_'], ['\\%', '\\_'], mb_substr($query, 0, 100)).'%';
            $builder->where(fn ($q) => $q->whereRaw('LOWER(title) LIKE LOWER(?)', [$term])->orWhereRaw('LOWER(code) LIKE LOWER(?)', [$term])->orWhereRaw('LOWER(definition) LIKE LOWER(?)', [$term]));
        }
        $perPage = min(100, max(1, (int) $request->query('limit', $request->query('per_page', 50))));
        $result = $builder->orderBy('title')->paginate($perPage);

        return response()->json(['data' => collect($result->items())->map(fn ($indicator) => $this->serializeIndicator($indicator))->all(), 'meta' => ['total' => $result->total(), 'per_page' => $perPage, 'current_page' => $result->currentPage(), 'last_page' => $result->lastPage()]], 200, ['Cache-Control' => 'public, max-age=30']);
    }

    public function indicator(string $slug)
    {
        $indicator = Indicator::query()->with('organization:id,name,slug')->where('slug', $slug)->where('status', 'published')->whereNotNull('published_at')->where('published_at', '<=', now())->whereHas('organization', fn ($q) => $q->where('is_active', true))->first();
        if (! $indicator) {
            return response()->json(['error' => 'not_found'], 404);
        }

        return response()->json(['data' => $this->serializeIndicator($indicator)], 200, ['Cache-Control' => 'public, max-age=30']);
    }

    public function indicatorObservations(string $slug, Request $request)
    {
        $request->validate([
            'limit' => ['sometimes', 'integer', 'min:1', 'max:500'],
            'page' => ['sometimes', 'integer', 'min:1', 'max:50000'],
        ]);
        $indicator = Indicator::query()->where('slug', $slug)->where('status', 'published')->whereNotNull('published_at')->where('published_at', '<=', now())->whereHas('organization', fn ($q) => $q->where('is_active', true))->first();
        if (! $indicator) {
            return response()->json(['error' => 'not_found'], 404);
        }

        $perPage = min(500, max(1, (int) $request->query('limit', 50)));
        $result = DB::table('indicator_observations')
            ->where('indicator_id', $indicator->id)
            ->where('status', 'published')
            ->where('is_current', true)
            ->whereNotNull('published_at')
            ->where('published_at', '<=', now())
            ->orderByRaw('CASE WHEN period_start IS NULL THEN 1 ELSE 0 END, period_start DESC')
            ->orderByDesc('updated_at')
            ->paginate($perPage);

        return response()->json([
            'data' => $result->items(),
            'meta' => ['total' => $result->total(), 'per_page' => $result->perPage(), 'current_page' => $result->currentPage(), 'last_page' => $result->lastPage()],
        ], 200, ['Cache-Control' => 'public, max-age=30']);
    }

    public function indicatorObservationsById(string $id, Request $request)
    {
        $indicator = Indicator::query()->whereKey($id)->where('status', 'published')->whereNotNull('published_at')->where('published_at', '<=', now())->whereHas('organization', fn ($q) => $q->where('is_active', true))->first();
        if (! $indicator) {
            return response()->json(['error' => 'not_found'], 404);
        }
        $observations = DB::table('indicator_observations')->where('indicator_id', $indicator->id)->where('status', 'published')->where('is_current', true)->whereNotNull('published_at')->where('published_at', '<=', now())->orderByRaw('CASE WHEN period_start IS NULL THEN 1 ELSE 0 END, period_start DESC')->orderByDesc('updated_at')->limit(min(500, max(1, (int) $request->query('limit', 500))))->get();

        return response()->json(['data' => $observations], 200, ['Cache-Control' => 'public, max-age=30']);
    }

    public function resourceRows(string $slug, string $resourceId, Request $request)
    {
        $dataset = $this->publishedDatasetQuery()->where('slug', $slug)->first();
        if (! $dataset) {
            return response()->json(['error' => 'not_found'], 404);
        }
        $resource = $dataset->resources()->whereKey($resourceId)->where('dataset_version', $dataset->current_version)->where('is_source', false)->where('is_public', true)->where('conversion_status', 'succeeded')->where('preview_enabled', true)->first();
        if (! $resource) {
            return response()->json(['error' => 'not_found'], 404);
        }
        $limit = min(100, max(1, (int) $request->query('limit', 25)));
        $requestedPage = max(1, (int) $request->query('page', 1));
        $hasExplicitOffset = $request->query->has('offset');
        // `row_count` refers to the original dataset. Preview rows are deliberately
        // capped at 100,000 to bound storage and query costs, so pagination must use
        // the actual indexed preview table rather than overstate available rows.
        $total = (int) DB::table('dataset_resource_rows')->where('resource_id', $resourceId)->count();
        $lastPage = max(1, (int) ceil($total / $limit));
        if (! $hasExplicitOffset && $requestedPage > $lastPage) {
            return response()->json(['error' => 'page_out_of_range'], 400);
        }
        $offset = $hasExplicitOffset
            ? min(1000000, max(0, (int) $request->query('offset', 0)))
            : min(1000000, ($requestedPage - 1) * $limit);
        $page = intdiv($offset, $limit) + 1;
        $rows = DB::table('dataset_resource_rows')->where('resource_id', $resourceId)->where('row_number', '>', $offset)->orderBy('row_number')->limit($limit)->get();
        $baseUrl = '/api/v1/datasets/'.rawurlencode($slug).'/resources/'.rawurlencode($resourceId).'/rows';
        $selfUrl = $hasExplicitOffset
            ? $baseUrl.'?offset='.$offset.'&limit='.$limit
            : $baseUrl.'?page='.$page.'&limit='.$limit;
        $nextUrl = ($offset + $rows->count()) < $total
            ? ($hasExplicitOffset
                ? $baseUrl.'?offset='.($offset + $rows->count()).'&limit='.$limit
                : $baseUrl.'?page='.($page + 1).'&limit='.$limit)
            : null;

        return response()->json([
            'data' => $rows->map(fn ($row) => ['row_number' => $row->row_number, 'row' => json_decode($row->row_data, true)])->all(),
            'meta' => ['resource_id' => $resource->id, 'filename' => $resource->original_filename, 'format' => $resource->format, 'page' => $page, 'limit' => $limit, 'total' => $total, 'total_pages' => $lastPage, 'offset' => $offset, 'columns' => $resource->column_schema],
            'links' => ['self' => $selfUrl, 'next' => $nextUrl],
        ], 200, ['Cache-Control' => 'public, max-age=60']);
    }

    public function downloadResource(string $slug, string $resourceId)
    {
        $dataset = $this->publishedDatasetQuery()->where('slug', $slug)->first();
        if (! $dataset) {
            return response()->json(['error' => 'not_found'], 404);
        }
        $resource = $dataset->resources()->whereKey($resourceId)->where('dataset_version', $dataset->current_version)->where('is_source', false)->where('is_public', true)->where('conversion_status', 'succeeded')->first();
        if (! $resource || ! Storage::disk('private')->exists($resource->storage_path)) {
            return response()->json(['error' => 'not_found'], 404);
        }

        return Storage::disk('private')->download($resource->storage_path, $resource->original_filename, ['Cache-Control' => 'public, max-age=60', 'X-Content-Type-Options' => 'nosniff']);
    }

    public function facets()
    {
        $data = Cache::remember('public:facets:v1', now()->addSeconds(30), function (): array {
            $base = $this->publishedDatasetQuery();
            $categories = (clone $base)->whereNotNull('category')->where('category', '<>', '')->distinct()->orderBy('category')->pluck('category')->values()->all();
            $driver = DB::connection()->getDriverName();
            $yearExpression = match ($driver) {
                'pgsql' => 'CAST(EXTRACT(YEAR FROM reference_period_start) AS INTEGER)',
                'sqlite' => "CAST(strftime('%Y', reference_period_start) AS INTEGER)",
                default => 'YEAR(reference_period_start)',
            };
            $years = (clone $base)->whereNotNull('reference_period_start')->selectRaw('distinct '.$yearExpression.' as year')->orderBy('year')->pluck('year')->map(fn ($value) => (int) $value)->values()->all();
            $organizations = DB::table('organizations as o')->where('o.is_active', true)->whereExists(function ($query): void {
                $query->selectRaw('1')->from('datasets as d')->join('dataset_resources as r', 'r.dataset_id', '=', 'd.id')
                    ->whereColumn('d.organization_id', 'o.id')->whereIn('d.status', ['published', 'review'])
                    ->whereNotNull('d.published_at')->where('d.published_at', '<=', now())
                    ->whereColumn('r.dataset_version', 'd.current_version')->where('r.is_source', false)->where('r.is_public', true)->where('r.conversion_status', 'succeeded');
            })->orderBy('o.name')->get(['id', 'slug', 'name'])->map(fn ($row) => (array) $row)->all();

            return ['categories' => $categories, 'organizations' => $organizations, 'years' => $years];
        });

        return response()->json(['data' => $data], 200, ['Cache-Control' => 'public, max-age=15, stale-while-revalidate=30']);
    }

    public function revision()
    {
        $row = DB::table('public_catalog_revision')->where('id', 1)->first(['revision', 'updated_at']);
        if (! $row) {
            return response()->json(['error' => 'public_catalog_revision_unavailable'], 503, ['Cache-Control' => 'no-store']);
        }

        return response()->json(['data' => ['singleton' => true, 'revision' => (string) $row->revision, 'updated_at' => $row->updated_at]], 200, ['Cache-Control' => 'no-store']);
    }

    public function stats()
    {
        $data = Cache::remember('public:stats:v1', now()->addSeconds(30), function (): array {
            $datasetCount = $this->publishedDatasetQuery()->count();
            // The directory includes all active organizations, including those without a public dataset yet.
            $organizations = DB::table('organizations')->where('is_active', true)->count();
            $indicatorCount = Indicator::query()->where('status', 'published')->whereNotNull('published_at')->where('published_at', '<=', now())->whereHas('organization', fn ($query) => $query->where('is_active', true))->count();

            return ['published_dataset_count' => $datasetCount, 'public_organization_count' => $organizations, 'published_indicator_count' => $indicatorCount];
        });

        return response()->json(['data' => $data], 200, ['Cache-Control' => 'public, max-age=15, stale-while-revalidate=30']);
    }

    private function serializeDataset($dataset, bool $includeResources): array
    {
        // Explicit allowlist: internal workflow state, draft version identifiers,
        // actor UUIDs, and review fields must never leak through the public API.
        $item = $dataset->only([
            'id', 'code', 'slug', 'title', 'description', 'organization_id', 'category', 'keywords',
            'reference_period_start', 'reference_period_end', 'geographic_scope', 'update_frequency',
            'source_name', 'source_url', 'methodology', 'unit', 'license_text', 'contact',
            'last_data_updated_at', 'metadata_schema_version', 'status', 'current_version',
            'published_at', 'created_at', 'updated_at',
        ]);
        // Draft versions can be under review while the last approved version remains public.
        $item['status'] = 'published';
        $item['organizations'] = $dataset->organization ? ['id' => $dataset->organization->id, 'name' => $dataset->organization->name, 'slug' => $dataset->organization->slug, 'code' => $dataset->organization->code, 'is_active' => (bool) $dataset->organization->is_active] : null;
        $item['organization_name'] = $dataset->organization?->name;
        $item['organization_slug'] = $dataset->organization?->slug;
        $rawResources = $dataset->resources ?? collect();
        $item['dataset_resources'] = $includeResources ? $rawResources
            ->filter(fn ($resource) => (int) $resource->dataset_version === (int) $dataset->current_version && (bool) $resource->is_public && $resource->conversion_status === 'succeeded' && ! (bool) $resource->is_source)
            ->map(fn ($resource) => $resource->only(['id', 'dataset_id', 'dataset_version', 'original_filename', 'format', 'mime_type', 'size_bytes', 'checksum_sha256', 'row_count', 'column_schema', 'preview_enabled', 'is_public', 'conversion_status', 'created_at']))
            ->values()->all() : [];

        return $item;
    }

    private function serializeIndicator($indicator): array
    {
        $item = $indicator->only([
            'id', 'organization_id', 'code', 'slug', 'title', 'definition', 'unit', 'source_name',
            'period_label', 'value_numeric', 'value_text', 'reference_period_start', 'reference_period_end',
            'status', 'published_at', 'created_at', 'updated_at',
        ]);
        $item['status'] = 'published';
        $item['organizations'] = $indicator->organization ? ['name' => $indicator->organization->name, 'slug' => $indicator->organization->slug, 'is_active' => (bool) $indicator->organization->is_active] : null;

        return $item;
    }
}
