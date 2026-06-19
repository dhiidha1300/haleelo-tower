<?php

namespace App\Services;

use App\Models\EmailTemplate;
use App\Models\SystemSetting;
use App\Support\EmailTemplates;

/**
 * Renders an email template: substitutes {{variables}} into the subject and body,
 * then wraps the (editable) body inside the locked navy/gold brand frame.
 */
class TemplateRenderer
{
    /**
     * @param array<string,string> $data Variable values.
     * @return array{subject:string,html:string}
     */
    public function render(string $key, array $data = []): array
    {
        $tpl = EmailTemplate::where('key', $key)->where('is_active', true)->first();

        $subject = $tpl?->subject;
        $body    = $tpl?->body_html;

        // Fallback to the built-in default if the row is missing/inactive.
        if ($subject === null || $body === null) {
            $default = EmailTemplates::default($key);
            $subject = $default['subject'] ?? 'Haleelo Tower';
            $body    = $default['body_html'] ?? '';
        }

        return [
            'subject' => $this->substitute($subject, $data),
            'html'    => $this->frame($this->substitute($body, $data)),
        ];
    }

    /** Render only the inner body wrapped in the frame (for admin preview). */
    public function preview(string $subject, string $body, array $data = []): array
    {
        return [
            'subject' => $this->substitute($subject, $data),
            'html'    => $this->frame($this->substitute($body, $data)),
        ];
    }

    /** Replace {{ var }} placeholders. Values are HTML-escaped, except *_url which must stay raw. */
    private function substitute(string $template, array $data): string
    {
        return preg_replace_callback('/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/', function ($m) use ($data) {
            $name = $m[1];
            if (!array_key_exists($name, $data)) {
                return $m[0]; // leave unknown placeholders untouched
            }
            $value = (string) $data[$name];
            // URLs are inserted into href/text as-is; everything else is escaped.
            return str_ends_with($name, '_url')
                ? $value
                : htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
        }, $template);
    }

    /** The locked brand frame. The supplied $body is trusted HTML (already sanitised on save). */
    private function frame(string $body): string
    {
        $building = htmlspecialchars(SystemSetting::get('building_name', 'Haleelo Tower'), ENT_QUOTES, 'UTF-8');
        $year     = date('Y');

        return <<<HTML
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#1B2D4F;padding:32px 40px;text-align:center;">
            <h1 style="margin:0;color:#C9A052;font-size:28px;font-weight:700;letter-spacing:1px;">{$building}</h1>
            <p style="margin:4px 0 0;color:#ffffff;opacity:0.8;font-size:13px;">Admin Dashboard</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            {$body}
          </td>
        </tr>
        <tr>
          <td style="background:#f9f9f9;padding:20px 40px;border-top:1px solid #eee;text-align:center;">
            <p style="margin:0;color:#aaa;font-size:12px;">© {$year} {$building} · Mogadishu, Somalia</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
HTML;
    }
}
