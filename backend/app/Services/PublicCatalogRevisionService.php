<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PublicCatalogRevisionService
{
    public function bump(): void
    {
        DB::table('public_catalog_revision')->where('id', 1)->increment('revision', 1, ['updated_at' => now()]);
        DB::afterCommit(function (): void {
            foreach ([
                'public:stats:v1',
                'public:facets:v1',
                'public:sdi-harvest:v1',
                'public:sdi-catalog:v1',
                'public:geoportal-manifest:v1',
            ] as $key) {
                try {
                    Cache::forget($key);
                } catch (\Throwable $exception) {
                    // The data transaction is already committed. A cache outage
                    // must not turn a successful write into an apparent failure
                    // that encourages the user to submit the mutation again.
                    Log::warning('public_catalog_cache_invalidation_failed', [
                        'cache_key' => $key,
                        'exception' => $exception::class,
                    ]);
                }
            }
        });
    }
}
