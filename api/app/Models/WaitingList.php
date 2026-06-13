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
        'notified', 'notified_at',
    ];

    protected $casts = [
        'booking_date' => 'date',
        'notified'     => 'boolean',
        'notified_at'  => 'datetime',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Space::class, 'product_id');
    }
}
