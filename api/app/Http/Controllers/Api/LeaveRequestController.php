<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LeaveRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class LeaveRequestController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = LeaveRequest::with(['employee', 'approver']);
        if ($request->filled('status')) $query->where('status', $request->input('status'));
        if ($request->filled('employee_id')) $query->where('employee_id', $request->input('employee_id'));

        $paginator = $query->latest()->paginate(25);
        $paginator->getCollection()->transform(fn ($l) => [
            'id'          => $l->id,
            'employee'    => $l->employee?->full_name,
            'leave_type'  => $l->leave_type,
            'start_date'  => $l->start_date?->toDateString(),
            'end_date'    => $l->end_date?->toDateString(),
            'days_count'  => $l->days_count,
            'status'      => $l->status,
            'reason'      => $l->reason,
            'approved_by' => $l->approver?->name,
        ]);

        return response()->json($paginator);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'leave_type'  => 'required|in:annual,sick,unpaid',
            'start_date'  => 'required|date',
            'end_date'    => 'required|date|after_or_equal:start_date',
            'reason'      => 'nullable|string',
        ]);

        $days = \Carbon\Carbon::parse($request->start_date)->diffInDays(\Carbon\Carbon::parse($request->end_date)) + 1;

        $leave = LeaveRequest::create(array_merge($request->all(), [
            'days_count' => $days,
            'status'     => 'pending',
        ]));

        return response()->json($leave->load('employee'), 201);
    }

    public function show(LeaveRequest $leaveRequest): JsonResponse
    {
        $leaveRequest->load(['employee', 'approver']);

        return response()->json([
            'id'            => $leaveRequest->id,
            'leave_type'    => $leaveRequest->leave_type,
            'start_date'    => $leaveRequest->start_date?->toDateString(),
            'end_date'      => $leaveRequest->end_date?->toDateString(),
            'days_count'    => $leaveRequest->days_count,
            'status'        => $leaveRequest->status,
            'reason'        => $leaveRequest->reason,
            'approved_by'   => $leaveRequest->approver?->name,
            'created_at'    => $leaveRequest->created_at?->toDateTimeString(),
            'employee'      => [
                'id'         => $leaveRequest->employee?->id,
                'full_name'  => $leaveRequest->employee?->full_name,
                'employee_code' => $leaveRequest->employee?->employee_code,
                'job_title'  => $leaveRequest->employee?->job_title,
                'department' => $leaveRequest->employee?->department,
            ],
        ]);
    }

    public function decision(Request $request, LeaveRequest $leaveRequest): JsonResponse
    {
        $request->validate(['status' => 'required|in:approved,rejected']);

        $leaveRequest->update([
            'status'      => $request->input('status'),
            'approved_by' => Auth::id(),
        ]);

        return response()->json($leaveRequest->fresh(['employee', 'approver']));
    }
}
