<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProgressiveDatasetDraftTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_save_a_minimal_traceable_draft_without_completing_sdi_metadata(): void
    {
        [$user, $organization, $token] = $this->createScopedAdmin('draft.creator@example.gov.id');

        $created = $this->withHeaders([
            'Origin' => config('satu_data.frontend_url', 'http://localhost:3000'),
            'Accept' => 'application/json',
        ])->withToken($token)->postJson('/api/v1/portal/datasets', [
            'title' => 'Data layanan dasar',
            'organization_id' => $organization->id,
        ])->assertCreated()
            ->assertJsonPath('data.status', 'draft')
            ->assertJsonPath('data.title', 'Data layanan dasar')
            ->json('data');

        $this->assertDatabaseHas('dataset_sdi_metadata', [
            'dataset_id' => $created['id'],
            'dataset_version' => 1,
            'presentation_classification' => '[]',
        ]);

        $this->assertDatabaseHas('datasets', [
            'title' => 'Data layanan dasar',
            'organization_id' => $organization->id,
            'status' => 'draft',
            'description' => null,
            'source_name' => null,
            'geographic_scope' => null,
            'license_text' => null,
            'update_frequency' => null,
        ]);
    }

    public function test_admin_can_save_partial_metadata_to_a_draft_and_review_requirements_remain_enforced(): void
    {
        [, $organization, $token] = $this->createScopedAdmin('draft.metadata-editor@example.gov.id');
        $headers = [
            'Origin' => config('satu_data.frontend_url', 'http://localhost:3000'),
            'Accept' => 'application/json',
        ];
        $created = $this->withHeaders($headers)->withToken($token)->postJson('/api/v1/portal/datasets', [
            'title' => 'Data layanan bertahap',
            'organization_id' => $organization->id,
        ])->assertCreated()->json('data');

        $this->withHeaders($headers)->withToken($token)->patchJson('/api/v1/portal/datasets/'.$created['id'], [
            'title' => 'Data layanan bertahap',
            'description' => null,
            'category' => null,
            'keywords' => [],
            'reference_period_start' => null,
            'reference_period_end' => null,
            'geographic_scope' => null,
            'update_frequency' => null,
            'source_name' => null,
            'source_url' => null,
            'methodology' => null,
            'unit' => null,
            'license_text' => null,
            'sdi_metadata' => [],
        ])->assertOk()
            ->assertJsonPath('data.status', 'draft')
            ->assertJsonPath('data.source_name', null)
            ->assertJsonPath('data.description', null);

        $this->assertDatabaseHas('datasets', [
            'id' => $created['id'],
            'status' => 'draft',
            'source_name' => null,
            'geographic_scope' => null,
            'license_text' => null,
            'update_frequency' => null,
        ]);

        $this->withHeaders($headers)->withToken($token)->postJson('/api/v1/portal/datasets/'.$created['id'].'/workflow', [
            'action' => 'submit_for_review',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['metadata']);
    }

    public function test_incomplete_draft_cannot_enter_review_until_publication_metadata_is_present(): void
    {
        [, $organization, $token] = $this->createScopedAdmin('draft.reviewer@example.gov.id');
        $headers = [
            'Origin' => config('satu_data.frontend_url', 'http://localhost:3000'),
            'Accept' => 'application/json',
        ];
        $created = $this->withHeaders($headers)->withToken($token)->postJson('/api/v1/portal/datasets', [
            'title' => 'Data layanan dasar',
            'organization_id' => $organization->id,
        ])->assertCreated()->json('data');

        $this->withHeaders($headers)->withToken($token)->postJson('/api/v1/portal/datasets/'.$created['id'].'/workflow', [
            'action' => 'submit_for_review',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['metadata']);

        $this->assertDatabaseHas('datasets', [
            'id' => $created['id'],
            'status' => 'draft',
        ]);
    }

    private function createScopedAdmin(string $email): array
    {
        $user = User::query()->create([
            'email' => $email,
            'password' => 'a-long-test-password',
            'display_name' => 'Dataset Admin',
            'is_active' => true,
        ]);
        $organization = Organization::query()->create([
            'code' => 'ORG-'.strtoupper(substr(md5($email), 0, 8)),
            'slug' => 'org-'.substr(md5($email), 0, 8),
            'name' => 'Organisasi Pengampu',
            'is_active' => true,
        ]);
        OrganizationMembership::query()->create([
            'user_id' => $user->id,
            'organization_id' => $organization->id,
            'role' => 'admin_opd',
            'is_active' => true,
        ]);
        $token = $user->createToken('progressive-draft-test', ['*'], now()->addMinutes(10))->plainTextToken;

        return [$user, $organization, $token];
    }
}
