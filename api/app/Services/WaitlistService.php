<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\SystemSetting;
use App\Models\User;
use App\Models\WaitingList;
use Illuminate\Support\Facades\Log;

/**
 * Waiting-list management (manual + on-no-availability). Per-slot capacity limit
 * (Super Admin/Admin can override), per-entry email/WhatsApp templated notices,
 * staff cancellation, manual conversion to a booking, and auto-expiry of past slots.
 */
class WaitlistService
{
    public function __construct(
        private BookingService $bookings,
        private WhatsAppService $whatsapp,
        private EmailService $email,
        private AuditService $audit
    ) {}

    public function limit(): int
    {
        return (int) SystemSetting::get('waitlist_limit', 3);
    }

    public function countWaiting(int $productId, string $session, string $date): int
    {
        return WaitingList::where('product_id', $productId)
            ->where('session_type', $session)
            ->whereDate('booking_date', $date)
            ->where('status', 'waiting')->count();
    }

    /** Register a customer on the waiting list. Throws if the slot is full (unless override). */
    public function add(array $data, User $user): WaitingList
    {
        $count    = $this->countWaiting((int) $data['product_id'], $data['session_type'], $data['booking_date']);
        $override = $user->hasRole('super_admin') || $user->hasRole('admin');

        if ($count >= $this->limit() && !$override) {
            throw new \RuntimeException("This slot's waiting list is full ({$this->limit()} max). Only an admin can add beyond the limit.");
        }

        $entry = WaitingList::create([
            'product_id'     => $data['product_id'],
            'session_type'   => $data['session_type'],
            'booking_date'   => $data['booking_date'],
            'client_name'    => $data['client_name'],
            'client_email'   => $data['client_email'] ?? null,
            'client_phone'   => $data['client_phone'] ?? null,
            'status'         => 'waiting',
            'notify_channel' => $data['notify_channel'] ?? 'email',
            'position'       => $count + 1,
            'created_by'     => $user->id,
            'notes'          => $data['notes'] ?? null,
        ]);

        $this->notifyJoined($entry->load('product'));

        return $entry;
    }

    public function cancel(WaitingList $entry): WaitingList
    {
        $entry->update(['status' => 'cancelled']);
        return $entry;
    }

    /** Convert a waiting-list entry into a booking (the slot must now be free). */
    public function convert(WaitingList $entry, User $user): Booking
    {
        if ($entry->status !== 'waiting') {
            throw new \RuntimeException('Only an active waiting-list entry can be converted.');
        }

        $space = $entry->product;
        $booking = $this->bookings->createBooking([
            'product_id'   => $entry->product_id,
            'client_name'  => $entry->client_name,
            'client_email' => $entry->client_email ?? '',
            'client_phone' => $entry->client_phone ?? '',
            'session_type' => $entry->session_type,
            'booking_date' => $entry->booking_date->toDateString(),
            'base_price'   => $space?->base_price ?? 0,
        ], $user);

        $entry->update(['status' => 'converted', 'converted_booking_id' => $booking->id]);

        return $booking;
    }

    /**
     * Remove waiting-list entries whose slot date has passed — there's nothing to wait
     * for once the date is gone. Also sweeps up any legacy 'expired' rows left over from
     * before this was a hard delete. Returns the number of entries removed.
     */
    public function expirePast(): int
    {
        $stale = WaitingList::whereIn('status', ['waiting', 'expired'])
            ->whereDate('booking_date', '<', now()->toDateString())
            ->get();

        foreach ($stale as $entry) {
            $this->audit->log('deleted', WaitingList::class, $entry->id, $entry->toArray(), null);
            $entry->delete();
        }

        return $stale->count();
    }

    /** Confirmation when a customer joins the waiting list. */
    public function notifyJoined(WaitingList $entry): void
    {
        $space = $entry->product?->name ?? 'the space';
        $date  = $entry->booking_date?->format('d M Y');
        $sess  = ucfirst($entry->session_type);

        $this->dispatch($entry, 'waitlist_added',
            [$entry->client_name, $space, $date, $sess, (string) $entry->position],
            "Waiting list confirmed — {$space}",
            "You're on the waiting list for {$space} on {$date} ({$sess} session), position {$entry->position}. We'll notify you if a spot opens up."
        );

        $entry->update(['notified' => true, 'notified_at' => now()]);
    }

    /** Notify a customer that a spot has opened (booked slot freed up). */
    public function notifySlotOpen(WaitingList $entry): void
    {
        $space = $entry->product?->name ?? 'the space';
        $date  = $entry->booking_date?->format('d M Y');
        $sess  = ucfirst($entry->session_type);

        $this->dispatch($entry, 'waitlist_slot_open',
            [$entry->client_name, $space, $date, $sess],
            "A spot opened — {$space}",
            "Good news! A spot has opened for {$space} on {$date} ({$sess} session). Please contact Haleelo Tower to confirm your booking."
        );

        $entry->update(['slot_opened_at' => now()]);
    }

    /** Send via the entry's chosen channel(s); each side fails gracefully. */
    private function dispatch(WaitingList $entry, string $template, array $waParams, string $emailSubject, string $emailBody): void
    {
        $ch = $entry->notify_channel ?: 'email';

        if (in_array($ch, ['whatsapp', 'both'], true) && $entry->client_phone) {
            try { $this->whatsapp->sendTemplate($entry->client_phone, $template, $waParams); }
            catch (\Throwable $e) { Log::warning('Waitlist WhatsApp failed', ['id' => $entry->id, 'error' => $e->getMessage()]); }
        }
        if (in_array($ch, ['email', 'both'], true) && $entry->client_email) {
            try { $this->email->sendWaitlist($entry, $emailSubject, $emailBody); }
            catch (\Throwable $e) { Log::warning('Waitlist email failed', ['id' => $entry->id, 'error' => $e->getMessage()]); }
        }
    }
}
