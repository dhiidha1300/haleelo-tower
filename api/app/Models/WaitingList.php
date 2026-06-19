<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WaitingList extends Model
{
    protected $table = 'waiting_list';

    protected $fillable = [
        'product_id', 'session_type', 'booking_date',
        'client_name', 'client_email', 'client_phone',
        'status', 'notify_channel', 'position', 'created_by',
        'converted_booking_id', 'notified', 'notified_at', 'slot_opened_at', 'notes',
    ];

    protected $casts = [
        'booking_date'   => 'date',
        'notified'       => 'boolean',
        'notified_at'    => 'datetime',
        'slot_opened_at' => 'datetime',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Space::class, 'product_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function scopeWaiting($query)
    {
        return $query->where('status', 'waiting');
    }
}
