<?php

namespace App\Jobs;

use App\Models\Booking;
use App\Models\WaitingList;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendWaitingListNotificationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function __construct(public WaitingList $entry, public Booking $cancelledBooking) {}

    public function handle(): void
    {
        try {
            $whatsapp = app(\App\Services\WhatsAppService::class);

            $space   = $this->entry->product?->name ?? 'the space';
            $date    = $this->entry->booking_date?->format('d M Y');
            $session = ucfirst($this->entry->session_type);
            $message = "Hello {$this->entry->client_name}, a slot has opened for {$space} on {$date} ({$session}). Reply YES to secure your place within 24 hours.";

            if ($this->entry->client_phone) {
                $whatsapp->send($this->entry->client_phone, $message);
            }

            $this->entry->update([
                'notified'    => true,
                'notified_at' => now(),
            ]);
        } catch (\Exception $e) {
            Log::error('SendWaitingListNotificationJob failed', [
                'waiting_list_id' => $this->entry->id,
                'error'           => $e->getMessage(),
            ]);
        }
    }
}
