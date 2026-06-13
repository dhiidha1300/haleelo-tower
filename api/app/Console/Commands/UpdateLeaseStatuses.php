<?php

namespace App\Console\Commands;

use App\Services\LeaseService;
use Illuminate\Console\Command;

class UpdateLeaseStatuses extends Command
{
    protected $signature   = 'leases:update-statuses';
    protected $description = 'Set leases to expired where end_date < today';

    public function handle(LeaseService $leaseService): int
    {
        $count = $leaseService->updateLeaseStatuses();
        $this->info("Expired {$count} lease(s).");

        return Command::SUCCESS;
    }
}
