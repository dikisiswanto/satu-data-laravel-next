<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\User;
use App\Services\AccessService;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AccessServicePermissionTest extends TestCase
{
    use RefreshDatabase;

    public function test_role_permission_is_scoped_to_active_membership_and_active_organization(): void
    {
        $user = User::query()->create([
            'email' => 'EDITOR@EXAMPLE.GOV.ID ',
            'password' => 'a-long-test-password',
            'display_name' => 'Editor',
            'is_active' => true,
        ]);
        $organization = Organization::query()->create([
            'code' => 'ORG-01', 'slug' => 'org-01', 'name' => 'Organisasi 01', 'is_active' => true,
        ]);
        OrganizationMembership::query()->create([
            'user_id' => $user->id,
            'organization_id' => $organization->id,
            'role' => 'editor',
            'is_active' => true,
        ]);

        $access = app(AccessService::class);
        $this->assertSame('editor@example.gov.id', $user->fresh()->email);
        $this->assertTrue($access->hasPermissionInOrganization($user, $organization->id, 'datasets.write'));
        $this->assertFalse($access->hasPermissionInOrganization($user, $organization->id, 'users.manage'));

        $organization->update(['is_active' => false]);
        $this->assertFalse($access->hasPermissionInOrganization($user, $organization->id, 'datasets.write'));
    }

    public function test_global_role_does_not_bypass_a_narrow_organization_role_filter(): void
    {
        $user = User::query()->create([
            'email' => 'auditor@example.gov.id',
            'password' => 'a-long-test-password',
            'display_name' => 'Auditor',
            'is_active' => true,
        ]);
        $organization = Organization::query()->create([
            'code' => 'ORG-02', 'slug' => 'org-02', 'name' => 'Organisasi 02', 'is_active' => true,
        ]);
        OrganizationMembership::query()->create([
            'user_id' => $user->id,
            'organization_id' => null,
            'role' => 'auditor',
            'is_active' => true,
        ]);
        OrganizationMembership::query()->create([
            'user_id' => $user->id,
            'organization_id' => $organization->id,
            'role' => 'editor',
            'is_active' => true,
        ]);

        $access = app(AccessService::class);

        // Empty means unrestricted only when a global role is part of the
        // caller's allowed role set. A narrow editor-only query stays scoped.
        $this->assertSame([$organization->id], $access->accessibleOrganizationIds($user, ['editor']));
        $this->assertSame([], $access->accessibleOrganizationIds($user, ['auditor', 'editor']));
    }

    public function test_inactive_user_has_no_accessible_organizations(): void
    {
        $user = User::query()->create([
            'email' => 'inactive@example.gov.id',
            'password' => 'a-long-test-password',
            'display_name' => 'Inactive',
            'is_active' => false,
        ]);

        $this->assertSame([], app(AccessService::class)->accessibleOrganizationIds($user));
    }

    public function test_global_permission_check_cannot_be_satisfied_by_an_organization_membership(): void
    {
        $user = User::query()->create([
            'email' => 'scoped.editor@example.gov.id',
            'password' => 'a-long-test-password',
            'display_name' => 'Scoped Editor',
            'is_active' => true,
        ]);
        $organizationA = Organization::query()->create([
            'code' => 'ORG-03', 'slug' => 'org-03', 'name' => 'Organisasi 03', 'is_active' => true,
        ]);
        $organizationB = Organization::query()->create([
            'code' => 'ORG-04', 'slug' => 'org-04', 'name' => 'Organisasi 04', 'is_active' => true,
        ]);
        OrganizationMembership::query()->create([
            'user_id' => $user->id, 'organization_id' => $organizationA->id,
            'role' => 'editor', 'is_active' => true,
        ]);

        $access = app(AccessService::class);
        $this->assertFalse($access->hasPermission($user, 'datasets.write'), 'Local permissions must not be treated as global permissions.');
        $this->assertTrue($access->hasPermissionInOrganization($user, $organizationA->id, 'datasets.write'));
        $this->assertFalse($access->hasPermissionInOrganization($user, $organizationB->id, 'datasets.write'), 'A local role must not authorize a different organization.');
    }

    public function test_global_read_only_role_does_not_gain_write_permission_from_invalid_scope(): void
    {
        $user = User::query()->create([
            'email' => 'auditor.scoped@example.gov.id',
            'password' => 'a-long-test-password',
            'display_name' => 'Auditor Scoped',
            'is_active' => true,
        ]);
        $organization = Organization::query()->create([
            'code' => 'ORG-05', 'slug' => 'org-05', 'name' => 'Organisasi 05', 'is_active' => true,
        ]);
        OrganizationMembership::query()->create([
            'user_id' => $user->id, 'organization_id' => null,
            'role' => 'auditor', 'is_active' => true,
        ]);
        OrganizationMembership::query()->create([
            'user_id' => $user->id, 'organization_id' => $organization->id,
            'role' => 'viewer', 'is_active' => true,
        ]);

        $access = app(AccessService::class);
        $this->assertTrue($access->hasPermission($user, 'audit.read'));
        $this->assertFalse($access->hasPermission($user, 'datasets.write'));
        $this->assertFalse($access->hasPermissionInOrganization($user, $organization->id, 'datasets.write'));
        $this->assertNull($access->organizationIdsWithPermission($user, 'datasets.read'), 'Global read permission explicitly grants unrestricted read scope.');
        $this->assertSame([$organization->id], $access->organizationIdsWithPermission($user, 'datasets.write'), 'A read-only global membership must not widen a separate local write scope.');
    }

    public function test_duplicate_global_memberships_are_rejected_even_with_nullable_organization_id(): void
    {
        $user = User::query()->create([
            'email' => 'unique.global@example.gov.id',
            'password' => 'a-long-test-password',
            'display_name' => 'Global Unique',
            'is_active' => true,
        ]);
        OrganizationMembership::query()->create([
            'user_id' => $user->id, 'organization_id' => null, 'role' => 'auditor', 'is_active' => true,
        ]);

        $this->expectException(QueryException::class);
        OrganizationMembership::query()->create([
            'user_id' => $user->id, 'organization_id' => null, 'role' => 'auditor', 'is_active' => true,
        ]);
    }
}
