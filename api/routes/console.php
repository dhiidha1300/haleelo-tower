<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

use Illuminate\Support\Facades\Schedule;

Schedule::command('leases:update-statuses')->dailyAt('00:05');
Schedule::command('leases:expiry-reminder')->dailyAt('08:00');
Schedule::command('invoices:generate-monthly')->monthlyOn(1, '07:00');
Schedule::command('invoices:reminder-check')->dailyAt('09:00');
Schedule::command('reports:monthly')->lastDayOfMonth('23:30');
