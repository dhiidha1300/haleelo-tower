<?php

namespace Database\Seeders;

use App\Models\CateringPackage;
use Illuminate\Database\Seeder;

class CateringPackageSeeder extends Seeder
{
    public function run(): void
    {
        $packages = [
            [
                'name'        => 'Silver',
                'slug'        => 'silver',
                'description' => 'Essential refreshments package — ideal for short meetings and small gatherings.',
                'base_price'  => 0,
                'active'      => true,
                'items'       => [
                    ['service_name' => 'Water & Soft Drinks',       'description' => 'Chilled bottled water and assorted soft drinks'],
                    ['service_name' => 'Tea & Coffee Station',      'description' => 'Hot tea and coffee with milk and sugar'],
                    ['service_name' => 'Assorted Cookies & Pastries', 'description' => 'Selection of biscuits and light pastries'],
                ],
            ],
            [
                'name'        => 'Gold',
                'slug'        => 'gold',
                'description' => 'Full lunch buffet package — ideal for half-day events and corporate meetings.',
                'base_price'  => 0,
                'active'      => true,
                'items'       => [
                    ['service_name' => 'Water, Juices & Soft Drinks',  'description' => 'Full range of chilled beverages'],
                    ['service_name' => 'Tea & Coffee Station',         'description' => 'Hot tea and coffee throughout the event'],
                    ['service_name' => 'Assorted Cookies & Pastries',  'description' => 'Selection of biscuits and light pastries'],
                    ['service_name' => 'Buffet Lunch',                 'description' => '3 main dishes, rice, salads, and bread'],
                    ['service_name' => 'Fruit Platter',                'description' => 'Seasonal fresh fruit selection'],
                ],
            ],
            [
                'name'        => 'Platinum',
                'slug'        => 'platinum',
                'description' => 'Premium full-day catering — ideal for large conferences, weddings, and ceremonies.',
                'base_price'  => 0,
                'active'      => true,
                'items'       => [
                    ['service_name' => 'Premium Beverages Package',    'description' => 'Full range of hot and cold beverages all day'],
                    ['service_name' => 'Welcome Reception Snacks',     'description' => 'Canapes and light snacks on arrival'],
                    ['service_name' => 'Buffet Lunch',                 'description' => '5+ main dishes, multiple salads, bread, and sides'],
                    ['service_name' => 'Live Cooking Station',         'description' => 'One live station (pasta, grills, or wok)'],
                    ['service_name' => 'Dessert Station',              'description' => 'Assorted sweets, cakes, and seasonal fruits'],
                    ['service_name' => 'Dedicated Service Staff',      'description' => 'Uniformed serving staff throughout the event'],
                ],
            ],
        ];

        foreach ($packages as $packageData) {
            $items = $packageData['items'];
            unset($packageData['items']);

            $package = CateringPackage::firstOrCreate(
                ['slug' => $packageData['slug']],
                $packageData
            );

            // Only seed items if the package was just created
            if ($package->wasRecentlyCreated) {
                foreach ($items as $item) {
                    $package->items()->create($item);
                }
            }
        }
    }
}
