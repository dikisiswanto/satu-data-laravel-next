<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('roles', function (Blueprint $table): void {
            $table->id();
            $table->string('code', 32)->unique();
            $table->string('name', 100);
            $table->text('description')->nullable();
            $table->boolean('is_system')->default(true);
            $table->timestampsTz();
        });

        Schema::create('permissions', function (Blueprint $table): void {
            $table->id();
            $table->string('code', 100)->unique();
            $table->string('name', 160);
            $table->text('description')->nullable();
            $table->timestampsTz();
        });

        Schema::create('role_permissions', function (Blueprint $table): void {
            $table->foreignId('role_id')->constrained('roles')->cascadeOnDelete();
            $table->foreignId('permission_id')->constrained('permissions')->cascadeOnDelete();
            $table->primary(['role_id', 'permission_id']);
        });

        DB::table('roles')->insert(array_map(fn ($code, $name) => ['code' => $code, 'name' => $name, 'description' => null, 'is_system' => true, 'created_at' => now(), 'updated_at' => now()],
            ['super_admin', 'data_admin', 'admin_opd', 'reviewer', 'editor', 'viewer', 'auditor'],
            ['Super Administrator', 'Administrator Data', 'Administrator OPD', 'Peninjau Data', 'Editor Data', 'Pembaca Data', 'Auditor']));
        DB::table('permissions')->insert(array_map(fn ($code, $name) => ['code' => $code, 'name' => $name, 'description' => null, 'created_at' => now(), 'updated_at' => now()],
            ['portal.access', 'users.manage', 'organizations.manage', 'datasets.read', 'datasets.write', 'datasets.review', 'datasets.publish', 'indicators.manage', 'sdi.manage', 'audit.read'],
            ['Akses portal', 'Kelola pengguna', 'Kelola organisasi', 'Lihat dataset', 'Ubah dataset', 'Tinjau dataset', 'Publikasikan dataset', 'Kelola indikator', 'Kelola metadata SDI', 'Lihat audit']));
        $rolePermissions = [
            'super_admin' => ['portal.access', 'users.manage', 'organizations.manage', 'datasets.read', 'datasets.write', 'datasets.review', 'datasets.publish', 'indicators.manage', 'sdi.manage', 'audit.read'],
            'data_admin' => ['portal.access', 'users.manage', 'organizations.manage', 'datasets.read', 'datasets.write', 'datasets.review', 'datasets.publish', 'indicators.manage', 'sdi.manage', 'audit.read'],
            'admin_opd' => ['portal.access', 'datasets.read', 'datasets.write', 'datasets.review', 'datasets.publish', 'indicators.manage', 'sdi.manage'],
            'reviewer' => ['portal.access', 'datasets.read', 'datasets.review', 'indicators.manage', 'sdi.manage', 'audit.read'],
            'editor' => ['portal.access', 'datasets.read', 'datasets.write', 'indicators.manage', 'sdi.manage'],
            'viewer' => ['portal.access', 'datasets.read'],
            'auditor' => ['portal.access', 'datasets.read', 'audit.read'],
        ];
        foreach ($rolePermissions as $roleCode => $permissionCodes) {
            $roleId = DB::table('roles')->where('code', $roleCode)->value('id');
            $permissionIds = DB::table('permissions')->whereIn('code', $permissionCodes)->pluck('id');
            foreach ($permissionIds as $permissionId) {
                DB::table('role_permissions')->insert(['role_id' => $roleId, 'permission_id' => $permissionId]);
            }
        }

        Schema::create('users', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('email', 254)->unique();
            $table->string('password');
            $table->timestampTz('email_verified_at')->nullable();
            $table->boolean('is_active')->default(true)->index();
            $table->string('display_name', 120)->nullable();
            $table->timestampTz('onboarding_completed_at')->nullable();
            $table->rememberToken();
            $table->timestampsTz();
        });

        Schema::create('profiles', function (Blueprint $table): void {
            $table->foreignUuid('user_id')->primary()->constrained('users')->restrictOnDelete();
            $table->string('display_name', 120);
            $table->boolean('is_active')->default(true);
            $table->timestampTz('onboarding_completed_at')->nullable();
            $table->timestampsTz();
        });

        Schema::create('organizations', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('code', 50)->unique();
            $table->string('slug', 160)->unique();
            $table->string('name', 240);
            $table->string('short_name', 120)->nullable();
            $table->text('description')->nullable();
            $table->string('official_email', 254)->nullable();
            $table->string('official_url', 2048)->nullable();
            $table->boolean('is_active')->default(true)->index();
            $table->timestampsTz();
        });

        Schema::create('organization_memberships', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained('users')->restrictOnDelete();
            $table->foreignUuid('organization_id')->nullable()->constrained('organizations')->restrictOnDelete();
            $table->string('role', 32)->index();
            $table->foreign('role', 'membership_role_code_fk')->references('code')->on('roles')->restrictOnDelete();
            $table->boolean('is_active')->default(true);
            $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestampsTz();
            $table->unique(['user_id', 'organization_id', 'role'], 'membership_user_scope_role_unique');
            $table->index(['user_id', 'is_active']);
            $table->index(['organization_id', 'role', 'is_active']);
        });

        Schema::create('personal_access_tokens', function (Blueprint $table): void {
            $table->id();
            $table->uuidMorphs('tokenable');
            $table->string('name');
            $table->string('token', 64)->unique();
            $table->text('abilities')->nullable();
            $table->timestampTz('last_used_at')->nullable();
            $table->timestampTz('expires_at')->nullable()->index();
            $table->timestampsTz();
        });

        Schema::create('password_reset_tokens', function (Blueprint $table): void {
            $table->string('email', 254)->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('personal_access_tokens');
        Schema::dropIfExists('organization_memberships');
        Schema::dropIfExists('organizations');
        Schema::dropIfExists('profiles');
        Schema::dropIfExists('users');
        Schema::dropIfExists('role_permissions');
        Schema::dropIfExists('permissions');
        Schema::dropIfExists('roles');
    }
};
