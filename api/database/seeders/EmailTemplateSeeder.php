<?php

namespace Database\Seeders;

use App\Models\EmailTemplate;
use App\Support\EmailTemplates;
use Illuminate\Database\Seeder;

class EmailTemplateSeeder extends Seeder
{
    public function run(): void
    {
        foreach (EmailTemplates::defaults() as $tpl) {
            EmailTemplate::updateOrCreate(
                ['key' => $tpl['key']],
                [
                    // Refresh the canonical fields, but preserve any admin edits to
                    // subject/body by only setting them when the row is new.
                    'name'      => $tpl['name'],
                    'variables' => $tpl['variables'],
                    'is_system' => true,
                ] + (EmailTemplate::where('key', $tpl['key'])->exists()
                    ? []
                    : ['subject' => $tpl['subject'], 'body_html' => $tpl['body_html'], 'is_active' => true])
            );
        }
    }
}
