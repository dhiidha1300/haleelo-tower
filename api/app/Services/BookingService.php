<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\BookingStatusLog;
use App\Models\Space;
use App\Models\SystemSetting;
use App\Models\User;
use App\Models\WaitingList;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class BookingService
{
    public function __construct(
        private ReferenceCodeService $refService,
        private AuditService $auditService
    ) {}

    public function createBooking(array $data, ?User $createdBy = null): Booking
    {
        $space = Space::findOrFail($data['product_id']);

        $sessionTimes = $this->resolveSessionTimes($data);

        $booking = Booking::create([
            'booking_code'       => $this->refService->generate('BK'),
            'type'               => $data['type'] ?? $this->inferType($space),
            'product_id'         => $space->id,
            'client_name'        => $data['client_name'],
            'client_company'     => $data['client_company'] ?? null,
            'client_email'       => $data['client_email'],
            'client_phone'       => $data['client_phone'],
            'client_national_id' => $data['client_national_id'] ?? null,
            'session_type'       => $data['session_type'],
            'booking_date'       => $data['booking_date'],
            'start_time'         => $sessionTimes['start'],
            'end_time'           => $sessionTimes['end'],
            'recurring'          => $data['recurring'] ?? false,
            'recurrence_rule'    => $data['recurrence_rule'] ?? null,
            'catering_package_id'     => $data['catering_package_id'] ?? null,
            'dj_requested'            => $data['dj_requested'] ?? false,
            'cameraman_requested'     => $data['cameraman_requested'] ?? false,
            'base_price'         => $data['base_price'] ?? $space->base_price,
            'catering_price'     => $data['catering_price'] ?? 0,
            'dj_price'           => $data['dj_price'] ?? 0,
            'cameraman_price'    => $data['cameraman_price'] ?? 0,
            'extras_price'       => $data['extras_price'] ?? 0,
            'total_price'        => $this->calcTotal($data),
            'status'             => 'draft',
            'payment_status'     => 'unpaid',
            'notes'              => $data['notes'] ?? null,
            'created_by_user_id' => $createdBy?->id,
        ]);

        $this->logStatusChange($booking, null, 'draft', $createdBy);

        if ($createdBy) {
            $this->auditService->log('created', Booking::class, (int) $booking->id, null, $booking->toArray());

            // When staff creates a booking it goes directly to admin_pending (not draft)
            // Draft is reserved for public website form submissions (no createdBy)
            $booking->update(['status' => 'admin_pending']);
            $this->logStatusChange($booking, 'draft', 'admin_pending', $createdBy, 'Submitted for admin review on creation');
        }

        // Send booking acknowledgement to the client (fails gracefully if unconfigured)
        try {
            dispatch(new \App\Jobs\SendBookingNotificationJob($booking->fresh(), 'acknowledged'));
        } catch (\Exception $e) {
            Log::error('Failed to dispatch booking acknowledgement', ['booking_id' => $booking->id, 'error' => $e->getMessage()]);
        }

        // Dispatch recurring occurrences job if this is a recurring booking
        if ($booking->recurring && !empty($booking->recurrence_rule)) {
            dispatch(new \App\Jobs\CreateRecurringBookingsJob($booking->fresh()));
        }

        return $booking->fresh();
    }

    public function cancelSeries(Booking $booking, User $user, string $scope): int
    {
        $groupId = $booking->recurrence_group_id ?? $booking->id;

        $query = Booking::where(function ($q) use ($groupId, $booking) {
            $q->where('recurrence_group_id', $groupId)
              ->orWhere('id', $groupId);
        })->whereNotIn('status', ['cancelled', 'rejected']);

        if ($scope === 'future') {
            $query->whereDate('booking_date', '>=', now()->toDateString());
        }

        $affected = $query->get();
        foreach ($affected as $occurrence) {
            $occurrence->update(['status' => 'cancelled']);
            $this->logStatusChange($occurrence, $occurrence->status, 'cancelled', $user, 'Recurring series cancellation');
        }

        return $affected->count();
    }

    public function transition(Booking $booking, string $newStatus, ?User $user, ?string $notes = null, ?string $rejectionReason = null): Booking
    {
        $this->validateTransition($booking->status, $newStatus, $user);

        $old = $booking->status;

        $update = ['status' => $newStatus];
        if ($rejectionReason) {
            $update['rejection_reason'] = $rejectionReason;
        }

        $booking->update($update);
        $this->logStatusChange($booking, $old, $newStatus, $user, $notes);

        if ($user) {
            $this->auditService->log('updated', Booking::class, (int) $booking->id, ['status' => $old], ['status' => $newStatus]);
        }

        if ($newStatus === 'cancelled' || $newStatus === 'rejected') {
            $this->notifyWaitingList($booking);
        }

        // On final approval, auto-create the conference-hall invoice (draft).
        if ($newStatus === 'booking_approved' && $booking->type === 'conference_hall') {
            try {
                app(\App\Services\InvoiceService::class)->createForBooking($booking->fresh(['product', 'cateringPackage']), $user);
            } catch (\Exception $e) {
                Log::error('Failed to auto-create invoice for booking', ['booking_id' => $booking->id, 'error' => $e->getMessage()]);
            }
        }

        // Notify the client on key status changes (job fails gracefully if WhatsApp/email unconfigured)
        $clientEvents = [
            'booking_approved' => 'approved',
            'rejected'         => 'rejected',
            'cancelled'        => 'cancelled',
        ];
        if (isset($clientEvents[$newStatus])) {
            try {
                dispatch(new \App\Jobs\SendBookingNotificationJob($booking->fresh(), $clientEvents[$newStatus]));
            } catch (\Exception $e) {
                Log::error('Failed to dispatch booking notification', ['booking_id' => $booking->id, 'error' => $e->getMessage()]);
            }
        }

        return $booking->fresh(['product', 'statusLogs.changedBy', 'cateringPackage']);
    }

    public function checkAvailability(int $productId, string $sessionType, string $date, string $startTime, string $endTime, ?int $excludeBookingId = null): bool
    {
        $query = Booking::where('product_id', $productId)
            ->whereDate('booking_date', $date)
            ->whereNotIn('status', ['rejected', 'cancelled', 'waitlisted'])
            ->where(function ($q) use ($startTime, $endTime) {
                $q->where(function ($inner) use ($startTime, $endTime) {
                    $inner->where('start_time', '<', $endTime)
                          ->where('end_time', '>', $startTime);
                });
            });

        if ($excludeBookingId) {
            $query->where('id', '!=', $excludeBookingId);
        }

        return $query->doesntExist();
    }

    public function addToWaitingList(array $data): WaitingList
    {
        return WaitingList::create([
            'product_id'   => $data['product_id'],
            'session_type' => $data['session_type'],
            'booking_date' => $data['booking_date'],
            'client_name'  => $data['client_name'],
            'client_email' => $data['client_email'],
            'client_phone' => $data['client_phone'],
        ]);
    }

    public function notifyWaitingList(Booking $booking): void
    {
        $next = WaitingList::where('product_id', $booking->product_id)
            ->where('session_type', $booking->session_type)
            ->whereDate('booking_date', $booking->booking_date)
            ->where('notified', false)
            ->orderBy('created_at')
            ->first();

        if (!$next) return;

        try {
            dispatch(new \App\Jobs\SendWaitingListNotificationJob($next, $booking));
        } catch (\Exception $e) {
            Log::error('Failed to dispatch waiting list notification', ['error' => $e->getMessage()]);
        }
    }

    public function getBookingWithDetails(Booking $booking): array
    {
        $booking->load(['product.floor', 'statusLogs.changedBy', 'cateringPackage', 'createdBy']);

        // Per-event P&L: revenue from the linked invoice − expenses linked to this booking
        $invoice = \App\Models\Invoice::where('booking_id', $booking->id)->whereNull('deleted_at')->first();
        $revenue = (string) ($invoice?->total_amount ?? '0');

        $expenses = \App\Models\Expense::where('booking_id', $booking->id)
            ->whereNull('deleted_at')
            ->get(['expense_code', 'description', 'amount']);
        $expenseTotal = (string) $expenses->sum('amount');

        return array_merge($booking->toArray(), [
            'event_financials' => [
                'invoice_code'  => $invoice?->invoice_code,
                'invoice_id'    => $invoice?->id,
                'revenue'       => $revenue,
                'expense_total' => $expenseTotal,
                'net_profit'    => bcsub($revenue, $expenseTotal, 2),
                'expenses'      => $expenses,
            ],
        ]);
    }

    private function resolveSessionTimes(array $data): array
    {
        if ($data['session_type'] === 'custom') {
            return ['start' => $data['start_time'], 'end' => $data['end_time']];
        }

        $map = [
            'morning'   => ['session_morning_start',   'session_morning_end'],
            'afternoon' => ['session_afternoon_start',  'session_afternoon_end'],
            'evening'   => ['session_evening_start',    'session_evening_end'],
        ];

        [$startKey, $endKey] = $map[$data['session_type']] ?? ['start_time', 'end_time'];

        return [
            'start' => SystemSetting::get($startKey, $data['start_time'] ?? '08:00'),
            'end'   => SystemSetting::get($endKey,   $data['end_time']   ?? '13:00'),
        ];
    }

    private function calcTotal(array $data): string
    {
        return bcadd(
            bcadd(
                bcadd((string)($data['base_price'] ?? 0), (string)($data['catering_price'] ?? 0), 2),
                bcadd((string)($data['dj_price'] ?? 0), (string)($data['cameraman_price'] ?? 0), 2),
                2
            ),
            (string)($data['extras_price'] ?? 0),
            2
        );
    }

    private function inferType(Space $space): string
    {
        return match ($space->type) {
            'conference_hall'   => 'conference_hall',
            'educational_space' => 'educational_lease',
            default             => 'office_lease',
        };
    }

    private function logStatusChange(Booking $booking, ?string $from, string $to, ?User $user, ?string $notes = null): void
    {
        BookingStatusLog::create([
            'booking_id'          => $booking->id,
            'from_status'         => $from,
            'to_status'           => $to,
            'changed_by_user_id'  => $user?->id,
            'notes'               => $notes,
        ]);
    }

    private function validateTransition(string $current, string $new, ?User $user): void
    {
        $allowed = [
            'draft'               => ['admin_pending', 'cancelled'],
            'admin_pending'       => ['accountant_pending', 'rejected', 'cancelled'],
            'accountant_pending'  => ['booking_approved', 'rejected', 'cancelled'],
            'booking_approved'    => ['cancelled', 'rescheduled'],
            'waitlisted'          => ['draft', 'cancelled'],
        ];

        if (!isset($allowed[$current]) || !in_array($new, $allowed[$current])) {
            throw new \InvalidArgumentException("Cannot transition booking from '{$current}' to '{$new}'.");
        }
    }
}
