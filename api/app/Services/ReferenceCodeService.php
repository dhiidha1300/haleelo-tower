<?php

namespace App\Services;

use App\Models\ReferenceSequence;
use Illuminate\Support\Facades\DB;

class ReferenceCodeService
{
    public function generate(string $prefix): string
    {
        $year = now()->year;

        return DB::transaction(function () use ($prefix, $year) {
            $seq = ReferenceSequence::where('prefix', $prefix)
                ->where('year', $year)
                ->lockForUpdate()
                ->first();

            if (!$seq) {
                $seq = ReferenceSequence::create([
                    'prefix'        => $prefix,
                    'year'          => $year,
                    'last_sequence' => 0,
                ]);
            }

            $seq->increment('last_sequence');
            $seq->refresh();

            return sprintf('%s-%d-%04d', $prefix, $year, $seq->last_sequence);
        });
    }
}
