<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MaintenancePhoto extends Model
{
    protected $fillable = ['maintenance_request_id', 'phase', 'file_url', 'caption', 'uploaded_by'];

    /** Stored value is an S3 key; expose a usable (signed) URL. */
    public function getFileUrlAttribute($value): ?string
    {
        return \App\Support\FileStorage::url($value);
    }

    public function request(): BelongsTo
    {
        return $this->belongsTo(MaintenanceRequest::class, 'maintenance_request_id');
    }
}
