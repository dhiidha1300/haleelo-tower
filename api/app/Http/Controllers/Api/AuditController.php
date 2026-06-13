<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Exports\AuditLogsExport;
use App\Models\AuditLog;
use App\Models\User;
use App\Services\AuditService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Maatwebsite\Excel\Facades\Excel;

class AuditController extends Controller
{
    public function __construct(private AuditService $auditService) {}

    public function index(Request $request): JsonResponse
    {
        $logs = $this->auditService->getLogsFiltered(
            userId:    $request->input('user_id'),
            action:    $request->input('action'),
            modelType: $request->input('model_type'),
            startDate: $request->input('start_date'),
            endDate:   $request->input('end_date'),
            page:      (int) $request->input('page', 1),
        );

        return response()->json($logs);
    }

    public function users(): JsonResponse
    {
        $users = User::select('id', 'name', 'email')
            ->withTrashed()
            ->orderBy('name')
            ->get();

        return response()->json($users);
    }

    public function forModel(Request $request, string $modelType, int $modelId): JsonResponse
    {
        $logs = AuditLog::byModelType($modelType)
            ->byModelId($modelId)
            ->recent()
            ->paginate(50);

        return response()->json($logs);
    }

    public function export(Request $request)
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

            $logsCollection = $this->auditService->getLogsForExport(
                userId:    $request->input('user_id'),
                action:    $request->input('action'),
                modelType: $request->input('model_type'),
                startDate: $request->input('start_date'),
                endDate:   $request->input('end_date'),
            );

            $filters = [
                'start_date' => $request->input('start_date'),
                'end_date'   => $request->input('end_date'),
                'action'     => $request->input('action'),
                'model_type' => $request->input('model_type'),
            ];

            $this->auditService->logExport('Audit Logs');

            if ($request->format === 'pdf') {
                $pdf = Pdf::loadView('pdfs.audit_logs', [
                    'logs'    => $logsCollection,
                    'filters' => $filters,
                ])->setPaper('a4', 'landscape');

                return response($pdf->output(), 200, [
                    'Content-Type'        => 'application/pdf',
                    'Content-Disposition' => 'attachment; filename="audit-logs-' . now()->format('Y-m-d') . '.pdf"',
                ]);
            }

            // Excel
            return Excel::download(
                new AuditLogsExport($logsCollection),
                'audit-logs-' . now()->format('Y-m-d') . '.xlsx'
            );
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
