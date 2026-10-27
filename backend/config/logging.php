<?php

use Monolog\Handler\NullHandler;
use Monolog\Handler\StreamHandler;

return [
    'default' => env('LOG_CHANNEL', 'stderr'),
    'deprecations' => ['channel' => env('LOG_DEPRECATIONS_CHANNEL', 'null'), 'trace' => false],
    'channels' => [
        'stderr' => [
            'driver' => 'monolog', 'level' => env('LOG_LEVEL', 'info'),
            'handler' => StreamHandler::class, 'with' => ['stream' => 'php://stderr'],
            'formatter' => env('LOG_STDERR_FORMATTER'), 'replace_placeholders' => true,
        ],
        'single' => ['driver' => 'single', 'path' => storage_path('logs/laravel.log'), 'level' => env('LOG_LEVEL', 'info'), 'replace_placeholders' => true],
        'daily' => ['driver' => 'daily', 'path' => storage_path('logs/laravel.log'), 'level' => env('LOG_LEVEL', 'info'), 'days' => 14, 'replace_placeholders' => true],
        'null' => ['driver' => 'monolog', 'handler' => NullHandler::class],
        'emergency' => ['path' => storage_path('logs/laravel.log')],
    ],
];
