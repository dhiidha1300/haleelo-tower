<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Services\ReferenceCodeService;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class EmployeeController extends Controller
{
    public function __construct(
        private ReferenceCodeService $refService,
        private AuditService $auditService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $query = Employee::query();

        if ($request->filled('department')) $query->where('department', $request->input('department'));
        if ($request->filled('status'))     $query->where('status', $request->input('status'));
        if ($request->filled('search')) {
            $s = $request->input('search');
            $query->where(fn ($q) => $q->where('full_name', 'like', "%$s%")->orWhere('employee_code', 'like', "%$s%"));
        }

        return response()->json($query->orderBy('full_name')->paginate(50));
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'full_name'       => 'required|string|max:255',
            'job_title'       => 'nullable|string|max:255',
            'department'      => 'required|in:internal_staff,maintenance,cafeteria',
            'employment_type' => 'required|in:salaried,daily_rate',
            'base_salary'     => 'required_if:employment_type,salaried|nullable|numeric|min:0',
            'daily_rate'      => 'required_if:employment_type,daily_rate|nullable|numeric|min:0',
            'phone'           => 'nullable|string|max:20',
            'email'           => 'nullable|email',
            'start_date'      => 'nullable|date',
        ]);

        $employee = Employee::create(array_merge($request->all(), [
            'employee_code' => $this->refService->generate('EMP'),
            'status'        => 'active',
            // Coerce empty strings ('' from the unused field) to 0 for the not-null decimal columns
            'base_salary'   => (float) ($request->input('base_salary') ?: 0),
            'daily_rate'    => (float) ($request->input('daily_rate') ?: 0),
        ]));

        $this->auditService->log('created', Employee::class, (int) $employee->id, null, $employee->toArray());

        return response()->json($employee, 201);
    }

    public function show(Employee $employee): JsonResponse
    {
        return response()->json($employee->load(['leaveRequests', 'payslips.payrollRun']));
    }

    public function update(Request $request, Employee $employee): JsonResponse
    {
        $request->validate([
            'full_name'       => 'sometimes|string|max:255',
            'job_title'       => 'nullable|string|max:255',
            'department'      => 'sometimes|in:internal_staff,maintenance,cafeteria',
            'employment_type' => 'sometimes|in:salaried,daily_rate',
            'base_salary'     => 'nullable|numeric|min:0',
            'daily_rate'      => 'nullable|numeric|min:0',
            'phone'           => 'nullable|string|max:20',
            'email'           => 'nullable|email',
            'start_date'      => 'nullable|date',
            'status'          => 'sometimes|in:active,inactive',
        ]);

        $data = $request->all();
        // Coerce empty strings to 0 for the not-null decimal columns when present
        if ($request->has('base_salary')) $data['base_salary'] = (float) ($request->input('base_salary') ?: 0);
        if ($request->has('daily_rate'))  $data['daily_rate']  = (float) ($request->input('daily_rate') ?: 0);

        $employee->update($data);
        return response()->json($employee->fresh());
    }

    public function uploadContract(Request $request, Employee $employee): JsonResponse
    {
        $request->validate(['contract' => 'required|file|mimes:pdf,jpg,jpeg,png|max:10240']);
        $path = $request->file('contract')->store("employees/{$employee->id}/contract", 'public');
        $url  = Storage::disk('public')->url($path);
        $employee->update(['contract_file_url' => $url]);
        return response()->json(['contract_file_url' => $url]);
    }

    public function destroy(Employee $employee): JsonResponse
    {
        $employee->update(['status' => 'inactive']);
        $employee->delete();
        return response()->json(['message' => 'Employee deactivated.']);
    }
}
