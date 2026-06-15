<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Uploads disk
    |--------------------------------------------------------------------------
    | Where user-uploaded files (avatars, tenant documents, contracts, receipts,
    | payslips, space photos, logo) are stored. Use "s3" in production and
    | "public" for purely local development. All access is via signed URLs when
    | on s3 — the bucket stays private.
    */
    'disk' => env('UPLOADS_DISK', 'public'),

    /*
    | How long a generated signed (temporary) S3 URL stays valid, in minutes.
    | Re-generated on every read, so this only needs to outlast a page session.
    */
    'temp_url_minutes' => (int) env('UPLOADS_TEMP_URL_MINUTES', 360),

];
