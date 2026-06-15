<?php

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    // Local dev origins plus any production origins listed in CORS_ALLOWED_ORIGINS
    // (comma-separated, e.g. "https://admin.example.com"). This keeps localhost
    // working in dev while allowing the deployed admin panel in production.
    'allowed_origins' => array_merge(
        ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:8000'],
        array_filter(array_map('trim', explode(',', (string) env('CORS_ALLOWED_ORIGINS', ''))))
    ),

    // Must be valid delimited regexes — these are run through preg_match.
    // Allow any localhost / 127.0.0.1 port, and any Cloudflare quick-tunnel URL.
    'allowed_origins_patterns' => [
        '#^https?://localhost(:\d+)?$#',
        '#^https?://127\.0\.0\.1(:\d+)?$#',
        '#^https://[a-z0-9-]+\.trycloudflare\.com$#',
    ],

    'allowed_headers' => ['*'],

    'exposed_headers' => ['*'],

    'max_age' => 0,

    'supports_credentials' => true,
];
