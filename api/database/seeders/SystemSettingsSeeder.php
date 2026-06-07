<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\SystemSetting;

class SystemSettingsSeeder extends Seeder
{
    public function run(): void
    {
        $settings = [
            // General Settings
            [
                'key' => 'building_name',
                'value' => 'Haleelo Tower',
                'description' => 'Display name of the building',
            ],
            [
                'key' => 'logo_url',
                'value' => '',
                'description' => 'S3 URL of the building logo',
            ],
            [
                'key' => 'contact_email',
                'value' => 'info@halelotower.so',
                'description' => 'Primary contact email for public display',
            ],
            [
                'key' => 'contact_phone',
                'value' => '+252616666666',
                'description' => 'Primary contact phone number',
            ],
            [
                'key' => 'address',
                'value' => 'Mogadishu, Somalia',
                'description' => 'Full building address',
            ],
            [
                'key' => 'timezone',
                'value' => 'Africa/Mogadishu',
                'description' => 'Server timezone (locked to EAT UTC+3)',
            ],
            [
                'key' => 'date_format',
                'value' => 'DD/MM/YYYY',
                'description' => 'Default date format for display',
            ],

            // Session Times
            [
                'key' => 'session_morning_start',
                'value' => '08:00',
                'description' => 'Morning session start time',
            ],
            [
                'key' => 'session_morning_end',
                'value' => '13:00',
                'description' => 'Morning session end time',
            ],
            [
                'key' => 'session_afternoon_start',
                'value' => '15:00',
                'description' => 'Afternoon session start time',
            ],
            [
                'key' => 'session_afternoon_end',
                'value' => '18:30',
                'description' => 'Afternoon session end time',
            ],
            [
                'key' => 'session_evening_start',
                'value' => '19:00',
                'description' => 'Evening session start time',
            ],
            [
                'key' => 'session_evening_end',
                'value' => '23:00',
                'description' => 'Evening session end time',
            ],

            // Payment Settings
            [
                'key' => 'invoice_due_days',
                'value' => '7',
                'description' => 'Number of days from invoice issue to due date',
            ],

            // Email Settings
            [
                'key' => 'resend_from_name',
                'value' => 'Haleelo Tower',
                'description' => 'Resend API sender name',
            ],
            [
                'key' => 'resend_from_email',
                'value' => 'noreply@halelotower.so',
                'description' => 'Resend API verified sender email',
            ],
            [
                'key' => 'resend_reply_to',
                'value' => 'info@halelotower.so',
                'description' => 'Reply-to email address for emails',
            ],

            // WhatsApp Settings
            [
                'key' => 'whatsapp_provider',
                'value' => 'twilio',
                'description' => 'WhatsApp provider: twilio or 360dialog',
            ],

            // Electricity Settings
            [
                'key' => 'electricity_rate_per_kwh',
                'value' => '0.25',
                'description' => 'Electricity rate per kWh in USD',
            ],

            // Payroll Settings
            [
                'key' => 'working_hours_per_day',
                'value' => '8',
                'description' => 'Standard working hours per day',
            ],
            [
                'key' => 'working_days_per_month',
                'value' => '26',
                'description' => 'Standard working days per month',
            ],

            // Fiscal Settings
            [
                'key' => 'fiscal_year_start_month',
                'value' => '1',
                'description' => 'Fiscal year start month (1-12)',
            ],

            // Catering Add-ons
            [
                'key' => 'addon_dj_price',
                'value' => '100.00',
                'description' => 'DJ add-on price in USD',
            ],
            [
                'key' => 'addon_cameraman_price',
                'value' => '100.00',
                'description' => 'Cameraman add-on price in USD',
            ],
        ];

        foreach ($settings as $setting) {
            SystemSetting::create($setting);
        }
    }
}
