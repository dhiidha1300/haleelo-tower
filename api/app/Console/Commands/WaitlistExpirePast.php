<?php

namespace App\Console\Commands;

use App\Services\WaitlistService;
use Illuminate\Console\Command;

class WaitlistExpirePast extends Command
{
    protected $signature   = 'waitlist:expire-past';
    protected $description = 'Delete waiting-list entries whose slot date has passed';

    public function handle(WaitlistService $waitlist): int
    {
        $count = $waitlist->expirePast();
        $this->info("Deleted {$count} past-dated waiting-list entr(y/ies).");

        return Command::SUCCESS;
    }
}
