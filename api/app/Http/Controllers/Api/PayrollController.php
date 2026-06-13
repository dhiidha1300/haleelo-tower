<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Payslip;
use App\Models\PayrollRun;
use App\Services\AuditService;
use App\Services\PayrollService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class PayrollController extends Controller
{
    public function __construct(
        private PayrollService $payrollService,
        private AuditService $auditService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $query = PayrollRun::withCount('payslips');
        if ($request->filled('status')) $query->where('status', $request->input('status'));

        $paginator = $query->latest()->paginate(25);
        $paginator->getCollection()->transform(fn ($r) => [
            'id'            => $r->id,
            'run_code'      => $r->run_code,
            'month'         => $r->month,
            'department'    => $r->department_filter,
            'total_gross'   => $r->total_gross,
            'total_net'     => $r->total_net,
            'status'        => $r->status,
            'payslips_count'=> $r->payslips_count,
            'finalized_at'  => $r->finalized_at?->toDateString(),
        ]);

        return response()->json($paginator);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'month'      => 'required|string', // YYYY-MM
            'department' => 'nullable|in:internal_staff,maintenance,cafeteria',
        ]);

        // prevent duplicate draft for same month+department
        $exists = PayrollRun::where('month', $request->month)
            ->where('department_filter', $request->input('department'))
            ->where('status', '!=', 'voided')->exists();
        if ($exists) {
            return response()->json(['error' => 'Validation Error', 'message' => 'A payroll run already exists for this month and department.'], 422);
        }

        $run = $this->payrollService->createRun($request->month, $request->input('department'), Auth::user());
        $this->auditService->log('created', PayrollRun::class, (int) $run->id, null, ['month' => $run->month]);

        return response()->json($this->show($run)->getData(), 201);
    }

    public function show(PayrollRun $payrollRun): JsonResponse
    {
        $payrollRun->load(['payslips.employee', 'paymentAccount', 'createdBy']);

        return response()->json(array_merge($payrollRun->toArray(), [
            'payslips' => $payrollRun->payslips->map(fn ($p) => [
                'id'                    => $p->id,
                'payslip_code'          => $p->payslip_code,
                'employee'              => $p->employee?->full_name,
                'department'            => $p->employee?->department,
                'employment_type'       => $p->employee?->employment_type,
                'working_days_in_month' => $p->working_days_in_month,
                'days_worked'           => $p->days_worked,
                'base_pay'              => $p->base_pay,
                'overtime_pay'          => $p->overtime_pay,
                'gross_pay'             => $p->gross_pay,
                'total_deductions'      => $p->total_deductions,
                'net_pay'               => $p->net_pay,
                'pdf_file_url'          => $p->pdf_file_url,
            ]),
        ]));
    }

    public function updatePayslip(Request $request, Payslip $payslip): JsonResponse
    {
        $request->validate([
            'days_worked'      => 'nullable|integer|min:0|max:31',
            'overtime_pay'     => 'nullable|numeric|min:0',
            'total_deductions' => 'nullable|numeric|min:0',
        ]);

        try {
            $payslip = $this->payrollService->updatePayslip($payslip, $request->all());
            return response()->json($payslip);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['error' => 'Validation Error', 'message' => $e->getMessage()], 422);
        }
    }

    public function payslipItems(Payslip $payslip): JsonResponse
    {
        return response()->json($this->payrollService->payslipItems($payslip));
    }

    public function addOvertime(Request $request, Payslip $payslip): JsonResponse
    {
        $request->validate([
            'date'            => 'required|date',
            'hours'           => 'required|numeric|min:0.01',
            'rate_multiplier' => 'nullable|numeric|min:1',
            'total_amount'    => 'required|numeric|min:0.01',
        ]);
        try {
            return response()->json($this->payrollService->addOvertime($payslip, $request->all()));
        } catch (\InvalidArgumentException $e) {
            return response()->json(['error' => 'Validation Error', 'message' => $e->getMessage()], 422);
        }
    }

    public function removeOvertime(Payslip $payslip, int $overtimeId): JsonResponse
    {
        return response()->json($this->payrollService->removeOvertime($payslip, $overtimeId));
    }

    public function addDeduction(Request $request, Payslip $payslip): JsonResponse
    {
        $request->validate([
            'type'        => 'required|in:absence,advance,disciplinary,other',
            'amount'      => 'required|numeric|min:0.01',
            'description' => 'nullable|string',
        ]);
        try {
            return response()->json($this->payrollService->addDeduction($payslip, $request->all()));
        } catch (\InvalidArgumentException $e) {
            return response()->json(['error' => 'Validation Error', 'message' => $e->getMessage()], 422);
        }
    }

    public function removeDeduction(Payslip $payslip, int $deductionId): JsonResponse
    {
        return response()->json($this->payrollService->removeDeduction($payslip, $deductionId));
    }

    public function finalize(Request $request, PayrollRun $payrollRun): JsonResponse
    {
        $request->validate(['payment_account_id' => 'required|exists:accounts,id']);

        try {
            $run = $this->payrollService->finalizeRun($payrollRun, (int) $request->input('payment_account_id'), Auth::user());
            $this->auditService->log('updated', PayrollRun::class, (int) $run->id, ['status' => 'draft'], ['status' => 'finalized']);
            return response()->json($this->show($run)->getData());
        } catch (\InvalidArgumentException $e) {
            return response()->json(['error' => 'Validation Error', 'message' => $e->getMessage()], 422);
        }
    }

    public function void(PayrollRun $payrollRun): JsonResponse
    {
        try {
            $run = $this->payrollService->voidRun($payrollRun, Auth::user());
            $this->auditService->log('updated', PayrollRun::class, (int) $run->id, ['status' => 'finalized'], ['status' => 'voided']);
            return response()->json($run);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['error' => 'Validation Error', 'message' => $e->getMessage()], 422);
        }
    }

    public function payslipPdf(Payslip $payslip)
    {
        $pdf = $this->payrollService->generatePayslipPdf($payslip);
        return response($pdf, 200, [
            'Content-Type'        => 'application/pdf',
            'Content-Disposition' => 'inline; filename="' . $payslip->payslip_code . '.pdf"',
        ]);
    }
}
