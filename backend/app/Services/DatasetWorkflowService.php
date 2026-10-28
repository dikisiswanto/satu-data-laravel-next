<?php

namespace App\Services;

use App\Models\Dataset;
use App\Models\DatasetVersion;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class DatasetWorkflowService
{
    public function __construct(private readonly AccessService $access, private readonly AuditService $audit, private readonly PublicCatalogRevisionService $catalogRevision) {}

    public function createDraft(User $user, array $data): Dataset
    {
        $organization = Organization::query()->whereKey($data['organization_id'])->where('is_active', true)->firstOrFail();
        $this->access->requirePermissionInOrganization($user, $organization->id, 'datasets.write');

        return DB::transaction(function () use ($user, $data, $organization): Dataset {
            $slug = $this->uniqueSlug($data['title']);
            $dataset = Dataset::query()->create([
                'code' => $this->uniqueCode(),
                'slug' => $slug,
                'title' => trim($data['title']),
                'description' => isset($data['description']) ? trim($data['description']) : null,
                'organization_id' => $organization->id,
                'category' => $data['category'] ?? null,
                'keywords' => $data['keywords'] ?? [],
                'reference_period_start' => $data['reference_period_start'] ?? null,
                'reference_period_end' => $data['reference_period_end'] ?? null,
                'geographic_scope' => isset($data['geographic_scope']) ? trim($data['geographic_scope']) : null,
                'update_frequency' => $data['update_frequency'] ?? null,
                'source_name' => isset($data['source_name']) ? trim($data['source_name']) : null,
                'source_url' => $data['source_url'] ?? null,
                'methodology' => $data['methodology'] ?? null,
                'unit' => $data['unit'] ?? null,
                'license_text' => isset($data['license_text']) ? trim($data['license_text']) : null,
                'status' => 'draft',
                'created_by' => $user->id,
                'updated_by' => $user->id,
                'current_version' => 1,
            ]);
            DatasetVersion::query()->create([
                'dataset_id' => $dataset->id,
                'version' => 1,
                'metadata_snapshot' => $this->snapshot($dataset),
                'created_by' => $user->id,
                'change_summary' => 'Versi awal',
                'version_status' => 'draft',
            ]);
            $this->saveSdiMetadata($dataset, 1, $data['sdi_metadata'] ?? []);
            $this->audit->record($user->id, 'dataset.create', 'dataset', $dataset->id, $organization->id, 'success', ['status' => 'draft', 'code' => $dataset->code]);

            return $dataset->fresh(['organization', 'resources']);
        });
    }

    public function updateMetadata(User $user, Dataset $dataset, array $data): Dataset
    {
        return DB::transaction(function () use ($user, $dataset, $data): Dataset {
            // Serialize edits against workflow transitions/version creation. Re-read
            // both the dataset and version after acquiring row locks.
            $locked = Dataset::query()->lockForUpdate()->findOrFail($dataset->id);
            $this->access->requirePermissionInOrganization($user, $locked->organization_id, 'datasets.write');

            if (! in_array($locked->status, ['draft', 'published'], true)) {
                throw ValidationException::withMessages(['status' => ['dataset_not_editable']]);
            }

            $isPublishedDraft = $locked->status === 'published';
            $version = (int) ($isPublishedDraft ? $locked->draft_version : $locked->current_version);
            if ($isPublishedDraft && $version < 1) {
                throw ValidationException::withMessages(['status' => ['start_a_draft_version_first']]);
            }

            $versionRow = DatasetVersion::query()
                ->where('dataset_id', $locked->id)
                ->where('version', $version)
                ->lockForUpdate()
                ->first();
            if (! $versionRow || ($isPublishedDraft && $versionRow->version_status !== 'draft')) {
                throw ValidationException::withMessages(['status' => ['dataset_not_editable']]);
            }

            // Published datasets are edited through an immutable draft snapshot;
            // never expose unapproved metadata on the live public record. PATCH
            // fields not supplied by a caller must retain the current draft value.
            $baseFields = $locked->only([
                'title', 'description', 'category', 'keywords', 'reference_period_start',
                'reference_period_end', 'geographic_scope', 'update_frequency', 'source_name',
                'source_url', 'methodology', 'unit', 'license_text', 'contact',
            ]);
            if ($isPublishedDraft && is_array($versionRow->metadata_snapshot)) {
                $baseFields = array_merge($baseFields, $versionRow->metadata_snapshot);
            }
            $draft = clone $locked;
            $draft->fill(array_intersect_key($baseFields, array_flip([
                'title', 'description', 'category', 'keywords', 'reference_period_start',
                'reference_period_end', 'geographic_scope', 'update_frequency', 'source_name',
                'source_url', 'methodology', 'unit', 'license_text', 'contact',
            ])));
            $stringValue = fn (string $key): ?string => array_key_exists($key, $data)
                ? $this->nullableTrim($data[$key])
                : (isset($baseFields[$key]) && is_string($baseFields[$key]) ? $baseFields[$key] : null);
            $fields = [
                'title' => trim($data['title']),
                'description' => $stringValue('description'),
                'category' => array_key_exists('category', $data) ? $data['category'] : ($baseFields['category'] ?? null),
                'keywords' => array_key_exists('keywords', $data) ? ($data['keywords'] ?? []) : ($baseFields['keywords'] ?? []),
                'reference_period_start' => array_key_exists('reference_period_start', $data) ? $data['reference_period_start'] : ($baseFields['reference_period_start'] ?? null),
                'reference_period_end' => array_key_exists('reference_period_end', $data) ? $data['reference_period_end'] : ($baseFields['reference_period_end'] ?? null),
                'geographic_scope' => $stringValue('geographic_scope'),
                'update_frequency' => array_key_exists('update_frequency', $data) ? ($data['update_frequency'] ?: null) : ($baseFields['update_frequency'] ?? null),
                'source_name' => $stringValue('source_name'),
                'source_url' => $stringValue('source_url'),
                'methodology' => $stringValue('methodology'),
                'unit' => $stringValue('unit'),
                'license_text' => $stringValue('license_text'),
                'updated_by' => $user->id,
            ];
            $draft->fill($fields);
            $changedFields = array_values(array_diff(
                array_keys($draft->getDirty()),
                ['updated_by'],
            ));

            if (! $isPublishedDraft) {
                $locked->fill($fields)->save();
                $snapshot = $this->snapshot($locked);
            } else {
                $snapshot = $this->snapshot($draft);
            }

            $this->saveSdiMetadata($locked, $version, $data['sdi_metadata'] ?? []);
            $versionRow->metadata_snapshot = $snapshot;
            $versionRow->save();

            $this->audit->record($user->id, 'dataset.update', 'dataset', $locked->id, $locked->organization_id, 'success', [
                'changed_fields' => $changedFields,
                'version' => $version,
                'draft_snapshot_only' => $isPublishedDraft,
            ]);

            // Editing a draft or an unpublished replacement version does not
            // change public output; avoid flushing public caches for editorial-only work.
            return $locked->fresh(['organization', 'resources']);
        }, 3);
    }

    public function transition(User $user, Dataset $dataset, string $action, string $reason = ''): Dataset
    {
        $permission = $this->permissionForAction($action);
        $this->access->requirePermissionInOrganization($user, $dataset->organization_id, $permission);

        return DB::transaction(function () use ($user, $dataset, $action, $reason, $permission): Dataset {
            $locked = Dataset::query()->lockForUpdate()->findOrFail($dataset->id);
            // Recheck authorization inside the transaction so a concurrent
            // membership/organization deactivation cannot race a workflow action.
            $this->access->requirePermissionInOrganization($user, $locked->organization_id, $permission);
            $version = (int) ($locked->draft_version ?: $locked->current_version);
            $wasPublic = in_array($locked->status, ['published', 'review'], true) && $locked->published_at !== null;
            $versionRow = DatasetVersion::query()->where('dataset_id', $locked->id)->where('version', $version)->lockForUpdate()->first();

            switch ($action) {
                case 'submit_for_review':
                    if (! in_array($locked->status, ['draft', 'published'], true) || ($locked->status === 'published' && ! $locked->draft_version)) {
                        throw ValidationException::withMessages(['status' => ['dataset_not_editable']]);
                    }
                    // Keep draft creation lightweight, but never let an incomplete
                    // record enter the formal review/publication workflow.
                    if (! $versionRow) {
                        throw ValidationException::withMessages(['version' => ['Versi draf tidak ditemukan.']]);
                    }
                    // For an already-published dataset, metadata edits live only in
                    // the draft version snapshot until approval. Validate that exact
                    // candidate, never the currently published row's old metadata.
                    $candidateMetadata = is_array($versionRow->metadata_snapshot)
                        ? $versionRow->metadata_snapshot
                        : $locked->getAttributes();
                    $missing = [];
                    foreach ([
                        'description' => 'Deskripsi',
                        'source_name' => 'Nama sumber data',
                        'geographic_scope' => 'Cakupan wilayah',
                        'update_frequency' => 'Frekuensi pembaruan',
                        'license_text' => 'Lisensi atau ketentuan penggunaan',
                    ] as $field => $label) {
                        $value = $candidateMetadata[$field] ?? null;
                        if (! is_string($value) || trim($value) === '') {
                            $missing[] = $label;
                        }
                    }
                    if ($missing !== []) {
                        throw ValidationException::withMessages([
                            'metadata' => ['Lengkapi sebelum pemeriksaan: '.implode(', ', $missing).'.'],
                        ]);
                    }
                    $source = $locked->resources()->where('dataset_version', $version)->where('is_source', true)->latest('created_at')->first();
                    if (! $source || $source->conversion_status !== 'succeeded') {
                        throw ValidationException::withMessages(['resource' => ['source_not_processed']]);
                    }
                    if (! DB::table('dataset_validation_runs')->where('dataset_id', $locked->id)->where('dataset_version', $version)->where('status', 'passed')->exists()) {
                        throw ValidationException::withMessages(['validation' => ['validation_required_before_review']]);
                    }
                    if ($versionRow) {
                        $versionRow->update(['version_status' => 'review']);
                    }
                    $locked->status = 'review';
                    $locked->submitted_at = now();
                    break;
                case 'publish':
                    if ($locked->status !== 'review') {
                        throw ValidationException::withMessages(['status' => ['dataset_not_in_review']]);
                    }
                    $version = (int) ($locked->draft_version ?: $locked->current_version);
                    if (! DB::table('dataset_validation_runs')->where('dataset_id', $locked->id)->where('dataset_version', $version)->where('status', 'passed')->exists()) {
                        throw ValidationException::withMessages(['validation' => ['validation_required_before_publish']]);
                    }
                    if (! $locked->resources()->where('dataset_version', $version)->where('is_source', false)->where('conversion_status', 'succeeded')->exists()) {
                        throw ValidationException::withMessages(['resource' => ['processed_resource_required']]);
                    }
                    if ($versionRow && is_array($versionRow->metadata_snapshot)) {
                        $metadataFields = ['title', 'description', 'organization_id', 'category', 'keywords', 'reference_period_start', 'reference_period_end', 'geographic_scope', 'update_frequency', 'source_name', 'source_url', 'methodology', 'unit', 'license_text', 'contact'];
                        $locked->fill(array_intersect_key($versionRow->metadata_snapshot, array_flip($metadataFields)));
                    }
                    $locked->resources()->update(['is_public' => false]);
                    $locked->current_version = $version;
                    $locked->draft_version = null;
                    $locked->status = 'published';
                    $locked->published_at = now();
                    $locked->reviewed_by = $user->id;
                    $locked->reviewed_at = now();
                    if ($versionRow) {
                        $versionRow->update(['version_status' => 'published']);
                    }
                    $locked->resources()->where('dataset_version', $version)->where('is_source', false)->where('conversion_status', 'succeeded')->update(['is_public' => true]);
                    break;
                case 'archive':
                    if (! in_array($locked->status, ['published', 'draft'], true)) {
                        throw ValidationException::withMessages(['status' => ['dataset_cannot_be_archived']]);
                    }
                    $locked->status = 'archived';
                    $locked->archived_at = now();
                    $locked->published_at = null;
                    $locked->resources()->update(['is_public' => false]);
                    break;
                case 'return_for_changes':
                    if ($locked->status !== 'review' || mb_strlen(trim($reason)) < 5) {
                        throw ValidationException::withMessages(['reason' => ['review_reason_invalid']]);
                    }
                    // Returning a replacement version must not withdraw the last
                    // published version. A brand-new, never-published dataset
                    // returns to draft; a published dataset returns to published
                    // while its draft version remains editable.
                    $hasPublishedVersion = $locked->draft_version !== null && $locked->published_at !== null && (int) $locked->current_version > 0;
                    $locked->status = $hasPublishedVersion ? 'published' : 'draft';
                    if (! $hasPublishedVersion) {
                        $locked->published_at = null;
                    }
                    if ($versionRow) {
                        $versionRow->update(['version_status' => 'draft']);
                    }
                    break;
                case 'abandon_version':
                    if (! $locked->draft_version) {
                        throw ValidationException::withMessages(['version' => ['no_draft_version']]);
                    }
                    $abandoned = (int) $locked->draft_version;
                    DatasetVersion::query()->where('dataset_id', $locked->id)->where('version', $abandoned)->update(['version_status' => 'abandoned']);
                    $locked->resources()->where('dataset_version', $abandoned)->update(['is_public' => false]);
                    $locked->draft_version = null;
                    $locked->status = 'published';
                    break;
            }

            $locked->updated_by = $user->id;
            $locked->save();
            if ($action === 'publish' || ($action === 'archive' && $wasPublic)) {
                $this->bumpPublicRevision();
            }
            $this->audit->record($user->id, 'dataset.'.$action, 'dataset', $locked->id, $locked->organization_id, 'success', ['reason' => $reason, 'status' => $locked->status, 'version' => $version]);

            return $locked->fresh(['organization', 'resources']);
        });
    }

    public function startVersion(User $user, Dataset $dataset, string $summary): int
    {
        $this->access->requirePermissionInOrganization($user, $dataset->organization_id, 'datasets.version');
        if ($dataset->status !== 'published' || $dataset->draft_version) {
            throw ValidationException::withMessages(['version' => ['version_in_progress_or_dataset_not_published']]);
        }
        if (mb_strlen(trim($summary)) < 5 || mb_strlen(trim($summary)) > 500) {
            throw ValidationException::withMessages(['change_summary' => ['version_summary_invalid']]);
        }

        return DB::transaction(function () use ($user, $dataset, $summary): int {
            $locked = Dataset::query()->lockForUpdate()->findOrFail($dataset->id);
            $this->access->requirePermissionInOrganization($user, $locked->organization_id, 'datasets.version');
            if ($locked->status !== 'published' || $locked->draft_version) {
                throw ValidationException::withMessages(['version' => ['version_in_progress_or_dataset_not_published']]);
            }
            $version = ((int) $locked->versions()->max('version')) + 1;
            DatasetVersion::query()->create(['dataset_id' => $locked->id, 'version' => $version, 'metadata_snapshot' => $this->snapshot($locked), 'created_by' => $user->id, 'change_summary' => trim($summary), 'version_status' => 'draft']);
            $locked->draft_version = $version;
            if ($locked->published_at !== null) {
                // Opening a replacement version is editorial metadata, not a
                // change to the publicly published record's modification date.
                $locked->timestamps = false;
                $locked->save();
                $locked->timestamps = true;
            } else {
                $locked->save();
            }
            $this->copySdiMetadata($locked->id, (int) $locked->current_version, $version);
            $this->audit->record($user->id, 'dataset.version_start', 'dataset', $locked->id, $locked->organization_id, 'success', ['version' => $version]);

            return $version;
        });
    }

    private function permissionForAction(string $action): string
    {
        return match ($action) {
            'submit_for_review' => 'datasets.submit',
            'publish' => 'datasets.publish',
            'archive' => 'datasets.archive',
            'return_for_changes' => 'datasets.review',
            'abandon_version' => 'datasets.version',
            default => throw ValidationException::withMessages(['action' => ['Aksi workflow tidak dikenal.']]),
        };
    }

    public function saveSdiMetadata(Dataset $dataset, int $version, array $metadata): void
    {
        $fields = ['ddp_id', 'ddp_name', 'source_reference', 'available_year', 'sds_code', 'sds_type', 'sds_version', 'standard_concept', 'standard_definition', 'measurement', 'presentation_classification', 'reference_code', 'reference_code_version', 'method_description', 'sds_registry_id', 'reference_system_id'];
        $values = ['dataset_id' => $dataset->id, 'dataset_version' => $version, 'updated_at' => now(), 'created_at' => now()];
        foreach ($fields as $field) {
            if ($field === 'presentation_classification') {
                $classification = $metadata[$field] ?? [];
                if (! is_array($classification)) {
                    $classification = [];
                }
                // Query Builder does not apply Eloquent's JSON casts. Encode the
                // JSON column explicitly and keep optional draft metadata non-null.
                $values[$field] = json_encode(array_values($classification), JSON_THROW_ON_ERROR);

                continue;
            }

            $value = $metadata[$field] ?? null;
            if (is_string($value)) {
                $value = trim($value) === '' ? null : trim($value);
            }
            $values[$field] = $value;
        }
        DB::table('dataset_sdi_metadata')->updateOrInsert(['dataset_id' => $dataset->id, 'dataset_version' => $version], $values);
    }

    private function copySdiMetadata(string $datasetId, int $from, int $to): void
    {
        $metadata = DB::table('dataset_sdi_metadata')->where('dataset_id', $datasetId)->where('dataset_version', $from)->first();
        if (! $metadata) {
            return;
        }
        $row = (array) $metadata;
        unset($row['created_at'], $row['updated_at']);
        $row['dataset_version'] = $to;
        $row['created_at'] = now();
        $row['updated_at'] = now();
        DB::table('dataset_sdi_metadata')->updateOrInsert(['dataset_id' => $datasetId, 'dataset_version' => $to], $row);
    }

    private function nullableTrim(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $trimmed = trim($value);

        return $trimmed === '' ? null : $trimmed;
    }

    private function snapshot(Dataset $dataset): array
    {
        return collect(['title', 'description', 'organization_id', 'category', 'keywords', 'reference_period_start', 'reference_period_end', 'geographic_scope', 'update_frequency', 'source_name', 'source_url', 'methodology', 'unit', 'license_text', 'contact'])->mapWithKeys(fn ($key) => [$key => $dataset->{$key}])->all();
    }

    private function uniqueSlug(string $title): string
    {
        $base = Str::slug($title) ?: 'dataset';
        $slug = mb_substr($base, 0, 150);
        while (Dataset::query()->where('slug', $slug)->exists()) {
            $slug = mb_substr($base, 0, 135).'-'.Str::lower(Str::random(8));
        }

        return $slug;
    }

    private function uniqueCode(): string
    {
        do {
            $code = 'SDW-'.now()->format('Ymd').'-'.Str::upper(Str::random(6));
        } while (Dataset::query()->where('code', $code)->exists());

        return $code;
    }

    private function bumpPublicRevision(): void
    {
        $this->catalogRevision->bump();
    }
}
