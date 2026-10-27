<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class AuthorizationCatalogTest extends TestCase
{
    use RefreshDatabase;

    public function test_system_roles_and_permissions_are_seeded_by_the_schema_migration(): void
    {
        $this->assertSame(7, DB::table('roles')->count());
        $this->assertGreaterThanOrEqual(10, DB::table('permissions')->count());
        $this->assertGreaterThan(0, DB::table('role_permissions')->count());
    }

    public function test_global_administrator_has_explicit_user_management_permission(): void
    {
        $hasPermission = DB::table('role_permissions as rp')
            ->join('roles as r', 'r.id', '=', 'rp.role_id')
            ->join('permissions as p', 'p.id', '=', 'rp.permission_id')
            ->where('r.code', 'super_admin')
            ->where('p.code', 'users.manage')
            ->exists();

        $this->assertTrue($hasPermission);
    }

    public function test_viewer_is_not_granted_write_or_publish_permissions(): void
    {
        $forbidden = DB::table('role_permissions as rp')
            ->join('roles as r', 'r.id', '=', 'rp.role_id')
            ->join('permissions as p', 'p.id', '=', 'rp.permission_id')
            ->where('r.code', 'viewer')
            ->whereIn('p.code', ['datasets.write', 'datasets.publish', 'users.manage'])
            ->exists();

        $this->assertFalse($forbidden);
    }

    public function test_reviewer_can_review_indicators_but_cannot_edit_or_publish_them(): void
    {
        $reviewerPermissions = DB::table('role_permissions as rp')
            ->join('roles as r', 'r.id', '=', 'rp.role_id')
            ->join('permissions as p', 'p.id', '=', 'rp.permission_id')
            ->where('r.code', 'reviewer')
            ->pluck('p.code')
            ->all();

        $this->assertContains('indicators.review', $reviewerPermissions);
        $this->assertNotContains('indicators.manage', $reviewerPermissions);
        $this->assertNotContains('indicators.publish', $reviewerPermissions);
    }
}
