<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ChartOfAccount;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ChartOfAccountController extends Controller
{
    public function __construct(private AuditService $auditService) {}

    public function index(Request $request): JsonResponse
    {
        $accounts = ChartOfAccount::orderBy('code')->get()->map(fn ($a) => [
            'id'          => $a->id,
            'code'        => $a->code,
            'name'        => $a->name,
            'type'        => $a->type,
            'parent_id'   => $a->parent_id,
            'description' => $a->description,
            'active'      => $a->active,
            'is_system'   => $a->is_system,
            'balance'     => $a->balance(),
        ]);

        // Group by type for the UI
        $grouped = $accounts->groupBy('type');

        return response()->json([
            'accounts' => $accounts,
            'grouped'  => $grouped,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'code'        => 'required|string|max:20|unique:chart_of_accounts,code',
            'name'        => 'required|string|max:255',
            'type'        => 'required|in:asset,liability,equity,revenue,expense',
            'parent_id'   => 'nullable|exists:chart_of_accounts,id',
            'description' => 'nullable|string',
        ]);

        $account = ChartOfAccount::create([
            'code'        => $request->input('code'),
            'name'        => $request->input('name'),
            'type'        => $request->input('type'),
            'parent_id'   => $request->input('parent_id'),
            'description' => $request->input('description'),
            'active'      => true,
            'is_system'   => false,
        ]);

        $this->auditService->log('created', ChartOfAccount::class, (int) $account->id, null, $account->toArray());

        return response()->json($account, 201);
    }

    public function update(Request $request, ChartOfAccount $chartOfAccount): JsonResponse
    {
        // Only Super Admin may edit account codes (enforced by route middleware).
        $request->validate([
            'code'        => 'sometimes|string|max:20|unique:chart_of_accounts,code,' . $chartOfAccount->id,
            'name'        => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'active'      => 'sometimes|boolean',
        ]);

        $old = $chartOfAccount->toArray();
        $chartOfAccount->update($request->only(['code', 'name', 'description', 'active']));

        $this->auditService->log('updated', ChartOfAccount::class, (int) $chartOfAccount->id, $old, $chartOfAccount->fresh()->toArray());

        return response()->json($chartOfAccount->fresh());
    }

    public function destroy(ChartOfAccount $chartOfAccount): JsonResponse
    {
        if ($chartOfAccount->is_system) {
            return response()->json(['message' => 'System accounts cannot be deleted. Deactivate it instead.'], 422);
        }
        if ($chartOfAccount->journalLines()->exists()) {
            return response()->json(['message' => 'This account has journal activity and cannot be deleted. Deactivate it instead.'], 422);
        }

        $chartOfAccount->delete();
        return response()->json(['message' => 'Account deleted.']);
    }
}
