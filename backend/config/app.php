<?php

return [
    'name' => env('APP_NAME') ?: 'Portal Satu Data API',
    'env' => env('APP_ENV', 'production'),
    'debug' => (bool) env('APP_DEBUG', false),
    'url' => env('APP_URL', 'http://localhost'),
    'trusted_proxies' => env('TRUSTED_PROXIES') ?: null,
    'api_public_url' => env('API_PUBLIC_URL', env('APP_URL', 'http://localhost')),
    'timezone' => env('APP_TIMEZONE', 'Asia/Makassar'),
    'locale' => 'id',
    'fallback_locale' => 'en',
    'faker_locale' => 'id_ID',
    'cipher' => 'AES-256-CBC',
    'key' => env('APP_KEY'),
    'frontend_token_cookie' => env('FRONTEND_TOKEN_COOKIE', 'wajo_portal_token'),
    'previous_keys' => array_filter(explode(',', (string) env('APP_PREVIOUS_KEYS', ''))),
    'maintenance' => ['driver' => env('APP_MAINTENANCE_DRIVER', 'file'), 'store' => env('APP_MAINTENANCE_STORE', 'database')],
];
