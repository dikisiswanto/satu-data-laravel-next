<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('datasets', function (Blueprint $table): void {
            $table->text('description')->nullable()->change();
            $table->string('geographic_scope', 240)->nullable()->change();
            $table->string('update_frequency', 24)->nullable()->change();
            $table->string('source_name', 240)->nullable()->change();
            $table->string('license_text', 240)->nullable()->change();
        });
    }

    public function down(): void
    {
        // Preserve rollback safety for records created as lightweight drafts.
        DB::table('datasets')->whereNull('description')->update(['description' => 'Deskripsi belum dilengkapi.']);
        DB::table('datasets')->whereNull('geographic_scope')->update(['geographic_scope' => 'Belum ditentukan']);
        DB::table('datasets')->whereNull('update_frequency')->update(['update_frequency' => 'irregular']);
        DB::table('datasets')->whereNull('source_name')->update(['source_name' => 'Sumber belum dicatat']);
        DB::table('datasets')->whereNull('license_text')->update(['license_text' => 'Ketentuan penggunaan belum ditetapkan']);

        Schema::table('datasets', function (Blueprint $table): void {
            $table->text('description')->nullable(false)->change();
            $table->string('geographic_scope', 240)->nullable(false)->change();
            $table->string('update_frequency', 24)->nullable(false)->change();
            $table->string('source_name', 240)->nullable(false)->change();
            $table->string('license_text', 240)->nullable(false)->change();
        });
    }
};
