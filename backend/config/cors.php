<?php

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    'allowed_origins' => array_values(array_filter(array_map('trim', explode(',', (string) env('FRONTEND_URL', 'http://localhost:3000'))))),
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['Accept', 'Authorization', 'Content-Type', 'X-Requested-With', 'X-Request-Id', 'X-Upload-Token', 'X-CSRF-TOKEN', 'X-XSRF-TOKEN'],
    'exposed_headers' => ['X-Request-Id', 'Retry-After'],
    'max_age' => 600,
    'supports_credentials' => true,
];
