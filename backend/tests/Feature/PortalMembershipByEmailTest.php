<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class PortalMembershipByEmailTest extends TestCase
{
    use RefreshDatabase;

    public function test_super_admin_can_add_existing_user_by_email(): void
    {
        [$admin, $token] = $this->createSuperAdmin();
        $suffix = Str::lower(Str::random(8));
        $target = User::query()->create([
            'email' => 'existing.'.$suffix.'@example.gov.id',
            'password' => 'a-long-test-password',
            'display_name' => 'Pengguna Terdaftar',
            'is_active' => true,
        ]);
        $organization = Organization::query()->create([
            'code' => 'ORG-'.strtoupper($suffix),
            'slug' => 'org-'.$suffix,
            'name' => 'Organisasi '.$suffix,
            'is_active' => true,
        ]);

        $response = $this->withToken($token)->withHeaders([
            'Origin' => config('satu_data.frontend_url', 'http://localhost:3000'),
            'Accept' => 'application/json',
        ])->postJson('/api/v1/portal/memberships', [
            'user_email' => strtoupper($target->email),
            'organization_id' => $organization->id,
            'role' => 'editor',
            'is_active' => true,
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('organization_memberships', [
            'user_id' => $target->id,
            'organization_id' => $organization->id,
            'role' => 'editor',
            'is_active' => true,
        ]);
    }

    public function test_membership_api_keeps_support_for_existing_user_id_clients(): void
    {
        [, $token] = $this->createSuperAdmin();
        $suffix = Str::lower(Str::random(8));
        $target = User::query()->create([
            'email' => 'legacy.'.$suffix.'@example.gov.id',
            'password' => 'a-long-test-password',
            'display_name' => 'Pengguna API Lama',
            'is_active' => true,
        ]);
        $organization = Organization::query()->create([
            'code' => 'OLD-'.strtoupper($suffix),
            'slug' => 'old-org-'.$suffix,
            'name' => 'Organisasi Kompatibilitas '.$suffix,
            'is_active' => true,
        ]);

        $this->withToken($token)->withHeaders([
            'Origin' => config('satu_data.frontend_url', 'http://localhost:3000'),
            'Accept' => 'application/json',
        ])->postJson('/api/v1/portal/memberships', [
            'user_id' => $target->id,
            'organization_id' => $organization->id,
            'role' => 'viewer',
            'is_active' => true,
        ])->assertCreated();

        $this->assertDatabaseHas('organization_memberships', [
            'user_id' => $target->id,
            'organization_id' => $organization->id,
            'role' => 'viewer',
        ]);
    }

    private function createSuperAdmin(): array
    {
        $suffix = Str::lower(Str::random(8));
        $admin = User::query()->create([
            'email' => 'admin.'.$suffix.'@example.gov.id',
            'password' => 'a-long-test-password',
            'display_name' => 'Super Admin',
            'is_active' => true,
        ]);
        OrganizationMembership::query()->create([
            'user_id' => $admin->id,
            'organization_id' => null,
            'role' => 'super_admin',
            'is_active' => true,
        ]);
        $token = $admin->createToken('membership-email-test', ['*'], now()->addMinutes(10))->plainTextToken;

        return [$admin, $token];
    }
}
