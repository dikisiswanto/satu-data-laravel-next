<?php

namespace Tests\Feature;

use App\Models\Indicator;
use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class PortalIndicatorWorkflowTest extends TestCase
{
    use RefreshDatabase;

    public function test_editing_a_published_indicator_returns_it_to_a_valid_draft_state(): void
    {
        $user = User::query()->create([
            'email' => 'indicator.editor@example.gov.id',
            'password' => 'a-long-test-password',
            'display_name' => 'Indicator Editor',
            'is_active' => true,
        ]);
        $organization = Organization::query()->create([
            'code' => 'ORG-IND', 'slug' => 'org-ind', 'name' => 'Organisasi Indikator', 'is_active' => true,
        ]);
        OrganizationMembership::query()->create([
            'user_id' => $user->id, 'organization_id' => $organization->id,
            'role' => 'editor', 'is_active' => true,
        ]);
        $indicator = Indicator::query()->create([
            'id' => (string) Str::uuid(),
            'code' => 'IND-001',
            'slug' => 'indikator-lama',
            'title' => 'Indikator Lama',
            'definition' => 'Definisi indikator yang cukup panjang untuk divalidasi.',
            'unit' => 'orang',
            'organization_id' => $organization->id,
            'source_name' => 'Dinas Contoh',
            'period_label' => '2025',
            'status' => 'published',
            'created_by' => $user->id,
            'updated_by' => $user->id,
            'published_at' => now()->subDay(),
        ]);
        $token = $user->createToken('indicator-workflow-test', ['*'], now()->addMinutes(10))->plainTextToken;

        $this->withHeaders([
            'Origin' => config('satu_data.frontend_url', 'http://localhost:3000'),
            'Accept' => 'application/json',
        ])->withToken($token)->postJson('/api/v1/portal/indicators', [
            'id' => $indicator->id,
            'code' => 'IND-001',
            'slug' => 'indikator-lama',
            'title' => 'Indikator Diperbarui',
            'definition' => 'Definisi indikator yang sudah diperbarui dan tetap cukup panjang.',
            'unit' => 'orang',
            'organization_id' => $organization->id,
            'source_name' => 'Dinas Contoh',
            'period_label' => '2025',
        ])->assertOk();

        $this->assertDatabaseHas('indicators', [
            'id' => $indicator->id,
            'title' => 'Indikator Diperbarui',
            'status' => 'draft',
            'published_at' => null,
        ]);
    }
}
