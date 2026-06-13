<?php

namespace Database\Seeders;

use App\Models\Floor;
use App\Models\Space;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class SpaceSeeder extends Seeder
{
    public function run(): void
    {
        $basement = Floor::where('level', -1)->first();
        $ground   = Floor::where('level',  0)->first();
        $floor1   = Floor::where('level',  1)->first();
        $floor2   = Floor::where('level',  2)->first();
        $floor3   = Floor::where('level',  3)->first();

        $spaces = [
            // Basement — Educational
            ['name' => 'Educational Facility', 'type' => 'educational_space', 'floor_id' => $basement->id, 'capacity' => null,  'base_price' => 0, 'price_unit' => 'per_semester', 'amenities' => ['projector','whiteboard','lab_equipment','AC','WiFi'], 'description' => 'Full basement floor leased to a single university tenant. Fully furnished with projectors, whiteboards, and laboratory equipment.'],

            // Ground Floor — 10 Offices
            ['name' => 'Office 01', 'type' => 'office_space', 'floor_id' => $ground->id, 'capacity' => null, 'base_price' => 0, 'price_unit' => 'per_month', 'amenities' => ['AC','WiFi'], 'description' => 'Private office on Ground Floor.'],
            ['name' => 'Office 02', 'type' => 'office_space', 'floor_id' => $ground->id, 'capacity' => null, 'base_price' => 0, 'price_unit' => 'per_month', 'amenities' => ['AC','WiFi'], 'description' => 'Private office on Ground Floor.'],
            ['name' => 'Office 03', 'type' => 'office_space', 'floor_id' => $ground->id, 'capacity' => null, 'base_price' => 0, 'price_unit' => 'per_month', 'amenities' => ['AC','WiFi'], 'description' => 'Private office on Ground Floor.'],
            ['name' => 'Office 04', 'type' => 'office_space', 'floor_id' => $ground->id, 'capacity' => null, 'base_price' => 0, 'price_unit' => 'per_month', 'amenities' => ['AC','WiFi'], 'description' => 'Private office on Ground Floor.'],
            ['name' => 'Office 05', 'type' => 'office_space', 'floor_id' => $ground->id, 'capacity' => null, 'base_price' => 0, 'price_unit' => 'per_month', 'amenities' => ['AC','WiFi'], 'description' => 'Private office on Ground Floor.'],
            ['name' => 'Office 06', 'type' => 'office_space', 'floor_id' => $ground->id, 'capacity' => null, 'base_price' => 0, 'price_unit' => 'per_month', 'amenities' => ['AC','WiFi'], 'description' => 'Private office on Ground Floor.'],
            ['name' => 'Office 07', 'type' => 'office_space', 'floor_id' => $ground->id, 'capacity' => null, 'base_price' => 0, 'price_unit' => 'per_month', 'amenities' => ['AC','WiFi'], 'description' => 'Private office on Ground Floor.'],
            ['name' => 'Office 08', 'type' => 'office_space', 'floor_id' => $ground->id, 'capacity' => null, 'base_price' => 0, 'price_unit' => 'per_month', 'amenities' => ['AC','WiFi'], 'description' => 'Private office on Ground Floor.'],
            ['name' => 'Office 09', 'type' => 'office_space', 'floor_id' => $ground->id, 'capacity' => null, 'base_price' => 0, 'price_unit' => 'per_month', 'amenities' => ['AC','WiFi'], 'description' => 'Private office on Ground Floor.'],
            ['name' => 'Office 10', 'type' => 'office_space', 'floor_id' => $ground->id, 'capacity' => null, 'base_price' => 0, 'price_unit' => 'per_month', 'amenities' => ['AC','WiFi'], 'description' => 'Private office on Ground Floor.'],

            // 1st Floor — 3 Offices + Hall A
            ['name' => 'Office 11', 'type' => 'office_space', 'floor_id' => $floor1->id, 'capacity' => null, 'base_price' => 0, 'price_unit' => 'per_month', 'amenities' => ['AC','WiFi'], 'description' => 'Private office on 1st Floor.'],
            ['name' => 'Office 12', 'type' => 'office_space', 'floor_id' => $floor1->id, 'capacity' => null, 'base_price' => 0, 'price_unit' => 'per_month', 'amenities' => ['AC','WiFi'], 'description' => 'Private office on 1st Floor.'],
            ['name' => 'Office 13', 'type' => 'office_space', 'floor_id' => $floor1->id, 'capacity' => null, 'base_price' => 0, 'price_unit' => 'per_month', 'amenities' => ['AC','WiFi'], 'description' => 'Private office on 1st Floor.'],
            ['name' => 'Hall A', 'type' => 'conference_hall', 'floor_id' => $floor1->id, 'capacity' => 50,   'base_price' => 0, 'price_unit' => 'per_session', 'amenities' => ['projector','AC','WiFi','whiteboard','AV_system'], 'description' => '50-seat conference hall on the 1st Floor. Ideal for meetings, training sessions, and small events.'],

            // 2nd Floor — 2 Offices + Hall B
            ['name' => 'Office 14', 'type' => 'office_space', 'floor_id' => $floor2->id, 'capacity' => null, 'base_price' => 0, 'price_unit' => 'per_month', 'amenities' => ['AC','WiFi'], 'description' => 'Private office on 2nd Floor.'],
            ['name' => 'Office 15', 'type' => 'office_space', 'floor_id' => $floor2->id, 'capacity' => null, 'base_price' => 0, 'price_unit' => 'per_month', 'amenities' => ['AC','WiFi'], 'description' => 'Private office on 2nd Floor.'],
            ['name' => 'Hall B', 'type' => 'conference_hall', 'floor_id' => $floor2->id, 'capacity' => 100,  'base_price' => 0, 'price_unit' => 'per_session', 'amenities' => ['projector','AC','WiFi','whiteboard','AV_system','stage'], 'description' => '100-seat conference hall on the 2nd Floor. Suitable for conferences, seminars, and corporate events.'],

            // 3rd Floor — Hall C
            ['name' => 'Hall C — Grand Ballroom', 'type' => 'conference_hall', 'floor_id' => $floor3->id, 'capacity' => 500, 'base_price' => 0, 'price_unit' => 'per_session', 'amenities' => ['projector','AC','WiFi','AV_system','stage','lighting','sound_system'], 'description' => 'The premier 500-seat event hall. Used for large corporate conferences, ceremonies, exhibitions, and high-profile events.'],
        ];

        foreach ($spaces as $data) {
            $slug = Str::slug($data['name']);
            $base = $slug;
            $i    = 1;
            while (Space::withTrashed()->where('slug', $slug)->exists()) {
                $slug = "{$base}-{$i}";
                $i++;
            }
            Space::firstOrCreate(['name' => $data['name'], 'floor_id' => $data['floor_id']], array_merge($data, ['slug' => $slug, 'photos' => []]));
        }
    }
}
