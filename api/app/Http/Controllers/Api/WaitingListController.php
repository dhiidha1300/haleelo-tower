<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WaitingList;
use App\Services\AuditService;
use App\Services\WaitlistService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class WaitingListController extends Controller
{
    public function __construct(
        private WaitlistService $waitlist,
        private AuditService $audit
    ) {}

    public function index(Request $request): JsonResponse
    {
        $query = WaitingList::with(['product.floor', 'createdBy'])->latest();

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }
        if ($request->filled('product_id')) {
            $query->where('product_id', $request->input('product_id'));
        }

        $rows = $query->get()->map(fn ($w) => [
            'id'             => $w->id,
            'client_name'    => $w->client_name,
            'client_email'   => $w->client_email,
            'client_phone'   => $w->client_phone,
            'space'          => $w->product?->name,
            'floor'          => $w->product?->floor?->name,
            'booking_date'   => $w->booking_date?->toDateString(),
            'session_type'   => $w->session_type,
            'status'         => $w->status,
            'position'       => $w->position,
            'notify_channel' => $w->notify_channel,
            'notified'       => $w->notified,
            'slot_opened_at' => $w->slot_opened_at?->toDateTimeString(),
            'converted_booking_id' => $w->converted_booking_id,
            'created_by'     => $w->createdBy?->name,
            'created_at'     => $w->created_at?->toDateString(),
        ]);

        return response()->json(['waiting_list' => $rows, 'limit' => $this->waitlist->limit()]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'product_id'     => 'required|exists:spaces,id',
            'session_type'   => 'required|in:morning,afternoon,evening,custom',
            'booking_date'   => 'required|date',
            'client_name'    => 'required|string|max:255',
            'client_email'   => 'nullable|email',
            'client_phone'   => 'nullable|string|max:20',
            'notify_channel' => 'required|in:email,whatsapp,both',
            'notes'          => 'nullable|string',
        ]);

        try {
            $entry = $this->waitlist->add($request->all(), Auth::user());
            $this->audit->log('created', WaitingList::class, (int) $entry->id, null, $entry->toArray());
            return response()->json(['message' => 'Added to the waiting list.', 'entry' => $entry], 201);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage(), 'waitlist_full' => true], 422);
        }
    }

    public function cancel(WaitingList $waitingList): JsonResponse
    {
        $this->waitlist->cancel($waitingList);
        $this->audit->log('updated', WaitingList::class, (int) $waitingList->id, null, ['status' => 'cancelled']);
        return response()->json(['message' => 'Waiting-list entry cancelled.']);
    }

    public function convert(WaitingList $waitingList): JsonResponse
    {
        try {
            $booking = $this->waitlist->convert($waitingList, Auth::user());
            $this->audit->log('updated', WaitingList::class, (int) $waitingList->id, null, ['status' => 'converted', 'booking_id' => $booking->id]);
            return response()->json(['message' => 'Converted to booking ' . $booking->booking_code . '.', 'booking_id' => $booking->id]);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }
}
