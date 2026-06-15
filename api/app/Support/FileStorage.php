<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

/**
 * Central helper for user-uploaded files. Stores files on the configured
 * uploads disk (s3 in production) and ALWAYS keeps only the object key in the
 * database. URLs are produced on read — signed/temporary for S3 so the bucket
 * stays private. Legacy rows that still hold a full URL or a local "/storage/…"
 * path are passed through unchanged.
 */
class FileStorage
{
    public static function disk(): string
    {
        return config('uploads.disk', 'public');
    }

    /** Store an uploaded file and return its storage key (path). */
    public static function put(UploadedFile $file, string $directory): string
    {
        $disk = self::disk();

        // Build a throwing instance so the real underlying error (SSL, auth, etc.)
        // surfaces instead of being swallowed by the disk's throw=false default.
        $storage = Storage::build(array_merge(config("filesystems.disks.$disk"), ['throw' => true]));

        try {
            $key = $storage->putFile($directory, $file);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('File upload to "' . $disk . '" failed', [
                'directory' => $directory,
                'original'  => $file->getClientOriginalName(),
                'error'     => $e->getMessage(),
            ]);
            throw new \RuntimeException('File upload failed: ' . $e->getMessage());
        }

        if (empty($key)) {
            throw new \RuntimeException('File upload failed (empty key returned).');
        }

        return $key;
    }

    /** Store raw contents at a given key and return the key. */
    public static function putContents(string $key, string $contents): string
    {
        $ok = Storage::disk(self::disk())->put($key, $contents);

        if ($ok === false) {
            \Illuminate\Support\Facades\Log::error('Writing contents to "' . self::disk() . '" failed', ['key' => $key]);
            throw new \RuntimeException('Failed to store generated file.');
        }

        return $key;
    }

    /** Turn a stored key into a usable URL (signed for S3). */
    public static function url(?string $key): ?string
    {
        if (empty($key)) {
            return null;
        }

        // Legacy / already-absolute values: full URLs or local "/storage/…" paths.
        if (self::isAbsolute($key)) {
            return $key;
        }

        $disk    = self::disk();
        $storage = Storage::disk($disk);

        if ($disk === 's3') {
            try {
                return $storage->temporaryUrl($key, now()->addMinutes((int) config('uploads.temp_url_minutes', 360)));
            } catch (\Throwable $e) {
                // Fall back to a plain URL if signing is unavailable.
                return $storage->url($key);
            }
        }

        return $storage->url($key);
    }

    /** Delete a stored file. Accepts a key or a legacy local URL/path. */
    public static function delete(?string $key): void
    {
        if (empty($key)) {
            return;
        }

        if (self::isAbsolute($key)) {
            // Best-effort: derive a relative key from a legacy "/storage/…" URL.
            $path = parse_url($key, PHP_URL_PATH) ?: $key;
            $key  = ltrim(str_replace('/storage/', '', $path), '/');
        }

        try {
            Storage::disk(self::disk())->delete($key);
        } catch (\Throwable $e) {
            // Swallow — a missing/already-deleted file should not break the request.
        }
    }

    private static function isAbsolute(string $value): bool
    {
        return str_starts_with($value, 'http://')
            || str_starts_with($value, 'https://')
            || str_starts_with($value, '/');
    }
}
