<?php

namespace App\Console\Commands;

use App\Services\LeaseService;
use Illuminate\Console\Command;

class LeaseExpiryReminder extends Command
{
    protected $signature   = 'leases:expiry-reminder';
    protected $description = 'Send renewal reminders for leases expiring in 10 days';

    public function handle(LeaseService $leaseService): int
    {
        $count = $leaseService->sendRenewalReminders();
        $this->info("Sent renewal reminder for {$count} lease(s).");

        return Command::SUCCESS;
    }
}
