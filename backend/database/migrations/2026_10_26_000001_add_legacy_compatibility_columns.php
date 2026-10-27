<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['sdi_standard_registry', 'reference_code_systems'] as $tableName) {
            if (Schema::hasTable($tableName) && ! Schema::hasColumn($tableName, 'reviewed_at')) {
                Schema::table($tableName, function (Blueprint $table): void {
                    $table->timestampTz('reviewed_at')->nullable();
                });
            }
        }

        if (Schema::hasTable('reference_code_entries') && ! Schema::hasColumn('reference_code_entries', 'is_active')) {
            Schema::table('reference_code_entries', function (Blueprint $table): void {
                $table->boolean('is_active')->default(true)->index();
            });
        }
    }

    public function down(): void
    {
        // Keep compatibility columns in place during rollback. Older versions
        // can safely ignore these additive columns, while removing them could
        // discard source-system review or activation metadata.
    }
};
