<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Floor extends Model
{
    protected $fillable = ['name', 'level', 'description'];

    public function spaces(): HasMany
    {
        return $this->hasMany(Space::class);
    }
}
