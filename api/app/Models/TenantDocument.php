<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TenantDocument extends Model
{
    protected $fillable = [
        'tenant_id', 'document_type', 'file_url', 'original_name', 'expiry_date',
        'uploaded_by', 'uploaded_at',
    ];

    protected $casts = [
        'uploaded_at' => 'datetime',
        'expiry_date' => 'date',
    ];

    /** Stored value is an S3 key; expose it as a usable (signed) URL. */
    public function getFileUrlAttribute($value): ?string
    {
        return \App\Support\FileStorage::url($value);
    }

    public function scopeExpiringSoon($query, int $days = 30)
    {
        return $query->whereNotNull('expiry_date')
            ->whereDate('expiry_date', '>=', now()->toDateString())
            ->whereDate('expiry_date', '<=', now()->addDays($days)->toDateString());
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
