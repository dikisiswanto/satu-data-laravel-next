<?php

namespace Tests\Feature;

use App\Models\Indicator;
use App\Models\IndicatorObservation;
use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class PortalIndicatorWorkflowTest extends TestCase
{
    use RefreshDatabase;

    public function test_editing_a_published_indicator_returns_it_to_draft_and_updates_public_revision(): void
    {
        [, $organization, $indicator, $token] = $this->createScenario('published');
        $revisionBefore = $this->catalogRevision();

        $this->updateIndicator($organization, $indicator, $token, 'Indikator Diperbarui')
            ->assertOk();

        $this->assertDatabaseHas('indicators', [
            'id' => $indicator->id,
            'title' => 'Indikator Diperbarui',
            'status' => 'draft',
            'published_at' => null,
        ]);
        $this->assertSame($revisionBefore + 1, $this->catalogRevision(), 'Penarikan indikator publik harus menaikkan revisi katalog tepat satu kali.');
    }

    public function test_editing_a_draft_indicator_does_not_update_public_revision(): void
    {
        [, $organization, $indicator, $token] = $this->createScenario('draft');
        $revisionBefore = $this->catalogRevision();

        $this->updateIndicator($organization, $indicator, $token, 'Draf Diperbarui')
            ->assertOk();

        $this->assertDatabaseHas('indicators', [
            'id' => $indicator->id,
            'title' => 'Draf Diperbarui',
            'status' => 'draft',
            'published_at' => null,
        ]);
        $this->assertSame($revisionBefore, $this->catalogRevision(), 'Perubahan pada indikator yang belum publik tidak boleh menaikkan revisi katalog publik.');
    }

    public function test_publishing_a_reviewed_indicator_updates_public_revision(): void
    {
        [, $organization, $indicator, $token] = $this->createScenario('review', 'admin_opd');
        $revisionBefore = $this->catalogRevision();

        $this->performIndicatorAction($indicator, $token, 'publish')->assertOk();

        $this->assertDatabaseHas('indicators', [
            'id' => $indicator->id,
            'status' => 'published',
        ]);
        $this->assertNotNull($indicator->fresh()->published_at);
        $this->assertSame($revisionBefore + 1, $this->catalogRevision(), 'Publikasi indikator harus menaikkan revisi katalog tepat satu kali.');
    }

    public function test_archiving_a_public_indicator_updates_public_revision(): void
    {
        [, $organization, $indicator, $token] = $this->createScenario('published', 'admin_opd');
        $revisionBefore = $this->catalogRevision();

        $this->performIndicatorAction($indicator, $token, 'archive')->assertOk();

        $this->assertDatabaseHas('indicators', [
            'id' => $indicator->id,
            'status' => 'archived',
            'published_at' => null,
        ]);
        $this->assertSame($revisionBefore + 1, $this->catalogRevision(), 'Pengarsipan indikator publik harus menaikkan revisi katalog tepat satu kali.');
    }

    public function test_archiving_a_non_public_indicator_does_not_update_public_revision(): void
    {
        [, $organization, $indicator, $token] = $this->createScenario('draft', 'admin_opd');
        $revisionBefore = $this->catalogRevision();

        $this->performIndicatorAction($indicator, $token, 'archive')->assertOk();

        $this->assertDatabaseHas('indicators', [
            'id' => $indicator->id,
            'status' => 'archived',
            'published_at' => null,
        ]);
        $this->assertSame($revisionBefore, $this->catalogRevision(), 'Mengarsipkan indikator yang belum publik tidak boleh menaikkan revisi katalog.');
    }

    public function test_archived_indicator_is_read_only_for_new_observations(): void
    {
        [$user, $organization, $indicator, $token] = $this->createScenario('archived', 'admin_opd');
        $this->withHeaders([
            'Origin' => config('satu_data.frontend_url', 'http://localhost:3000'),
            'Accept' => 'application/json',
        ])->withToken($token)
            ->postJson('/api/v1/portal/indicators/'.$indicator->id.'/observations', [
                'period_label' => '2025',
                'dimension_key' => 'overall',
                'value_numeric' => 25,
                'unit' => 'sekolah',
                'source_name' => 'Dinas Contoh',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['indicator']);

        $this->assertDatabaseMissing('indicator_observations', [
            'indicator_id' => $indicator->id,
            'period_label' => '2025',
        ]);
    }

    public function test_observation_cannot_be_published_before_its_indicator_definition_is_published(): void
    {
        [$user, $organization, $indicator, $token] = $this->createScenario('draft', 'admin_opd');
        $observation = IndicatorObservation::query()->create([
            'id' => (string) Str::uuid(),
            'indicator_id' => $indicator->id,
            'period_label' => '2025',
            'value_numeric' => 123,
            'unit' => 'sekolah',
            'source_name' => 'Dinas Contoh',
            'revision_no' => 1,
            'is_current' => false,
            'status' => 'draft',
            'quality_status' => 'unreviewed',
            'created_by' => $user->id,
        ]);

        $this->withHeaders([
            'Origin' => config('satu_data.frontend_url', 'http://localhost:3000'),
            'Accept' => 'application/json',
        ])->withToken($token)
            ->patchJson('/api/v1/portal/indicators/'.$indicator->id.'/observations/'.$observation->id, ['action' => 'publish'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['indicator']);

        $this->assertDatabaseHas('indicator_observations', [
            'id' => $observation->id,
            'status' => 'draft',
            'is_current' => false,
            'published_at' => null,
        ]);
    }

    private function performIndicatorAction(Indicator $indicator, string $token, string $action)
    {
        return $this->withHeaders([
            'Origin' => config('satu_data.frontend_url', 'http://localhost:3000'),
            'Accept' => 'application/json',
        ])->withToken($token)->postJson('/api/v1/portal/indicators/'.$indicator->id.'/workflow', [
            'action' => $action,
        ]);
    }

    private function createScenario(string $status, string $role = 'editor'): array
    {
        $suffix = Str::lower(Str::random(8));
        $user = User::query()->create([
            'email' => 'indicator.'.$suffix.'@example.gov.id',
            'password' => 'a-long-test-password',
            'display_name' => 'Editor Indikator',
            'is_active' => true,
        ]);
        $organization = Organization::query()->create([
            'code' => 'ORG-'.strtoupper($suffix),
            'slug' => 'org-'.$suffix,
            'name' => 'Organisasi Indikator '.$suffix,
            'is_active' => true,
        ]);
        OrganizationMembership::query()->create([
            'user_id' => $user->id,
            'organization_id' => $organization->id,
            'role' => $role,
            'is_active' => true,
        ]);
        $indicator = Indicator::query()->create([
            'id' => (string) Str::uuid(),
            'code' => 'IND-'.strtoupper($suffix),
            'slug' => 'indikator-'.$suffix,
            'title' => 'Indikator Awal',
            'definition' => 'Definisi indikator yang cukup panjang untuk divalidasi.',
            'unit' => 'orang',
            'organization_id' => $organization->id,
            'source_name' => 'Dinas Contoh',
            'period_label' => '2025',
            'status' => $status,
            'created_by' => $user->id,
            'updated_by' => $user->id,
            'published_at' => $status === 'published' ? now()->subDay() : null,
        ]);
        $token = $user->createToken('indicator-workflow-test', ['*'], now()->addMinutes(10))->plainTextToken;

        return [$user, $organization, $indicator, $token];
    }

    private function updateIndicator(Organization $organization, Indicator $indicator, string $token, string $title)
    {
        return $this->withHeaders([
            'Origin' => config('satu_data.frontend_url', 'http://localhost:3000'),
            'Accept' => 'application/json',
        ])->withToken($token)->postJson('/api/v1/portal/indicators', [
            'id' => $indicator->id,
            'code' => $indicator->code,
            'slug' => $indicator->slug,
            'title' => $title,
            'definition' => 'Definisi indikator yang sudah diperbarui dan tetap cukup panjang.',
            'unit' => 'orang',
            'organization_id' => $organization->id,
            'source_name' => 'Dinas Contoh',
            'period_label' => '2025',
        ]);
    }

    private function catalogRevision(): int
    {
        return (int) DB::table('public_catalog_revision')->where('id', 1)->value('revision');
    }
}
