<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $invalidRoleScope = DB::table('organization_memberships')
            ->where(function ($query): void {
                $query->whereIn('role', ['super_admin', 'data_admin', 'auditor'])->whereNotNull('organization_id');
            })
            ->orWhere(function ($query): void {
                $query->whereNotIn('role', ['super_admin', 'data_admin', 'auditor'])->whereNull('organization_id');
            })
            ->first(['id', 'user_id', 'organization_id', 'role']);
        if ($invalidRoleScope) {
            throw new RuntimeException('Cannot enforce membership scope: membership '.$invalidRoleScope->id
                .' has an invalid role/organization combination. Global roles require no organization; organization roles require one. Repair the row and rerun migrations.');
        }

        // SQL UNIQUE indexes generally treat NULL values as distinct. The old
        // (user_id, organization_id, role) key therefore did not prevent the
        // same global role being assigned more than once to a user.
        $duplicateGlobalMembership = DB::table('organization_memberships')
            ->select('user_id', 'role')
            ->whereNull('organization_id')
            ->groupBy('user_id', 'role')
            ->havingRaw('COUNT(*) > 1')
            ->first();
        if ($duplicateGlobalMembership) {
            throw new RuntimeException('Cannot enforce membership scope uniqueness: duplicate global membership for user '
                .$duplicateGlobalMembership->user_id.' and role '.$duplicateGlobalMembership->role
                .'. Remove duplicate rows and rerun migrations.');
        }

        Schema::table('organization_memberships', function (Blueprint $table): void {
            // This is a derived uniqueness key only; organization_id remains the
            // canonical FK. The model and legacy importer always rebuild it.
            $table->string('scope_key', 40)->default('__global__');
        });

        // Keep the expression portable across the supported MariaDB, SQLite and
        // PostgreSQL connection drivers used for deployment and tests.
        $driver = DB::connection()->getDriverName();
        $organizationScopeExpression = match ($driver) {
            'pgsql' => 'CAST(organization_id AS VARCHAR(36))',
            default => 'organization_id',
        };
        DB::table('organization_memberships')
            ->whereNotNull('organization_id')
            ->update(['scope_key' => DB::raw($organizationScopeExpression)]);

        Schema::table('organization_memberships', function (Blueprint $table): void {
            $table->unique(['user_id', 'scope_key', 'role'], 'membership_user_scope_role_strict_unique');
        });
    }

    public function down(): void
    {
        Schema::table('organization_memberships', function (Blueprint $table): void {
            $table->dropUnique('membership_user_scope_role_strict_unique');
            $table->dropColumn('scope_key');
        });
    }
};
