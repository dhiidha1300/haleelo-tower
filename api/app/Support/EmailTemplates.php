<?php

namespace App\Support;

/**
 * Canonical definitions of the system email templates. Used by the seeder to
 * populate the database and by TemplateRenderer as a safety fallback when a
 * template row is missing or deactivated. Only the inner body is stored here —
 * the navy/gold header + footer come from the locked brand frame.
 */
class EmailTemplates
{
    /**
     * @return array<int,array{key:string,name:string,subject:string,body_html:string,variables:array<int,string>}>
     */
    public static function defaults(): array
    {
        return [
            [
                'key'       => 'password_reset',
                'name'      => 'Password Reset',
                'subject'   => 'Reset Your Haleelo Tower Password',
                'variables' => ['name', 'reset_url', 'expiry'],
                'body_html' => <<<'HTML'
<h2 style="margin:0 0 16px;color:#1B2D4F;font-size:22px;">Reset Your Password</h2>
<p style="margin:0 0 12px;color:#555;font-size:15px;line-height:1.6;">Hi {{name}},</p>
<p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.6;">A password reset was requested for your Haleelo Tower admin account. Click the button below to set a new password.</p>
<table cellpadding="0" cellspacing="0" style="margin:0 0 24px;"><tr><td style="background:#C9A052;border-radius:6px;">
<a href="{{reset_url}}" style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;">Reset Password</a>
</td></tr></table>
<p style="margin:0 0 8px;color:#888;font-size:13px;">This link expires in <strong>{{expiry}}</strong>. If you did not request a password reset, you can safely ignore this email — your password will not change.</p>
<p style="margin:16px 0 0;color:#aaa;font-size:12px;word-break:break-all;">If the button above doesn't work, copy and paste this URL into your browser:<br><a href="{{reset_url}}" style="color:#C9A052;">{{reset_url}}</a></p>
HTML,
            ],
            [
                'key'       => 'user_invite',
                'name'      => 'User Invitation',
                'subject'   => 'You have been invited to Haleelo Tower Admin',
                'variables' => ['name', 'email', 'role', 'set_password_url'],
                'body_html' => <<<'HTML'
<h2 style="margin:0 0 16px;color:#1B2D4F;font-size:22px;">Welcome to Haleelo Tower!</h2>
<p style="margin:0 0 12px;color:#555;font-size:15px;line-height:1.6;">Hi {{name}},</p>
<p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.6;">You have been invited to join the Haleelo Tower admin platform as <strong>{{role}}</strong>. Click the button below to set your password and activate your account.</p>
<table style="background:#f9f9f9;border:1px solid #eee;border-radius:6px;padding:16px;margin-bottom:24px;width:100%;" cellpadding="0" cellspacing="0"><tr><td style="font-size:13px;color:#555;">
<strong>Login Email:</strong> {{email}}<br><strong>Role:</strong> {{role}}
</td></tr></table>
<table cellpadding="0" cellspacing="0" style="margin:0 0 24px;"><tr><td style="background:#C9A052;border-radius:6px;">
<a href="{{set_password_url}}" style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;">Set Your Password</a>
</td></tr></table>
<p style="margin:0 0 8px;color:#888;font-size:13px;">This invitation link expires in <strong>24 hours</strong>. If you did not expect this invitation, you can safely ignore this email.</p>
<p style="margin:16px 0 0;color:#aaa;font-size:12px;word-break:break-all;">If the button doesn't work, paste this URL into your browser:<br><a href="{{set_password_url}}" style="color:#C9A052;">{{set_password_url}}</a></p>
HTML,
            ],
            [
                'key'       => 'invoice',
                'name'      => 'Invoice Delivery',
                'subject'   => 'Invoice {{invoice_code}} — ${{amount}}',
                'variables' => ['name', 'invoice_code', 'amount', 'due_date'],
                'body_html' => <<<'HTML'
<h2 style="margin:0 0 16px;color:#1B2D4F;font-size:22px;">Invoice {{invoice_code}}</h2>
<p style="margin:0 0 12px;color:#555;font-size:15px;line-height:1.6;">Dear {{name}},</p>
<p style="margin:0 0 16px;color:#555;font-size:15px;line-height:1.6;">Please find attached invoice <strong>{{invoice_code}}</strong> for <strong>${{amount}}</strong>, due on <strong>{{due_date}}</strong>.</p>
<p style="margin:0 0 8px;color:#555;font-size:14px;line-height:1.6;">You can pay via Edahab, ZAAD, or bank transfer quoting your invoice code.</p>
HTML,
            ],
            [
                'key'       => 'payslip',
                'name'      => 'Payslip Delivery',
                'subject'   => 'Payslip {{payslip_code}} — {{month}}',
                'variables' => ['name', 'payslip_code', 'month', 'net'],
                'body_html' => <<<'HTML'
<h2 style="margin:0 0 16px;color:#1B2D4F;font-size:22px;">Your Payslip — {{month}}</h2>
<p style="margin:0 0 12px;color:#555;font-size:15px;line-height:1.6;">Dear {{name}},</p>
<p style="margin:0 0 16px;color:#555;font-size:15px;line-height:1.6;">Your payslip for <strong>{{month}}</strong> is attached. Net pay: <strong>${{net}}</strong>.</p>
HTML,
            ],
            [
                'key'       => 'booking_notification',
                'name'      => 'Booking Notification',
                'subject'   => 'Booking {{status_label}} — {{booking_code}}',
                'variables' => ['name', 'message', 'booking_code', 'status_label'],
                'body_html' => <<<'HTML'
<h2 style="margin:0 0 16px;color:#1B2D4F;font-size:22px;">Booking {{status_label}}</h2>
<p style="margin:0 0 12px;color:#555;font-size:15px;line-height:1.6;">Dear {{name}},</p>
<p style="margin:0 0 16px;color:#555;font-size:15px;line-height:1.6;">{{message}}</p>
<p style="margin:0;color:#888;font-size:13px;">Reference: <strong>{{booking_code}}</strong></p>
HTML,
            ],
            [
                'key'       => 'waitlist',
                'name'      => 'Waiting List Notification',
                'subject'   => '{{subject}}',
                'variables' => ['name', 'subject', 'message'],
                'body_html' => <<<'HTML'
<p style="margin:0 0 12px;color:#555;font-size:15px;line-height:1.6;">Dear {{name}},</p>
<p style="margin:0 0 16px;color:#555;font-size:15px;line-height:1.6;">{{message}}</p>
<p style="margin:0;color:#888;font-size:13px;">— Haleelo Tower</p>
HTML,
            ],
            [
                'key'       => 'lease_renewal',
                'name'      => 'Lease Renewal Reminder',
                'subject'   => 'Lease Renewal Reminder — {{space}}',
                'variables' => ['name', 'space', 'end_date'],
                'body_html' => <<<'HTML'
<h2 style="margin:0 0 16px;color:#1B2D4F;font-size:22px;">Lease Renewal Reminder</h2>
<p style="margin:0 0 12px;color:#555;font-size:15px;line-height:1.6;">Dear {{name}},</p>
<p style="margin:0 0 16px;color:#555;font-size:15px;line-height:1.6;">Your lease for <strong>{{space}}</strong> expires on <strong>{{end_date}}</strong>. Please contact us to discuss renewal options.</p>
HTML,
            ],
            [
                'key'       => 'test',
                'name'      => 'Connection Test',
                'subject'   => 'Haleelo Tower — Email Test',
                'variables' => [],
                'body_html' => <<<'HTML'
<h2 style="margin:0 0 16px;color:#1B2D4F;font-size:22px;">Email Test</h2>
<p style="margin:0 0 16px;color:#555;font-size:15px;line-height:1.6;">This is a test email from your Haleelo Tower admin dashboard. If you received this, your email is configured correctly.</p>
HTML,
            ],
        ];
    }

    /** Look up a single default by key (runtime fallback). */
    public static function default(string $key): ?array
    {
        foreach (self::defaults() as $t) {
            if ($t['key'] === $key) return $t;
        }
        return null;
    }
}
