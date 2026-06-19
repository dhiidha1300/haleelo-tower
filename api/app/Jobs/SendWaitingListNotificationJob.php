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
            // Templated, channel-aware "a spot opened" notice (email / WhatsApp per entry).
            app(\App\Services\WaitlistService::class)->notifySlotOpen($this->entry->load('product'));
        } catch (\Exception $e) {
            Log::error('SendWaitingListNotificationJob failed', [
                'waiting_list_id' => $this->entry->id,
                'error'           => $e->getMessage(),
            ]);
        }
    }
}
