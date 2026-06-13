<?php

namespace Database\Seeders;

use App\Models\Floor;
use Illuminate\Database\Seeder;

class FloorSeeder extends Seeder
{
    public function run(): void
    {
        $floors = [
            ['name' => 'Basement',     'level' => -1, 'description' => 'Educational facility — entire floor leased to one university tenant. Furnished with projectors, whiteboards, and lab equipment.'],
            ['name' => 'Ground Floor', 'level' =>  0, 'description' => 'Ten individual rentable office rooms. Each independently bookable. Billed monthly.'],
            ['name' => '1st Floor',    'level' =>  1, 'description' => 'Three private offices and Hall A (50-seat conference hall).'],
            ['name' => '2nd Floor',    'level' =>  2, 'description' => 'Two private offices and Hall B (100-seat conference hall).'],
            ['name' => '3rd Floor',    'level' =>  3, 'description' => 'Hall C — the primary event space (500-seat). Used for large corporate events, conferences, and ceremonies.'],
        ];

        foreach ($floors as $floor) {
            Floor::firstOrCreate(['level' => $floor['level']], $floor);
        }
    }
}
