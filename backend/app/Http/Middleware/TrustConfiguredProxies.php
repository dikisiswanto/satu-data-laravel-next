<?php

namespace App\Http\Middleware;

use Illuminate\Http\Middleware\TrustProxies;

/**
 * Membaca daftar proxy tepercaya setelah konfigurasi Laravel selesai dimuat.
 * Jangan memanggil config() dari callback withMiddleware di bootstrap/app.php:
 * callback tersebut dapat dijalankan sebelum layanan config tersedia.
 */
class TrustConfiguredProxies extends TrustProxies
{
    protected function proxies()
    {
        $configured = config('app.trusted_proxies');

        if ($configured !== null && $configured !== '') {
            return $configured;
        }

        return parent::proxies();
    }
}
