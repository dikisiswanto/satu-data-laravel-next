<?php

return [
    'frontend_url' => env('FRONTEND_URL', 'http://localhost:3000'),
    'legacy_supabase_database_url' => env('LEGACY_SUPABASE_DATABASE_URL', ''),
    'public_backend_api_url' => env('PUBLIC_BACKEND_API_URL', ''),
    'rate_limit_per_minute' => max(60, min(1200, (int) env('RATE_LIMIT_PER_MINUTE', 1200))),
    'anonymous_rate_limit_per_minute' => max(30, min(300, (int) env('ANONYMOUS_RATE_LIMIT_PER_MINUTE', 120))),
    // Authenticated portal requests have a separate account budget. Sensitive
    // routes retain their own endpoint-specific limits.
    'portal_user_rate_limit_per_minute' => max(300, min(1200, (int) env('PORTAL_USER_RATE_LIMIT_PER_MINUTE', 1200))),
    'frontend_token_ttl_days' => max(1, min(30, (int) env('FRONTEND_TOKEN_TTL_DAYS', 14))),
    'conversion' => [
        'job_timeout' => max(120, min(900, (int) env('CONVERSION_JOB_TIMEOUT', 900))),
        'max_rows' => max(1000, min(100000, (int) env('CONVERSION_MAX_ROWS', 100000))),
        'max_columns' => max(1, min(100, (int) env('CONVERSION_MAX_COLUMNS', 100))),
        'max_cells' => max(10000, min(200000, (int) env('CONVERSION_MAX_CELLS', 200000))),
        'max_json_tokens' => max(10000, min(600000, (int) env('CONVERSION_MAX_JSON_TOKENS', 600000))),
        'max_upload_bytes' => max(1024, min(26214400, (int) env('UPLOAD_MAX_BYTES', 26214400))),
        'max_output_bytes' => max(1048576, min(26214400, (int) env('CONVERSION_MAX_OUTPUT_BYTES', 26214400))),
    ],
    'auth' => [
        'login_email_max_attempts' => max(3, min(10, (int) env('AUTH_LOGIN_EMAIL_MAX_ATTEMPTS', 5))),
        'login_ip_max_attempts' => max(10, min(60, (int) env('AUTH_LOGIN_IP_MAX_ATTEMPTS', 30))),
        'login_decay_seconds' => max(60, min(3600, (int) env('AUTH_LOGIN_DECAY_SECONDS', 900))),
    ],
];
