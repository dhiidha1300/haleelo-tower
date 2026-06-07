<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Caching\Cacheable;
use Illuminate\Support\Facades\Cache;

class SystemSetting extends Model
{
    protected $table = 'system_settings';

    protected $fillable = [
        'key',
        'value',
        'description',
        'updated_by',
    ];

    public $timestamps = false;

    const CACHE_PREFIX = 'system_setting:';
    const CACHE_ALL_KEY = 'system_settings:all';
    const CACHE_TTL = 3600; // 1 hour

    protected static function booted()
    {
        static::saved(function ($model) {
            Cache::forget(self::CACHE_PREFIX . $model->key);
            Cache::forget(self::CACHE_ALL_KEY);
        });

        static::deleted(function ($model) {
            Cache::forget(self::CACHE_PREFIX . $model->key);
            Cache::forget(self::CACHE_ALL_KEY);
        });
    }

    public static function get($key, $default = null)
    {
        return Cache::remember(self::CACHE_PREFIX . $key, self::CACHE_TTL, function () use ($key, $default) {
            $setting = self::where('key', $key)->first();
            return $setting ? $setting->value : $default;
        });
    }

    public static function set($key, $value, $description = null, $userId = null)
    {
        return self::updateOrCreate(
            ['key' => $key],
            [
                'value' => $value,
                'description' => $description,
                'updated_by' => $userId,
            ]
        );
    }

    public static function all()
    {
        return Cache::remember(self::CACHE_ALL_KEY, self::CACHE_TTL, function () {
            return parent::all()
                ->keyBy('key')
                ->map(fn($setting) => $setting->value)
                ->toArray();
        });
    }
}
