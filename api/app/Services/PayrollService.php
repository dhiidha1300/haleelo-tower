<?php

namespace App\Services;

use App\Models\Account;
use App\Models\AttendanceLog;
use App\Models\ChartOfAccount;
use App\Models\Employee;
use App\Models\Payslip;
use App\Models\PayrollRun;
use App\Models\SystemSetting;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PayrollService
{
    public function __construct(
        private ReferenceCodeService $refService,
        private AccountingService $accountingService
    ) {}

    /** Salary expense COA code by department. */
    private function deptExpenseCode(string $department): string
    {
        return match ($department) {
            'maintenance' => '4011',
            'cafeteria'   => '4012',
            default       => '4010', // internal_staff
        };
    }

    private function coaId(string $code): ?int
    {
        return ChartOfAccount::where('code', $code)->value('id');
    }

    /**
     * Create a draft payroll run, generating a draft payslip per active employee,
     * with days_worked pulled from that month's attendance (or working days default).
     */
    public function createRun(string $month, ?string $department, User $user): PayrollRun
    {
        return DB::transaction(function () use ($month, $department, $user) {
            $run = PayrollRun::create([
                'run_code'          => $this->refService->generate('PR'),
                'month'             => $month,
                'department_filter' => $department,
                'status'            => 'draft',
                'created_by'        => $user->id,
            ]);

            $defaultWorkingDays = (int) SystemSetting::get('working_days_per_month', 26);

            $employees = Employee::active()
                ->when($department, fn ($q) => $q->where('department', $department))
                ->get();

            foreach ($employees as $emp) {
                $attendance = AttendanceLog::where('employee_id', $emp->id)->where('month', $month)->first();
                $workingDays = $attendance->working_days_in_month ?? $defaultWorkingDays;
                $daysWorked  = $attendance->days_worked ?? $workingDays; // assume full month if no log

                $payslip = new Payslip([
                    'payslip_code'          => $this->refService->generate('PAY'),
                    'payroll_run_id'        => $run->id,
                    'employee_id'           => $emp->id,
                    'working_days_in_month' => $workingDays,
                    'days_worked'           => $daysWorked,
                    'overtime_pay'          => 0,
                    'total_deductions'      => 0,
                ]);
                $this->computePayslip($payslip, $emp);
                $payslip->save();
            }

            $this->recalcRun($run);
            return $run->load('payslips.employee');
        });
    }

    /** Apply the plan's net-pay formula to a payslip (without saving). */
    private function computePayslip(Payslip $p, Employee $emp): void
    {
        if ($emp->employment_type === 'daily_rate') {
            $base = bcmul((string) $emp->daily_rate, (string) $p->days_worked, 2);
        } else {
            $ratio = $p->working_days_in_month > 0 ? ($p->days_worked / $p->working_days_in_month) : 0;
            $base  = bcmul((string) $emp->base_salary, number_format($ratio, 6, '.', ''), 2);
        }

        $p->base_pay  = $base;
        $p->gross_pay = bcadd($base, (string) $p->overtime_pay, 2);
        $p->net_pay   = bcsub($p->gross_pay, (string) $p->total_deductions, 2);
    }

    /** Update a single draft payslip's days worked and recompute (overtime/deductions are itemized). */
    public function updatePayslip(Payslip $payslip, array $data): Payslip
    {
        if ($payslip->payrollRun->status !== 'draft') {
            throw new \InvalidArgumentException('Cannot edit a payslip in a finalized run.');
        }

        if (isset($data['days_worked'])) {
            $payslip->days_worked = $data['days_worked'];
        }
        $this->computePayslip($payslip, $payslip->employee);
        $payslip->save();

        $this->recalcRun($payslip->payrollRun);
        return $payslip->fresh('employee');
    }

    /** Add an itemized overtime record to a payslip's employee/run and recompute. */
    public function addOvertime(Payslip $payslip, array $data): Payslip
    {
        $this->assertDraft($payslip);

        \App\Models\OvertimeRecord::create([
            'employee_id'     => $payslip->employee_id,
            'payroll_run_id'  => $payslip->payroll_run_id,
            'date'            => $data['date'],
            'hours'           => $data['hours'],
            'rate_multiplier' => $data['rate_multiplier'] ?? 1.5,
            'total_amount'    => $data['total_amount'],
        ]);

        return $this->syncPayslipFromItems($payslip);
    }

    public function removeOvertime(Payslip $payslip, int $overtimeId): Payslip
    {
        $this->assertDraft($payslip);
        \App\Models\OvertimeRecord::where('id', $overtimeId)
            ->where('payroll_run_id', $payslip->payroll_run_id)
            ->where('employee_id', $payslip->employee_id)
            ->delete();
        return $this->syncPayslipFromItems($payslip);
    }

    public function addDeduction(Payslip $payslip, array $data): Payslip
    {
        $this->assertDraft($payslip);

        \App\Models\Deduction::create([
            'employee_id'    => $payslip->employee_id,
            'payroll_run_id' => $payslip->payroll_run_id,
            'type'           => $data['type'],
            'amount'         => $data['amount'],
            'description'    => $data['description'] ?? null,
        ]);

        return $this->syncPayslipFromItems($payslip);
    }

    public function removeDeduction(Payslip $payslip, int $deductionId): Payslip
    {
        $this->assertDraft($payslip);
        \App\Models\Deduction::where('id', $deductionId)
            ->where('payroll_run_id', $payslip->payroll_run_id)
            ->where('employee_id', $payslip->employee_id)
            ->delete();
        return $this->syncPayslipFromItems($payslip);
    }

    /** Itemized overtime + deductions for a payslip (employee + run scoped). */
    public function payslipItems(Payslip $payslip): array
    {
        return [
            'overtime' => \App\Models\OvertimeRecord::where('payroll_run_id', $payslip->payroll_run_id)
                ->where('employee_id', $payslip->employee_id)->orderBy('date')->get(),
            'deductions' => \App\Models\Deduction::where('payroll_run_id', $payslip->payroll_run_id)
                ->where('employee_id', $payslip->employee_id)->get(),
        ];
    }

    private function assertDraft(Payslip $payslip): void
    {
        if ($payslip->payrollRun->status !== 'draft') {
            throw new \InvalidArgumentException('Cannot edit a payslip in a finalized run.');
        }
    }

    /** Recompute a payslip's overtime_pay/total_deductions from its itemized records. */
    private function syncPayslipFromItems(Payslip $payslip): Payslip
    {
        $items = $this->payslipItems($payslip);
        $payslip->overtime_pay     = (string) $items['overtime']->sum('total_amount');
        $payslip->total_deductions = (string) $items['deductions']->sum('amount');
        $this->computePayslip($payslip, $payslip->employee);
        $payslip->save();

        $this->recalcRun($payslip->payrollRun);
        return $payslip->fresh('employee');
    }

    private function recalcRun(PayrollRun $run): void
    {
        $run->load('payslips');
        $run->update([
            'total_gross'      => (string) $run->payslips->sum('gross_pay'),
            'total_deductions' => (string) $run->payslips->sum('total_deductions'),
            'total_net'        => (string) $run->payslips->sum('net_pay'),
        ]);
    }

    /**
     * Finalize a run: post the payroll journal (Debit salary expense by dept,
     * Credit the paying cash account for total net), generate payslip PDFs,
     * dispatch delivery, and lock the run.
     */
    public function finalizeRun(PayrollRun $run, int $paymentAccountId, User $user): PayrollRun
    {
        if ($run->status !== 'draft') {
            throw new \InvalidArgumentException('Only draft runs can be finalized.');
        }
        $run->load('payslips.employee');
        if ($run->payslips->isEmpty()) {
            throw new \InvalidArgumentException('This run has no payslips.');
        }

        $account = Account::findOrFail($paymentAccountId);
        if (bccomp($account->balance(), (string) $run->total_net, 2) < 0) {
            throw new \InvalidArgumentException("Insufficient balance in {$account->name} (available: \${$account->balance()}).");
        }

        return DB::transaction(function () use ($run, $account, $user) {
            // Group net pay by department → salary expense accounts
            $byDept = $run->payslips->groupBy(fn ($p) => $p->employee->department);

            $lines = [];
            foreach ($byDept as $dept => $slips) {
                $deptNet = (string) $slips->sum('net_pay');
                if (bccomp($deptNet, '0', 2) <= 0) continue;
                $lines[] = ['account_id' => $this->coaId($this->deptExpenseCode($dept)), 'type' => 'debit', 'amount' => $deptNet, 'description' => "Salaries — {$dept}"];
            }
            $lines[] = ['account_id' => $account->chart_of_account_id, 'type' => 'credit', 'amount' => $run->total_net, 'description' => "Payroll {$run->run_code} paid from {$account->name}"];

            $entry = $this->accountingService->postJournalEntry(
                now()->toDateString(),
                "Payroll {$run->run_code} for {$run->month}",
                $lines,
                'auto',
                $run->run_code,
                $user
            );

            $run->update([
                'status'             => 'finalized',
                'payment_account_id' => $account->id,
                'journal_entry_id'   => $entry->id,
                'finalized_at'       => now(),
            ]);

            // Generate payslip PDFs + dispatch delivery (graceful if unconfigured)
            foreach ($run->payslips as $slip) {
                try {
                    $pdf  = $this->generatePayslipPdf($slip);
                    $path = "payslips/{$slip->payslip_code}.pdf";
                    \Illuminate\Support\Facades\Storage::disk('public')->put($path, $pdf);
                    $slip->update(['pdf_file_url' => \Illuminate\Support\Facades\Storage::disk('public')->url($path)]);

                    dispatch(new \App\Jobs\SendPayslipJob($slip->fresh('employee')));
                } catch (\Exception $e) {
                    Log::error('Payslip generation/delivery failed', ['payslip_id' => $slip->id, 'error' => $e->getMessage()]);
                }
            }

            return $run->fresh(['payslips.employee', 'paymentAccount']);
        });
    }

    /** Void a finalized run with a reversing journal entry. */
    public function voidRun(PayrollRun $run, User $user): PayrollRun
    {
        if ($run->status !== 'finalized') {
            throw new \InvalidArgumentException('Only finalized runs can be voided.');
        }

        return DB::transaction(function () use ($run, $user) {
            $run->load('payslips.employee', 'paymentAccount');
            $account = $run->paymentAccount;

            // Reverse the original entry: Credit salary expense, Debit cash
            $byDept = $run->payslips->groupBy(fn ($p) => $p->employee->department);
            $lines = [];
            foreach ($byDept as $dept => $slips) {
                $deptNet = (string) $slips->sum('net_pay');
                if (bccomp($deptNet, '0', 2) <= 0) continue;
                $lines[] = ['account_id' => $this->coaId($this->deptExpenseCode($dept)), 'type' => 'credit', 'amount' => $deptNet, 'description' => "Reverse salaries — {$dept}"];
            }
            $lines[] = ['account_id' => $account->chart_of_account_id, 'type' => 'debit', 'amount' => $run->total_net, 'description' => "Reverse payroll {$run->run_code}"];

            $this->accountingService->postJournalEntry(
                now()->toDateString(),
                "VOID Payroll {$run->run_code}",
                $lines,
                'auto',
                $run->run_code . '-VOID',
                $user
            );

            $run->update(['status' => 'voided']);
            return $run->fresh();
        });
    }

    public function generatePayslipPdf(Payslip $slip): string
    {
        $slip->loadMissing('employee', 'payrollRun');
        $building = [
            'name'    => SystemSetting::get('building_name', 'Haleelo Tower'),
            'address' => SystemSetting::get('address', 'Mogadishu, Somalia'),
        ];
        return \Barryvdh\DomPDF\Facade\Pdf::loadView('pdfs.payslip', compact('slip', 'building'))->output();
    }
}
