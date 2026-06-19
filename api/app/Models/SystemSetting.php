<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Caching\Cacheable;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;

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

    /** Keys whose stored value is encrypted at rest (Crypt/APP_KEY). */
    const ENCRYPTED_KEYS = ['smtp_password', 'resend_api_key'];

    public static function isEncryptedKey(string $key): bool
    {
        return in_array($key, self::ENCRYPTED_KEYS, true);
    }

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
        $value = Cache::remember(self::CACHE_PREFIX . $key, self::CACHE_TTL, function () use ($key, $default) {
            $setting = self::where('key', $key)->first();
            return $setting ? $setting->value : $default;
        });

        // Transparently decrypt secret keys. Legacy plaintext values (stored
        // before encryption was added) fail to decrypt and pass through as-is.
        if ($value && self::isEncryptedKey($key)) {
            try {
                return Crypt::decryptString($value);
            } catch (\Throwable $e) {
                return $value;
            }
        }

        return $value;
    }

    public static function set($key, $value, $description = null, $userId = null)
    {
        // Encrypt secret keys at rest before storing.
        if ($value !== null && $value !== '' && self::isEncryptedKey($key)) {
            $value = Crypt::encryptString($value);
        }

        return self::updateOrCreate(
            ['key' => $key],
            [
                'value' => $value,
                'description' => $description,
                'updated_by' => $userId,
            ]
        );
    }

    public static function all($columns = ['*'])
    {
        return Cache::remember(self::CACHE_ALL_KEY, self::CACHE_TTL, function () use ($columns) {
            return parent::query()
                ->select($columns)
                ->get()
                ->keyBy('key')
                ->map(fn($setting) => $setting->value)
                ->toArray();
        });
    }
}
