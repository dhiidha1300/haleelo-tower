<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Space;
use App\Models\WaitingList;
use App\Services\BookingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class BookingController extends Controller
{
    public function __construct(private BookingService $bookingService) {}

    public function index(Request $request): JsonResponse
    {
        $query = Booking::with(['product.floor', 'createdBy', 'cateringPackage'])
            ->withoutTrashed();

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }
        if ($request->filled('type')) {
            $query->where('type', $request->input('type'));
        }
        if ($request->filled('product_id')) {
            $query->where('product_id', $request->input('product_id'));
        }
        if ($request->filled('date_from')) {
            $query->whereDate('booking_date', '>=', $request->input('date_from'));
        }
        if ($request->filled('date_to')) {
            $query->whereDate('booking_date', '<=', $request->input('date_to'));
        }
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('booking_code', 'like', "%$search%")
                  ->orWhere('client_name', 'like', "%$search%")
                  ->orWhere('client_email', 'like', "%$search%");
            });
        }

        $paginator = $query->latest('created_at')->paginate(25);

        return response()->json($paginator);
    }

    public function calendar(Request $request): JsonResponse
    {
        $query = Booking::with('product')
            ->whereNotIn('status', ['rejected', 'cancelled'])
            ->withoutTrashed();

        if ($request->filled('start')) {
            $query->whereDate('booking_date', '>=', $request->input('start'));
        }
        if ($request->filled('end')) {
            $query->whereDate('booking_date', '<=', $request->input('end'));
        }

        $statusColors = [
            'draft'               => '#9CA3AF',
            'admin_pending'       => '#F59E0B',
            'accountant_pending'  => '#F97316',
            'booking_approved'    => '#10B981',
            'waitlisted'          => '#8B5CF6',
            'rescheduled'         => '#6366F1',
        ];

        $events = $query->get()->map(fn ($b) => [
            'id'              => $b->id,
            'title'           => "{$b->client_name} — {$b->product?->name}",
            'start'           => $b->booking_date->toDateString() . 'T' . $b->start_time,
            'end'             => $b->booking_date->toDateString() . 'T' . $b->end_time,
            'backgroundColor' => $statusColors[$b->status] ?? '#1B2D4F',
            'borderColor'     => $statusColors[$b->status] ?? '#1B2D4F',
            'extendedProps'   => [
                'booking_code' => $b->booking_code,
                'status'       => $b->status,
                'session_type' => $b->session_type,
                'total_price'  => $b->total_price,
                'product_name' => $b->product?->name,
            ],
        ]);

        return response()->json($events);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'product_id'         => 'required|exists:spaces,id',
            'client_name'        => 'required|string|max:255',
            'client_email'       => 'required|email',
            'client_phone'       => 'required|string|max:20',
            'client_company'     => 'nullable|string|max:255',
            'client_national_id' => 'nullable|string|max:50',
            'session_type'       => 'required|in:morning,afternoon,evening,custom',
            'booking_date'       => 'required|date|after_or_equal:today',
            'start_time'         => 'required_if:session_type,custom|nullable|date_format:H:i',
            'end_time'           => 'required_if:session_type,custom|nullable|date_format:H:i|after:start_time',
            'recurring'          => 'boolean',
            'catering_package_id'    => 'nullable|exists:catering_packages,id',
            'dj_requested'           => 'boolean',
            'cameraman_requested'    => 'boolean',
            'base_price'         => 'nullable|numeric|min:0',
            'catering_price'     => 'nullable|numeric|min:0',
            'dj_price'           => 'nullable|numeric|min:0',
            'cameraman_price'    => 'nullable|numeric|min:0',
            'notes'              => 'nullable|string',
        ]);

        try {
            $booking = $this->bookingService->createBooking($request->all(), Auth::user());

            return response()->json($booking->load(['product.floor', 'statusLogs', 'cateringPackage']), 201);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Error', 'message' => $e->getMessage()], 422);
        }
    }

    public function show(Booking $booking): JsonResponse
    {
        return response()->json(
            $this->bookingService->getBookingWithDetails($booking)
        );
    }

    public function updateStatus(Request $request, Booking $booking): JsonResponse
    {
        $request->validate([
            'status'           => 'required|in:admin_pending,accountant_pending,booking_approved,rejected,cancelled,rescheduled',
            'notes'            => 'nullable|string',
            'rejection_reason' => 'required_if:status,rejected|nullable|string',
        ]);

        $newStatus = $request->input('status');
        $user      = Auth::user();

        // Gate: only finance role can move to booking_approved
        if ($newStatus === 'booking_approved' && !$user->hasPermissionTo('finance-approve-booking')) {
            return response()->json(['error' => 'Forbidden', 'message' => 'Only Finance can give final booking approval.'], 403);
        }

        // Gate: admin cannot move accountant_pending → booking_approved
        if ($newStatus === 'accountant_pending' && $booking->status !== 'admin_pending') {
            return response()->json(['error' => 'Validation Error', 'message' => 'Booking must be in Admin Pending status to move to Finance review.'], 422);
        }

        try {
            $updated = $this->bookingService->transition(
                $booking,
                $newStatus,
                $user,
                $request->input('notes'),
                $request->input('rejection_reason')
            );

            return response()->json($updated);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['error' => 'Validation Error', 'message' => $e->getMessage()], 422);
        }
    }

    public function checkAvailability(Request $request): JsonResponse
    {
        $request->validate([
            'product_id'   => 'required|exists:spaces,id',
            'session_type' => 'required|string',
            'booking_date' => 'required|date',
            'start_time'   => 'required|date_format:H:i',
            'end_time'     => 'required|date_format:H:i',
            'exclude_id'   => 'nullable|integer',
        ]);

        $available = $this->bookingService->checkAvailability(
            $request->integer('product_id'),
            $request->input('session_type'),
            $request->input('booking_date'),
            $request->input('start_time'),
            $request->input('end_time'),
            $request->input('exclude_id')
        );

        return response()->json(['available' => $available]);
    }

    public function waitingList(Request $request): JsonResponse
    {
        $query = WaitingList::with('product')
            ->orderBy('created_at');

        if ($request->filled('product_id')) {
            $query->where('product_id', $request->input('product_id'));
        }

        return response()->json($query->paginate(25));
    }

    public function addToWaitingList(Request $request): JsonResponse
    {
        $request->validate([
            'product_id'   => 'required|exists:spaces,id',
            'session_type' => 'required|string',
            'booking_date' => 'required|date',
            'client_name'  => 'required|string',
            'client_email' => 'required|email',
            'client_phone' => 'required|string',
        ]);

        $entry = $this->bookingService->addToWaitingList($request->all());

        return response()->json($entry, 201);
    }

    public function cancelSeries(Request $request, Booking $booking): JsonResponse
    {
        $request->validate([
            'scope' => 'required|in:single,future,all',
        ]);

        $scope = $request->input('scope');

        if ($scope === 'single') {
            try {
                $updated = $this->bookingService->transition($booking, 'cancelled', Auth::user(), 'Single occurrence cancelled');
                return response()->json(['message' => '1 booking cancelled.', 'booking' => $updated]);
            } catch (\InvalidArgumentException $e) {
                return response()->json(['error' => 'Validation Error', 'message' => $e->getMessage()], 422);
            }
        }

        $count = $this->bookingService->cancelSeries($booking, Auth::user(), $scope === 'all' ? 'all' : 'future');

        return response()->json(['message' => "{$count} booking(s) cancelled."]);
    }
}
