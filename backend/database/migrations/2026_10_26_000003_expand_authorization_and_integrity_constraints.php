<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Additional permission codes and integrity edges. Existing API payloads
     * remain role-code based for compatibility, while domain actions can use the
     * normalized permission catalog as their authorization source of truth.
     */
    public function up(): void
    {
        $permissions = [
            'organizations.read' => 'Lihat organisasi yang dapat diakses',
            'datasets.read' => 'Lihat dataset',
            'datasets.write' => 'Kelola metadata dan sumber dataset',
            'datasets.metadata.write' => 'Kelola metadata SDI dataset',
            'datasets.submit' => 'Ajukan dataset untuk ditinjau',
            'datasets.review' => 'Tinjau dan kembalikan dataset',
            'datasets.publish' => 'Publikasikan dataset',
            'datasets.archive' => 'Arsipkan dataset',
            'datasets.version' => 'Kelola versi dataset',
            'indicators.read' => 'Lihat indikator dan observasi',
            'indicators.manage' => 'Kelola definisi dan observasi indikator',
            'indicators.submit' => 'Ajukan indikator untuk ditinjau',
            'indicators.review' => 'Tinjau dan kembalikan indikator',
            'indicators.publish' => 'Publikasikan indikator dan observasi',
            'indicators.archive' => 'Arsipkan indikator',
        ];

        foreach ($permissions as $code => $name) {
            $exists = DB::table('permissions')->where('code', $code)->exists();
            if ($exists) {
                DB::table('permissions')->where('code', $code)->update(['name' => $name, 'updated_at' => now()]);
            } else {
                DB::table('permissions')->insert([
                    'code' => $code, 'name' => $name, 'description' => null,
                    'created_at' => now(), 'updated_at' => now(),
                ]);
            }
        }

        $allRoles = ['super_admin', 'data_admin', 'admin_opd', 'reviewer', 'editor', 'viewer', 'auditor'];
        $roleGrants = [
            'organizations.read' => $allRoles,
            'datasets.read' => $allRoles,
            'datasets.write' => ['super_admin', 'data_admin', 'admin_opd', 'editor'],
            'datasets.metadata.write' => ['super_admin', 'data_admin', 'admin_opd', 'editor'],
            'datasets.submit' => ['super_admin', 'data_admin', 'admin_opd', 'editor'],
            'datasets.review' => ['super_admin', 'data_admin', 'admin_opd', 'reviewer'],
            'datasets.publish' => ['super_admin', 'data_admin', 'admin_opd'],
            'datasets.archive' => ['super_admin', 'data_admin'],
            'datasets.version' => ['super_admin', 'data_admin', 'admin_opd', 'editor'],
            'indicators.read' => $allRoles,
            'indicators.manage' => ['super_admin', 'data_admin', 'admin_opd', 'editor'],
            'indicators.submit' => ['super_admin', 'data_admin', 'admin_opd', 'editor'],
            'indicators.review' => ['super_admin', 'data_admin', 'admin_opd', 'reviewer'],
            'indicators.publish' => ['super_admin', 'data_admin', 'admin_opd'],
            'indicators.archive' => ['super_admin', 'data_admin', 'admin_opd'],
        ];

        foreach ($roleGrants as $permissionCode => $roleCodes) {
            $permissionId = DB::table('permissions')->where('code', $permissionCode)->value('id');
            foreach ($roleCodes as $roleCode) {
                $roleId = DB::table('roles')->where('code', $roleCode)->value('id');
                if ($permissionId && $roleId) {
                    DB::table('role_permissions')->insertOrIgnore([
                        'role_id' => $roleId,
                        'permission_id' => $permissionId,
                    ]);
                }
            }
        }

        // Reviewers were accidentally granted indicators.manage by the first
        // catalog despite being review-only in the route policy. Keep the
        // permission matrix aligned with the actual domain capability.
        $managePermissionId = DB::table('permissions')->where('code', 'indicators.manage')->value('id');
        $reviewerId = DB::table('roles')->where('code', 'reviewer')->value('id');
        if ($managePermissionId && $reviewerId) {
            DB::table('role_permissions')->where('role_id', $reviewerId)->where('permission_id', $managePermissionId)->delete();
        }

        // Preflight data before adding foreign keys. Fail loudly rather than
        // silently dropping an existing mapping from SDI metadata or upload state.
        $orphanStandard = DB::table('dataset_sdi_metadata as m')
            ->leftJoin('sdi_standard_registry as s', 's.id', '=', 'm.sds_registry_id')
            ->whereNotNull('m.sds_registry_id')->whereNull('s.id')->exists();
        if ($orphanStandard) {
            throw new RuntimeException('Cannot add SDI standard FK: dataset_sdi_metadata has orphan sds_registry_id values. Repair these rows and rerun migrations.');
        }

        $orphanReferenceSystem = DB::table('dataset_sdi_metadata as m')
            ->leftJoin('reference_code_systems as r', 'r.id', '=', 'm.reference_system_id')
            ->whereNotNull('m.reference_system_id')->whereNull('r.id')->exists();
        if ($orphanReferenceSystem) {
            throw new RuntimeException('Cannot add reference-system FK: dataset_sdi_metadata has orphan reference_system_id values. Repair these rows and rerun migrations.');
        }

        $orphanUploadVersion = DB::table('dataset_upload_sessions as u')
            ->leftJoin('dataset_versions as v', function ($join): void {
                $join->on('v.dataset_id', '=', 'u.dataset_id')->on('v.version', '=', 'u.dataset_version');
            })
            ->whereNull('v.dataset_id')->exists();
        if ($orphanUploadVersion) {
            throw new RuntimeException('Cannot add upload-session version FK: dataset_upload_sessions has orphan dataset/version pairs. Expire or repair the affected upload sessions and rerun migrations.');
        }

        Schema::table('dataset_sdi_metadata', function (Blueprint $table): void {
            $table->foreign('sds_registry_id', 'dataset_sdi_standard_registry_fk')
                ->references('id')->on('sdi_standard_registry')->nullOnDelete();
            $table->foreign('reference_system_id', 'dataset_sdi_reference_system_fk')
                ->references('id')->on('reference_code_systems')->nullOnDelete();
        });

        Schema::table('dataset_upload_sessions', function (Blueprint $table): void {
            $table->foreign(['dataset_id', 'dataset_version'], 'upload_session_dataset_version_fk')
                ->references(['dataset_id', 'version'])->on('dataset_versions')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('dataset_upload_sessions', function (Blueprint $table): void {
            $table->dropForeign('upload_session_dataset_version_fk');
        });
        Schema::table('dataset_sdi_metadata', function (Blueprint $table): void {
            $table->dropForeign('dataset_sdi_reference_system_fk');
            $table->dropForeign('dataset_sdi_standard_registry_fk');
        });

        $codes = [
            'organizations.read', 'datasets.metadata.write', 'datasets.submit', 'datasets.archive', 'datasets.version',
            'indicators.read', 'indicators.submit', 'indicators.review', 'indicators.publish', 'indicators.archive',
        ];
        $ids = DB::table('permissions')->whereIn('code', $codes)->pluck('id');
        if ($ids->isNotEmpty()) {
            DB::table('role_permissions')->whereIn('permission_id', $ids)->delete();
            DB::table('permissions')->whereIn('id', $ids)->delete();
        }

        // Restore the original catalog grant if this migration is rolled back.
        $managePermissionId = DB::table('permissions')->where('code', 'indicators.manage')->value('id');
        $reviewerId = DB::table('roles')->where('code', 'reviewer')->value('id');
        if ($managePermissionId && $reviewerId) {
            DB::table('role_permissions')->insertOrIgnore(['role_id' => $reviewerId, 'permission_id' => $managePermissionId]);
        }
    }
};
