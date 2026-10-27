<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // MySQL/MariaDB DDL is not fully transactional. Skip existing tables when resuming
        // a migration that previously stopped after creating some of its schema.
        if (! Schema::hasTable('datasets')) {
            Schema::create('datasets', function (Blueprint $table): void {
                $table->uuid('id')->primary();
                $table->string('code', 80)->unique();
                $table->string('slug', 180)->unique();
                $table->string('title', 180);
                $table->text('description')->nullable();
                $table->foreignUuid('organization_id')->constrained('organizations')->restrictOnDelete();
                $table->string('category', 120)->nullable();
                $table->json('keywords')->default('[]');
                $table->date('reference_period_start')->nullable();
                $table->date('reference_period_end')->nullable();
                $table->string('geographic_scope', 240)->nullable();
                $table->string('update_frequency', 24)->nullable();
                $table->string('source_name', 240)->nullable();
                $table->string('source_url', 2048)->nullable();
                $table->text('methodology')->nullable();
                $table->string('unit', 100)->nullable();
                $table->string('license_text', 240)->nullable();
                $table->string('contact', 254)->nullable();
                $table->timestampTz('last_data_updated_at')->nullable();
                $table->json('publication_check')->default('{}');
                $table->string('metadata_schema_version', 20)->default('1.0');
                $table->string('status', 20)->default('draft')->index();
                $table->foreignUuid('created_by')->constrained('users')->restrictOnDelete();
                $table->foreignUuid('updated_by')->constrained('users')->restrictOnDelete();
                $table->timestampTz('submitted_at')->nullable();
                $table->foreignUuid('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestampTz('reviewed_at')->nullable();
                $table->timestampTz('published_at')->nullable()->index();
                $table->timestampTz('archived_at')->nullable();
                $table->unsignedInteger('current_version')->default(1);
                $table->unsignedInteger('draft_version')->nullable();
                $table->timestampsTz();
                $table->index(['organization_id', 'status', 'updated_at']);
                $table->index(['status', 'published_at']);
            });
        }

        // MySQL/MariaDB DDL is not fully transactional. Skip existing tables when resuming
        // a migration that previously stopped after creating some of its schema.
        if (! Schema::hasTable('dataset_versions')) {
            Schema::create('dataset_versions', function (Blueprint $table): void {
                $table->uuid('id')->primary();
                $table->foreignUuid('dataset_id')->constrained('datasets')->restrictOnDelete();
                $table->unsignedInteger('version');
                $table->json('metadata_snapshot');
                $table->uuid('source_resource_id')->nullable();
                $table->foreignUuid('created_by')->constrained('users')->restrictOnDelete();
                $table->timestampTz('created_at')->useCurrent();
                $table->string('change_summary', 500)->nullable();
                $table->string('version_status', 24)->default('draft')->index();
                $table->unique(['dataset_id', 'version']);
                $table->index(['dataset_id', 'version', 'created_at']);
            });
        }

        // MySQL/MariaDB DDL is not fully transactional. Skip existing tables when resuming
        // a migration that previously stopped after creating some of its schema.
        if (! Schema::hasTable('dataset_resources')) {
            Schema::create('dataset_resources', function (Blueprint $table): void {
                $table->uuid('id')->primary();
                $table->foreignUuid('dataset_id')->constrained('datasets')->restrictOnDelete();
                $table->unsignedInteger('dataset_version');
                $table->string('storage_path', 700)->unique();
                $table->string('original_filename', 255);
                $table->string('format', 24);
                $table->string('mime_type', 160);
                $table->unsignedBigInteger('size_bytes');
                $table->char('checksum_sha256', 64)->nullable();
                $table->boolean('is_source')->default(false);
                $table->boolean('is_public')->default(false);
                $table->string('conversion_status', 24)->default('queued')->index();
                $table->string('converter_version', 80)->nullable();
                $table->foreignUuid('created_by')->constrained('users')->restrictOnDelete();
                $table->unsignedBigInteger('row_count')->nullable();
                $table->json('column_schema')->default('[]');
                $table->boolean('preview_enabled')->default(false);
                $table->timestampTz('created_at')->useCurrent();
                $table->index(['dataset_id', 'dataset_version', 'format']);
                // Candidate key lets the database enforce that a resource belongs to the exact dataset version.
                $table->unique(['id', 'dataset_id', 'dataset_version'], 'dataset_resource_version_candidate_unique');
            });
        }

        if (! $this->foreignKeyExists('dataset_resources', 'dataset_resource_version_fk')) {
            Schema::table('dataset_resources', function (Blueprint $table): void {
                $table->foreign(['dataset_id', 'dataset_version'], 'dataset_resource_version_fk')
                    ->references(['dataset_id', 'version'])->on('dataset_versions')->restrictOnDelete();
            });
        }

        if (! $this->foreignKeyExists('dataset_versions', 'dataset_version_source_resource_scope_fk')) {
            Schema::table('dataset_versions', function (Blueprint $table): void {
                $table->foreign(['source_resource_id', 'dataset_id', 'version'], 'dataset_version_source_resource_scope_fk')
                    ->references(['id', 'dataset_id', 'dataset_version'])->on('dataset_resources')->restrictOnDelete();
            });
        }

        // MySQL/MariaDB DDL is not fully transactional. Skip existing tables when resuming
        // a migration that previously stopped after creating some of its schema.
        if (! Schema::hasTable('dataset_validation_runs')) {
            Schema::create('dataset_validation_runs', function (Blueprint $table): void {
                $table->uuid('id')->primary();
                $table->foreignUuid('dataset_id')->constrained('datasets')->restrictOnDelete();
                $table->unsignedInteger('dataset_version');
                $table->char('source_checksum_sha256', 64);
                $table->string('status', 16);
                $table->json('checks')->default('{}');
                $table->string('converter_version', 80);
                $table->string('worker_run_id', 180);
                $table->timestampTz('created_at')->useCurrent();
                $table->index(['dataset_id', 'dataset_version', 'created_at'], 'validation_run_ds_ver_created_idx');
                $table->foreign(['dataset_id', 'dataset_version'], 'validation_run_dataset_version_fk')
                    ->references(['dataset_id', 'version'])->on('dataset_versions')->restrictOnDelete();
            });
        }

        // MySQL/MariaDB DDL is not fully transactional. Skip existing tables when resuming
        // a migration that previously stopped after creating some of its schema.
        if (! Schema::hasTable('dataset_resource_rows')) {
            Schema::create('dataset_resource_rows', function (Blueprint $table): void {
                $table->foreignUuid('resource_id')->constrained('dataset_resources')->cascadeOnDelete();
                $table->unsignedBigInteger('row_number');
                $table->json('row_data');
                $table->primary(['resource_id', 'row_number']);
            });
        }

        // MySQL/MariaDB DDL is not fully transactional. Skip existing tables when resuming
        // a migration that previously stopped after creating some of its schema.
        if (! Schema::hasTable('conversion_jobs')) {
            Schema::create('conversion_jobs', function (Blueprint $table): void {
                $table->uuid('id')->primary();
                $table->foreignUuid('dataset_id')->constrained('datasets')->restrictOnDelete();
                $table->unsignedInteger('dataset_version');
                $table->foreignUuid('source_resource_id');
                $table->string('target_format', 24);
                $table->string('status', 24)->default('queued')->index();
                $table->unsignedSmallInteger('attempts')->default(0);
                $table->string('idempotency_key', 160)->unique();
                $table->foreignUuid('requested_by')->constrained('users')->restrictOnDelete();
                $table->timestampTz('started_at')->nullable();
                $table->timestampTz('finished_at')->nullable();
                $table->string('error_code', 80)->nullable();
                $table->string('safe_error_message', 500)->nullable();
                $table->string('worker_id', 180)->nullable();
                $table->timestampTz('lease_expires_at')->nullable();
                $table->unsignedSmallInteger('max_attempts')->default(5);
                $table->timestampsTz();
                $table->index(['status', 'created_at']);
                $table->foreign(['dataset_id', 'dataset_version'], 'conversion_job_dataset_version_fk')
                    ->references(['dataset_id', 'version'])->on('dataset_versions')->restrictOnDelete();
                $table->foreign(['source_resource_id', 'dataset_id', 'dataset_version'], 'conversion_job_source_resource_scope_fk')
                    ->references(['id', 'dataset_id', 'dataset_version'])->on('dataset_resources')->restrictOnDelete();
            });
        }
    }

    private function foreignKeyExists(string $tableName, string $constraintName): bool
    {
        return DB::table('information_schema.TABLE_CONSTRAINTS')
            ->where('CONSTRAINT_SCHEMA', DB::getDatabaseName())
            ->where('TABLE_NAME', $tableName)
            ->where('CONSTRAINT_NAME', $constraintName)
            ->where('CONSTRAINT_TYPE', 'FOREIGN KEY')
            ->exists();
    }

    public function down(): void
    {
        Schema::dropIfExists('conversion_jobs');
        Schema::dropIfExists('dataset_resource_rows');
        Schema::dropIfExists('dataset_validation_runs');
        if (Schema::hasTable('dataset_versions') && $this->foreignKeyExists('dataset_versions', 'dataset_version_source_resource_scope_fk')) {
            Schema::table('dataset_versions', function (Blueprint $table): void {
                $table->dropForeign('dataset_version_source_resource_scope_fk');
            });
        }
        Schema::dropIfExists('dataset_resources');
        Schema::dropIfExists('dataset_versions');
        Schema::dropIfExists('datasets');
    }
};
