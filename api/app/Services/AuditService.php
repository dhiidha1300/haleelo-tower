<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Support\Facades\Auth;

class AuditService
{
    public function log(
        string $action,
        string $modelType,
        int $modelId,
        ?array $oldValues = null,
        ?array $newValues = null
    ): AuditLog {
        $user = Auth::user();

        return AuditLog::create([
            'user_id' => $user?->id,
            'user_name' => $user?->name ?? 'System',
            'user_role' => $user?->getRole() ?? 'system',
            'action' => $action,
            'model_type' => $modelType,
            'model_id' => $modelId,
            'old_values' => $oldValues,
            'new_values' => $newValues,
            'ip_address' => request()->ip(),
            'created_at' => now(),
        ]);
    }

    public function logLogin(User $user): void
    {
        $this->log('login', User::class, $user->id);
    }

    public function logLogout(User $user): void
    {
        $this->log('logout', User::class, $user->id);
    }

    public function logApproval(string $modelType, int $modelId, ?string $notes = null): void
    {
        $this->log('approved', $modelType, $modelId, null, ['notes' => $notes]);
    }

    public function logRejection(string $modelType, int $modelId, string $reason): void
    {
        $this->log('rejected', $modelType, $modelId, null, ['reason' => $reason]);
    }

    public function logExport(string $reportType): void
    {
        $this->log('exported', 'Report', 0, null, ['type' => $reportType]);
    }

    public function getLogsForModel(string $modelType, int $modelId)
    {
        return AuditLog::byModelType($modelType)
            ->byModelId($modelId)
            ->recent()
            ->paginate(50);
    }

    public function getLogsFiltered(
        ?int $userId = null,
        ?string $action = null,
        ?string $modelType = null,
        ?string $startDate = null,
        ?string $endDate = null
    ) {
        $query = AuditLog::query();

        if ($userId) {
            $query->byUser($userId);
        }

        if ($action) {
            $query->byAction($action);
        }

        if ($modelType) {
            $query->byModelType($modelType);
        }

        if ($startDate && $endDate) {
            $query->dateRange($startDate, $endDate);
        }

        return $query->recent()->paginate(50);
    }
}
