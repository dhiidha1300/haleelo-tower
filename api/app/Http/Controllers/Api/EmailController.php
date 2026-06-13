<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SystemSetting;
use App\Services\EmailService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Resend;

class EmailController extends Controller
{
    public function test(Request $request): JsonResponse
    {
        $request->validate(['email' => 'required|email']);

        $apiKey = SystemSetting::get('resend_api_key', env('RESEND_API_KEY', ''));

        if (!$apiKey) {
            return response()->json(['message' => 'Resend API key is not configured.'], 422);
        }

        $fromName  = SystemSetting::get('resend_from_name', 'Haleelo Tower');
        $fromEmail = SystemSetting::get('resend_from_email', 'noreply@halelotower.so');

        try {
            $client = Resend::client($apiKey);
            $client->emails->send([
                'from'    => "{$fromName} <{$fromEmail}>",
                'to'      => [$request->email],
                'subject' => 'Haleelo Tower — Email Test',
                'html'    => '<p>This is a test email from your Haleelo Tower admin dashboard. Email is configured correctly.</p>',
            ]);

            return response()->json(['message' => 'Test email sent successfully.']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to send: ' . $e->getMessage()], 422);
        }
    }
}
