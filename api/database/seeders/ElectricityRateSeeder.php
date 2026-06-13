<?php

namespace Database\Seeders;

use App\Models\ElectricityRate;
use Illuminate\Database\Seeder;

class ElectricityRateSeeder extends Seeder
{
    public function run(): void
    {
        if (ElectricityRate::count() === 0) {
            ElectricityRate::create([
                'rate_per_kwh'   => '0.25',
                'effective_from' => '2026-01-01',
                'effective_to'   => null,
                'created_by'     => null,
            ]);
        }
    }
}
