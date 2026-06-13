<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReferenceSequence extends Model
{
    protected $fillable = ['prefix', 'year', 'last_sequence'];

    protected $casts = [
        'year'          => 'integer',
        'last_sequence' => 'integer',
    ];
}
