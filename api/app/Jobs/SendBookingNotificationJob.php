<?php

namespace App\Jobs;

use App\Models\Booking;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendBookingNotificationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function __construct(public Booking $booking, public string $eventType) {}

    public function handle(): void
    {
        try {
            $whatsapp = app(\App\Services\WhatsAppService::class);
            $email    = app(\App\Services\EmailService::class);

            $message = $this->buildMessage();

            if ($this->booking->client_phone) {
                $whatsapp->send($this->booking->client_phone, $message);
            }
            if ($this->booking->client_email) {
                $email->sendBookingNotification($this->booking, $this->eventType, $message);
            }
        } catch (\Exception $e) {
            Log::error('SendBookingNotificationJob failed', [
                'booking_id' => $this->booking->id,
                'event'      => $this->eventType,
                'error'      => $e->getMessage(),
            ]);
        }
    }

    private function buildMessage(): string
    {
        $code  = $this->booking->booking_code;
        $space = $this->booking->product?->name ?? 'your space';
        $date  = $this->booking->booking_date?->format('d M Y');

        return match ($this->eventType) {
            'acknowledged' => "Hello {$this->booking->client_name}, your booking request {$code} for {$space} on {$date} has been received. We will confirm within 24 hours.",
            'approved'     => "Great news {$this->booking->client_name}! Your booking {$code} for {$space} on {$date} is confirmed. Total: \${$this->booking->total_price}.",
            'rejected'     => "Hello {$this->booking->client_name}, your booking {$code} for {$space} on {$date} was not approved. Reason: {$this->booking->rejection_reason}. Contact us to discuss alternatives.",
            'cancelled'    => "Hello {$this->booking->client_name}, your booking {$code} for {$space} on {$date} has been cancelled. Contact us for more information.",
            default        => "Your booking {$code} status has been updated to: {$this->booking->status}.",
        };
    }
}
