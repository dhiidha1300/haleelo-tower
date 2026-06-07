<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Services\AuditService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class AuditController extends Controller
{
    public function __construct(private AuditService $auditService) {}

    public function index(Request $request): JsonResponse
    {
        $logs = $this->auditService->getLogsFiltered(
            userId: $request->input('user_id'),
            action: $request->input('action'),
            modelType: $request->input('model_type'),
            startDate: $request->input('start_date'),
            endDate: $request->input('end_date')
        );

        return response()->json($logs);
    }

    public function forModel(Request $request, string $modelType, int $modelId): JsonResponse
    {
        $logs = AuditLog::byModelType($modelType)
            ->byModelId($modelId)
            ->recent()
            ->paginate(50);

        return response()->json($logs);
    }

    public function export(Request $request): JsonResponse
    {
        $request->validate([
            'format' => 'required|in:pdf,excel',
        ]);

        try {
            $logs = $this->auditService->getLogsFiltered(
                userId: $request->input('user_id'),
                action: $request->input('action'),
                modelType: $request->input('model_type'),
                startDate: $request->input('start_date'),
                endDate: $request->input('end_date')
            );

            // TODO: Implement PDF and Excel export using DomPDF and Maatwebsite/Excel

            $this->auditService->logExport('Audit Logs');

            return response()->json([
                'message' => 'Export initiated.',
                'format' => $request->format,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Error',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    public function statistics(): JsonResponse
    {
        $total = AuditLog::count();
        $byAction = AuditLog::selectRaw('action, count(*) as count')
            ->groupBy('action')
            ->get()
            ->keyBy('action');

        $byUser = AuditLog::selectRaw('user_name, count(*) as count')
            ->groupBy('user_name')
            ->orderByDesc('count')
            ->limit(10)
            ->get();

        return response()->json([
            'total' => $total,
            'by_action' => $byAction,
            'top_users' => $byUser,
        ]);
    }
}
