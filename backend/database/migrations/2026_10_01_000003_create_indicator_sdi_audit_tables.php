<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('indicators', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('code', 80)->unique();
            $table->string('slug', 180)->unique();
            $table->string('title', 180);
            $table->text('definition');
            $table->string('unit', 100);
            $table->foreignUuid('organization_id')->constrained('organizations')->restrictOnDelete();
            $table->string('source_name', 240);
            $table->string('period_label', 100)->nullable();
            $table->decimal('value_numeric', 24, 8)->nullable();
            $table->text('value_text')->nullable();
            $table->date('reference_period_start')->nullable();
            $table->date('reference_period_end')->nullable();
            $table->string('status', 20)->default('draft')->index();
            $table->foreignUuid('created_by')->constrained('users')->restrictOnDelete();
            $table->foreignUuid('updated_by')->constrained('users')->restrictOnDelete();
            $table->timestampTz('published_at')->nullable();
            $table->timestampsTz();
            $table->index(['organization_id', 'status', 'updated_at']);
            $table->index(['published_at', 'title']);
        });

        Schema::create('indicator_observations', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('indicator_id')->constrained('indicators')->restrictOnDelete();
            $table->date('period_start')->nullable();
            $table->date('period_end')->nullable();
            $table->string('period_label', 160);
            $table->decimal('value_numeric', 24, 8)->nullable();
            $table->text('value_text')->nullable();
            $table->string('unit', 100)->nullable();
            $table->string('geographic_code', 160)->nullable();
            $table->string('geographic_name', 240)->nullable();
            $table->string('dimension_key', 240)->default('overall');
            $table->json('dimensions')->default('{}');
            $table->string('source_reference', 2048)->nullable();
            $table->string('source_name', 240);
            $table->string('source_url', 2048)->nullable();
            $table->unsignedInteger('revision_no')->default(1);
            $table->boolean('is_current')->default(false);
            $table->string('status', 20)->default('draft')->index();
            $table->string('quality_status', 24)->default('unreviewed');
            $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignUuid('published_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestampTz('published_at')->nullable();
            $table->timestampsTz();
            $table->index(['indicator_id', 'period_start']);
        });

        Schema::create('dataset_sdi_metadata', function (Blueprint $table): void {
            $table->foreignUuid('dataset_id')->constrained('datasets')->cascadeOnDelete();
            $table->unsignedInteger('dataset_version');
            $table->string('ddp_id', 160)->nullable();
            $table->string('ddp_name', 240)->nullable();
            $table->string('source_reference', 2048)->nullable();
            $table->unsignedSmallInteger('available_year')->nullable();
            $table->string('sds_code', 160)->nullable();
            $table->string('sds_type', 120)->nullable();
            $table->string('sds_version', 80)->nullable();
            $table->string('standard_concept', 1000)->nullable();
            $table->text('standard_definition')->nullable();
            $table->string('measurement', 160)->nullable();
            $table->json('presentation_classification')->default('[]');
            $table->string('reference_code', 160)->nullable();
            $table->string('reference_code_version', 80)->nullable();
            $table->text('method_description')->nullable();
            $table->uuid('sds_registry_id')->nullable();
            $table->uuid('reference_system_id')->nullable();
            $table->timestampsTz();
            $table->primary(['dataset_id', 'dataset_version']);
            $table->foreign(['dataset_id', 'dataset_version'], 'dataset_sdi_metadata_version_fk')
                ->references(['dataset_id', 'version'])->on('dataset_versions')->cascadeOnDelete();
        });

        Schema::create('sdi_standard_registry', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('standard_code', 160)->unique();
            $table->string('standard_type', 32);
            $table->string('title', 300);
            $table->text('definition');
            $table->string('authority_name', 240);
            $table->string('version_label', 100);
            $table->string('source_url', 2048)->nullable();
            $table->string('evidence_url', 2048)->nullable();
            $table->date('valid_from')->nullable();
            $table->date('valid_until')->nullable();
            $table->string('status', 24)->default('draft')->index();
            $table->foreignUuid('created_by')->constrained('users')->restrictOnDelete();
            $table->foreignUuid('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestampTz('reviewed_at')->nullable();
            $table->timestampsTz();
        });

        Schema::create('reference_code_systems', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('system_code', 160)->unique();
            $table->string('title', 300);
            $table->text('description');
            $table->string('authority_name', 240);
            $table->string('version_label', 100);
            $table->string('source_url', 2048)->nullable();
            $table->string('evidence_url', 2048)->nullable();
            $table->date('valid_from')->nullable();
            $table->date('valid_until')->nullable();
            $table->string('status', 24)->default('draft')->index();
            $table->foreignUuid('created_by')->constrained('users')->restrictOnDelete();
            $table->foreignUuid('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestampTz('reviewed_at')->nullable();
            $table->timestampsTz();
        });

        Schema::create('reference_code_entries', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('system_id')->constrained('reference_code_systems')->cascadeOnDelete();
            $table->string('code', 160);
            $table->string('label', 500);
            $table->text('definition')->nullable();
            $table->string('parent_code', 160)->nullable();
            $table->string('source_reference', 2048)->nullable();
            $table->date('valid_from')->nullable();
            $table->date('valid_until')->nullable();
            $table->foreignUuid('created_by')->constrained('users')->restrictOnDelete();
            $table->boolean('is_active')->default(true)->index();
            $table->timestampsTz();
            $table->unique(['system_id', 'code']);
            $table->index(['system_id', 'parent_code']);
        });

        Schema::create('sdi_harvest_runs', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('target', 100);
            $table->string('run_type', 32)->default('preflight');
            $table->string('status', 24)->default('queued')->index();
            $table->json('summary')->default('{}');
            $table->json('sample_issues')->default('[]');
            $table->text('safe_error_message')->nullable();
            $table->timestampTz('started_at')->nullable();
            $table->timestampTz('finished_at')->nullable();
            $table->foreignUuid('requested_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestampsTz();
        });

        Schema::create('dataset_upload_sessions', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('dataset_id')->constrained('datasets')->cascadeOnDelete();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedInteger('dataset_version');
            $table->string('storage_path', 700)->unique();
            $table->char('token_hash', 64)->unique();
            $table->string('original_filename', 255);
            $table->string('format', 24);
            $table->string('mime_type', 160);
            $table->unsignedBigInteger('expected_size');
            $table->timestampTz('expires_at')->index();
            $table->timestampTz('uploaded_at')->nullable();
            $table->timestampTz('created_at')->useCurrent();
        });

        Schema::create('audit_logs', function (Blueprint $table): void {
            $table->bigIncrements('id');
            $table->foreignUuid('actor_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action', 160);
            $table->string('entity_type', 100);
            $table->string('entity_id', 180)->nullable();
            $table->foreignUuid('organization_id')->nullable()->constrained('organizations')->nullOnDelete();
            $table->string('outcome', 16)->default('success');
            $table->string('request_id', 120)->nullable()->index();
            $table->json('summary')->default('{}');
            $table->timestampTz('created_at')->useCurrent();
            $table->index(['organization_id', 'created_at']);
        });

        Schema::create('public_catalog_revision', function (Blueprint $table): void {
            $table->unsignedSmallInteger('id')->primary()->default(1);
            $table->unsignedBigInteger('revision')->default(1);
            $table->timestampTz('updated_at')->useCurrent();
        });
        DB::table('public_catalog_revision')->insert(['id' => 1, 'revision' => 1, 'updated_at' => now()]);
    }

    public function down(): void
    {
        Schema::dropIfExists('public_catalog_revision');
        Schema::dropIfExists('dataset_upload_sessions');
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('sdi_harvest_runs');
        Schema::dropIfExists('reference_code_entries');
        Schema::dropIfExists('reference_code_systems');
        Schema::dropIfExists('sdi_standard_registry');
        Schema::dropIfExists('dataset_sdi_metadata');
        Schema::dropIfExists('indicator_observations');
        Schema::dropIfExists('indicators');
    }
};
