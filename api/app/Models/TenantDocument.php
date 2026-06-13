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
