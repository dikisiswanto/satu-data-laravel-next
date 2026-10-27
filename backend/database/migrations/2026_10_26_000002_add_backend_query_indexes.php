<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('datasets', function (Blueprint $table): void {
            $table->index(['status', 'updated_at', 'published_at'], 'dataset_public_sort_idx');
            $table->index(['status', 'category', 'published_at'], 'dataset_category_filter_idx');
            $table->index(['status', 'reference_period_start'], 'dataset_period_filter_idx');
        });

        Schema::table('dataset_resources', function (Blueprint $table): void {
            $table->index(['dataset_id', 'dataset_version', 'is_source', 'conversion_status'], 'resource_source_status_idx');
            $table->index(['is_public', 'conversion_status', 'dataset_id', 'dataset_version'], 'resource_public_status_idx');
        });

        Schema::table('conversion_jobs', function (Blueprint $table): void {
            $table->index(['status', 'lease_expires_at', 'created_at'], 'conversion_lease_queue_idx');
            $table->index(['dataset_id', 'dataset_version', 'created_at'], 'conversion_dataset_history_idx');
        });

        Schema::table('indicators', function (Blueprint $table): void {
            $table->index(['organization_id', 'status', 'published_at'], 'indicator_org_publication_idx');
        });

        Schema::table('indicator_observations', function (Blueprint $table): void {
            $table->index(['indicator_id', 'is_current', 'status', 'period_start'], 'observation_current_public_idx');
            $table->index(['indicator_id', 'period_label', 'dimension_key', 'revision_no'], 'observation_revision_lookup_idx');
        });

        Schema::table('sdi_standard_registry', function (Blueprint $table): void {
            $table->index(['status', 'valid_from', 'valid_until'], 'sdi_registry_validity_idx');
        });

        Schema::table('reference_code_systems', function (Blueprint $table): void {
            $table->index(['status', 'valid_from', 'valid_until'], 'reference_system_validity_idx');
        });

        Schema::table('dataset_upload_sessions', function (Blueprint $table): void {
            $table->index(['user_id', 'dataset_id', 'expires_at'], 'upload_session_owner_expiry_idx');
        });

        Schema::table('audit_logs', function (Blueprint $table): void {
            $table->index(['actor_user_id', 'created_at'], 'audit_actor_created_idx');
        });

        Schema::table('sdi_harvest_runs', function (Blueprint $table): void {
            $table->index(['status', 'created_at'], 'harvest_status_created_idx');
        });

        Schema::table('organization_memberships', function (Blueprint $table): void {
            $table->index(['user_id', 'organization_id', 'is_active', 'role'], 'membership_active_scope_idx');
        });
    }

    public function down(): void
    {
        Schema::table('datasets', function (Blueprint $table): void {
            $table->dropIndex('dataset_public_sort_idx');
            $table->dropIndex('dataset_category_filter_idx');
            $table->dropIndex('dataset_period_filter_idx');
        });
        Schema::table('organization_memberships', function (Blueprint $table): void {
            $table->dropIndex('membership_active_scope_idx');
        });
        Schema::table('sdi_harvest_runs', function (Blueprint $table): void {
            $table->dropIndex('harvest_status_created_idx');
        });
        Schema::table('audit_logs', function (Blueprint $table): void {
            $table->dropIndex('audit_actor_created_idx');
        });
        Schema::table('dataset_upload_sessions', function (Blueprint $table): void {
            $table->dropIndex('upload_session_owner_expiry_idx');
        });
        Schema::table('reference_code_systems', function (Blueprint $table): void {
            $table->dropIndex('reference_system_validity_idx');
        });
        Schema::table('sdi_standard_registry', function (Blueprint $table): void {
            $table->dropIndex('sdi_registry_validity_idx');
        });
        Schema::table('indicator_observations', function (Blueprint $table): void {
            $table->dropIndex('observation_current_public_idx');
            $table->dropIndex('observation_revision_lookup_idx');
        });
        Schema::table('indicators', function (Blueprint $table): void {
            $table->dropIndex('indicator_org_publication_idx');
        });
        Schema::table('conversion_jobs', function (Blueprint $table): void {
            $table->dropIndex('conversion_lease_queue_idx');
            $table->dropIndex('conversion_dataset_history_idx');
        });
        Schema::table('dataset_resources', function (Blueprint $table): void {
            $table->dropIndex('resource_source_status_idx');
            $table->dropIndex('resource_public_status_idx');
        });
    }
};
