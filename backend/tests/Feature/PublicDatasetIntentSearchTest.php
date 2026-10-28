<?php

namespace Tests\Feature;

use App\Models\Dataset;
use App\Models\DatasetResource;
use App\Models\DatasetVersion;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class PublicDatasetIntentSearchTest extends TestCase
{
    use RefreshDatabase;

    public function test_natural_language_school_query_finds_a_published_dataset_without_an_exact_title_match(): void
    {
        [$dataset] = $this->createPublicDataset([
            'code' => 'EDU-SCHOOL-COUNT',
            'slug' => 'school-count-by-district',
            'title' => 'Jumlah Sekolah Menurut Kecamatan',
            'description' => 'Ringkasan unit pendidikan berdasarkan wilayah administrasi.',
            'category' => 'Pendidikan',
            'keywords' => ['pendidikan', 'sekolah', 'siswa'],
            'source_name' => 'Dinas Pendidikan',
            'geographic_scope' => 'Kabupaten Wajo',
        ]);

        $this->getJson('/api/v1/datasets?q='.urlencode('jumlah sekolah yang ada di Kabupaten Wajo').'&sort=relevance')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.id', $dataset->id)
            ->assertJsonPath('data.0.slug', 'school-count-by-district');
    }

    public function test_search_can_find_dataset_through_organization_and_current_sdi_metadata(): void
    {
        [$dataset, $organization] = $this->createPublicDataset([
            'code' => 'EDU-SERVICE-PROFILE',
            'slug' => 'basic-service-profile',
            'title' => 'Profil Layanan Dasar',
            'description' => 'Ringkasan layanan sektoral.',
            'category' => 'Administrasi',
            'keywords' => ['layanan'],
        ], 'Dinas Pendidikan');

        DB::table('dataset_sdi_metadata')->insert([
            'dataset_id' => $dataset->id,
            'dataset_version' => 1,
            'standard_concept' => 'Ketersediaan guru dan tenaga pendidik',
            'ddp_name' => 'Data Guru Sekolah',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->getJson('/api/v1/datasets?q=pendidikan&sort=relevance')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.id', $dataset->id)
            ->assertJsonPath('data.0.organizations.name', $organization->name);

        $this->getJson('/api/v1/datasets?q=guru&sort=relevance')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.id', $dataset->id);
    }

    /** @return array{Dataset, Organization} */
    private function createPublicDataset(array $attributes, string $organizationName = 'Dinas Statistik'): array
    {
        $actor = User::query()->create([
            'email' => strtolower($attributes['slug']).'@example.test',
            'password' => 'test-password-long-enough',
            'display_name' => 'Test Publisher',
            'is_active' => true,
        ]);
        $organization = Organization::query()->create([
            'code' => 'ORG-'.strtoupper(substr(md5($organizationName.$attributes['slug']), 0, 8)),
            'slug' => strtolower(substr(preg_replace('/[^a-z0-9]+/i', '-', $organizationName), 0, 30)).'-'.substr(md5($attributes['slug']), 0, 6),
            'name' => $organizationName,
            'short_name' => $organizationName,
            'description' => 'Instansi pengampu dataset pengujian.',
            'is_active' => true,
        ]);
        $dataset = Dataset::query()->create(array_merge([
            'code' => 'TEST-'.strtoupper(substr(md5($attributes['slug']), 0, 8)),
            'slug' => $attributes['slug'],
            'title' => $attributes['title'],
            'description' => $attributes['description'] ?? null,
            'organization_id' => $organization->id,
            'category' => $attributes['category'] ?? null,
            'keywords' => $attributes['keywords'] ?? [],
            'source_name' => $attributes['source_name'] ?? $organizationName,
            'geographic_scope' => $attributes['geographic_scope'] ?? 'Daerah pengujian',
            'status' => 'published',
            'published_at' => now()->subMinute(),
            'created_by' => $actor->id,
            'updated_by' => $actor->id,
            'current_version' => 1,
        ], $attributes));

        DatasetVersion::query()->create([
            'dataset_id' => $dataset->id,
            'version' => 1,
            'metadata_snapshot' => $dataset->only(['title', 'description', 'category', 'keywords']),
            'created_by' => $actor->id,
            'created_at' => now(),
            'version_status' => 'published',
        ]);
        DatasetResource::query()->create([
            'dataset_id' => $dataset->id,
            'dataset_version' => 1,
            'storage_path' => 'test-public/'.$attributes['slug'].'.csv',
            'original_filename' => $attributes['slug'].'.csv',
            'format' => 'csv',
            'mime_type' => 'text/csv',
            'size_bytes' => 32,
            'is_source' => false,
            'is_public' => true,
            'conversion_status' => 'succeeded',
            'created_by' => $actor->id,
            'row_count' => 1,
            'column_schema' => [['name' => 'contoh', 'type' => 'string']],
            'preview_enabled' => true,
            'created_at' => now(),
        ]);

        return [$dataset, $organization];
    }
}
