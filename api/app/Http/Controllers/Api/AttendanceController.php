<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AttendanceLog;
use App\Models\Employee;
use App\Models\SystemSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AttendanceController extends Controller
{
    /** Attendance grid for a given month — one row per active employee. */
    public function index(Request $request): JsonResponse
    {
        $month = $request->input('month', now()->format('Y-m'));
        $defaultDays = (int) SystemSetting::get('working_days_per_month', 26);

        $rows = Employee::active()->orderBy('full_name')->get()->map(function ($emp) use ($month, $defaultDays) {
            $log = AttendanceLog::where('employee_id', $emp->id)->where('month', $month)->first();
            return [
                'employee_id'           => $emp->id,
                'employee_code'         => $emp->employee_code,
                'full_name'             => $emp->full_name,
                'department'            => $emp->department,
                'working_days_in_month' => $log->working_days_in_month ?? $defaultDays,
                'days_worked'           => $log->days_worked ?? $defaultDays,
                'days_absent'           => $log->days_absent ?? 0,
                'late_arrivals'         => $log->late_arrivals ?? 0,
                'logged'                => (bool) $log,
            ];
        });

        return response()->json(['month' => $month, 'rows' => $rows]);
    }

    /** Upsert one employee's attendance for a month. */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'employee_id'           => 'required|exists:employees,id',
            'month'                 => 'required|string',
            'working_days_in_month' => 'required|integer|min:1|max:31',
            'days_worked'           => 'required|integer|min:0|max:31',
            'days_absent'           => 'nullable|integer|min:0|max:31',
            'late_arrivals'         => 'nullable|integer|min:0',
        ]);

        $log = AttendanceLog::updateOrCreate(
            ['employee_id' => $request->input('employee_id'), 'month' => $request->input('month')],
            $request->only(['working_days_in_month', 'days_worked', 'days_absent', 'late_arrivals'])
        );

        return response()->json($log);
    }
}
