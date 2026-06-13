<?php

namespace App\Jobs;

use App\Models\Booking;
use App\Services\BookingService;
use App\Services\ReferenceCodeService;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class CreateRecurringBookingsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function __construct(public Booking $booking) {}

    public function handle(ReferenceCodeService $refService): void
    {
        $rule = $this->booking->recurrence_rule;

        if (empty($rule) || empty($rule['end_date'])) return;

        $frequency = $rule['frequency'] ?? 'weekly';
        $endDate   = Carbon::parse($rule['end_date'])->endOfDay();
        $days      = array_map('strtolower', $rule['days'] ?? []);

        $dates = $this->generateDates(
            Carbon::parse($this->booking->booking_date)->addDay(),
            $endDate,
            $frequency,
            $days
        );

        foreach ($dates as $date) {
            try {
                $data = $this->booking->toArray();
                unset($data['id'], $data['booking_code'], $data['created_at'], $data['updated_at'], $data['deleted_at']);

                $data['booking_code']        = $refService->generate('BK');
                $data['booking_date']        = $date->toDateString();
                $data['status']              = 'admin_pending';
                $data['recurrence_group_id'] = $this->booking->recurrence_group_id ?? $this->booking->id;

                Booking::create($data);
            } catch (\Exception $e) {
                Log::error('CreateRecurringBookingsJob: failed to create occurrence', [
                    'parent_booking_id' => $this->booking->id,
                    'date'              => $date->toDateString(),
                    'error'             => $e->getMessage(),
                ]);
            }
        }

        // Set group ID on parent if not already set
        if (!$this->booking->recurrence_group_id) {
            $this->booking->update(['recurrence_group_id' => $this->booking->id]);
        }
    }

    private function generateDates(Carbon $from, Carbon $until, string $frequency, array $days): array
    {
        $dates  = [];
        $cursor = $from->copy();

        if ($frequency === 'weekly') {
            // Walk day by day; include dates whose day-of-week name matches $days
            while ($cursor->lte($until)) {
                $dayName = strtolower($cursor->englishDayOfWeek);
                if (empty($days) || in_array($dayName, $days)) {
                    $dates[] = $cursor->copy();
                }
                $cursor->addDay();
            }
        } elseif ($frequency === 'monthly') {
            // Same day of month as parent booking
            $dayOfMonth = Carbon::parse($this->booking->booking_date)->day;
            while ($cursor->lte($until)) {
                $target = $cursor->copy()->day($dayOfMonth);
                if ($target->gte($from) && $target->lte($until)) {
                    $dates[] = $target;
                }
                $cursor->addMonthNoOverflow();
            }
        }

        return $dates;
    }
}
