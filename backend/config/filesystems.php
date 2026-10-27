<?php

$privateDriver = env('PRIVATE_STORAGE_DRIVER', 'local');
$privateLocalPath = env('PRIVATE_STORAGE_PATH', storage_path('app/private'));
if (is_string($privateLocalPath) && $privateLocalPath !== '' && ! str_starts_with($privateLocalPath, DIRECTORY_SEPARATOR)) {
    $privateLocalPath = base_path($privateLocalPath);
}

return [
    'default' => env('FILESYSTEM_DISK', 'private'),
    'disks' => [
        'local' => ['driver' => 'local', 'root' => storage_path('app/private'), 'serve' => false, 'throw' => true, 'report' => false],
        'private' => [
            'driver' => $privateDriver,
            'root' => $privateDriver === 'local'
                ? $privateLocalPath
                : env('PRIVATE_STORAGE_PREFIX', ''),
            'key' => env('AWS_ACCESS_KEY_ID'),
            'secret' => env('AWS_SECRET_ACCESS_KEY'),
            'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
            'bucket' => env('AWS_BUCKET'),
            'url' => env('AWS_URL'),
            'endpoint' => env('AWS_ENDPOINT'),
            'use_path_style_endpoint' => env('AWS_USE_PATH_STYLE_ENDPOINT', false),
            'visibility' => 'private',
            'throw' => true,
            'report' => false,
        ],
        'public' => ['driver' => 'local', 'root' => storage_path('app/public'), 'url' => env('APP_URL').'/storage', 'visibility' => 'public', 'throw' => false],
    ],
    'links' => [public_path('storage') => storage_path('app/public')],
];
