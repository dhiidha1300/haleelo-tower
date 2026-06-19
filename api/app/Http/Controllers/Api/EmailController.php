<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\MailService;
use App\Services\TemplateRenderer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EmailController extends Controller
{
    public function __construct(
        private MailService $mail,
        private TemplateRenderer $renderer
    ) {}

    public function test(Request $request): JsonResponse
    {
        $request->validate(['email' => 'required|email']);

        if ($this->mail->effectiveDriver() === null) {
            return response()->json(['message' => 'No mail transport is configured. Set up SMTP or Resend first.'], 422);
        }

        try {
            $r = $this->renderer->render('test', []);
            $this->mail->send($request->email, $r['subject'], $r['html']);

            return response()->json([
                'message' => 'Test email sent successfully via ' . strtoupper($this->mail->effectiveDriver()) . '.',
            ]);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Failed to send: ' . $e->getMessage()], 422);
        }
    }
}
