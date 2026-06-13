<?php

namespace App\Jobs;

use App\Models\Lease;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendLeaseRenewalReminderJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function __construct(public Lease $lease) {}

    public function handle(): void
    {
        try {
            $whatsapp = app(\App\Services\WhatsAppService::class);
            $email    = app(\App\Services\EmailService::class);

            $tenant  = $this->lease->tenant;
            $space   = $this->lease->space?->name ?? 'your space';
            $endDate = $this->lease->end_date?->format('d M Y');

            $message = "Hello {$tenant->contact_person_name}, your lease for {$space} expires on {$endDate}. Please contact us to discuss renewal.";

            if ($tenant?->phone) {
                $whatsapp->send($tenant->phone, $message);
            }
            if ($tenant?->email) {
                $email->sendLeaseRenewalReminder($this->lease);
            }
        } catch (\Exception $e) {
            Log::error('SendLeaseRenewalReminderJob failed', [
                'lease_id' => $this->lease->id,
                'error'    => $e->getMessage(),
            ]);
        }
    }
}
