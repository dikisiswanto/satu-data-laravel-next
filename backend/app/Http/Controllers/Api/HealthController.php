<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\DB;
use Throwable;

class HealthController extends Controller
{
    /** Fast readiness probe: deliberately read-only and safe for frequent container health checks. */
    public function __invoke()
    {
        try {
            DB::select('select 1');

            return response()->json([
                'status' => 'ok',
                'service' => 'satu-data-wajo-api',
                'timestamp' => now()->toISOString(),
                'checks' => ['database' => 'ok'],
            ], 200, ['Cache-Control' => 'no-store']);
        } catch (Throwable) {
            report(new \RuntimeException('api_readiness_database_check_failed'));

            return response()->json([
                'status' => 'degraded',
                'service' => 'satu-data-wajo-api',
                'timestamp' => now()->toISOString(),
                'checks' => ['database' => 'error'],
            ], 503, ['Cache-Control' => 'no-store']);
        }
    }
}
