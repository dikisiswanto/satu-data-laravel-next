<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class PublicCatalogRevisionService
{
    public function bump(): void
    {
        DB::table('public_catalog_revision')->where('id', 1)->increment('revision', 1, ['updated_at' => now()]);
        DB::afterCommit(function (): void {
            Cache::forget('public:stats:v1');
            Cache::forget('public:facets:v1');
            Cache::forget('public:sdi-harvest:v1');
            Cache::forget('public:sdi-catalog:v1');
            Cache::forget('public:geoportal-manifest:v1');
        });
    }
}
