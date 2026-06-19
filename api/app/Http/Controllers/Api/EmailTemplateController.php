<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EmailTemplate;
use App\Services\AuditService;
use App\Services\MailService;
use App\Services\TemplateRenderer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class EmailTemplateController extends Controller
{
    public function __construct(
        private TemplateRenderer $renderer,
        private MailService $mail,
        private AuditService $audit
    ) {}

    public function index(): JsonResponse
    {
        return response()->json([
            'templates' => EmailTemplate::orderByDesc('is_system')->orderBy('name')->get(),
        ]);
    }

    public function show(EmailTemplate $emailTemplate): JsonResponse
    {
        return response()->json($emailTemplate);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'key'       => 'required|string|max:100|alpha_dash|unique:email_templates,key',
            'name'      => 'required|string|max:150',
            'subject'   => 'required|string|max:255',
            'body_html' => 'required|string',
            'variables' => 'nullable|array',
            'variables.*' => 'string|max:50',
        ]);

        $data['body_html'] = $this->sanitize($data['body_html']);
        $data['is_system'] = false;
        $data['is_active'] = true;
        $data['updated_by'] = Auth::id();

        $tpl = EmailTemplate::create($data);
        $this->audit->log('created', EmailTemplate::class, (int) $tpl->id, null, ['key' => $tpl->key]);

        return response()->json($tpl, 201);
    }

    public function update(Request $request, EmailTemplate $emailTemplate): JsonResponse
    {
        $data = $request->validate([
            'name'      => 'sometimes|string|max:150',
            'subject'   => 'sometimes|string|max:255',
            'body_html' => 'sometimes|string',
            'variables' => 'nullable|array',
            'variables.*' => 'string|max:50',
            'is_active' => 'sometimes|boolean',
        ]);

        if (isset($data['body_html'])) {
            $data['body_html'] = $this->sanitize($data['body_html']);
        }

        // System templates may be edited but never deactivated.
        if ($emailTemplate->is_system) {
            unset($data['is_active']);
        }

        $data['updated_by'] = Auth::id();
        $emailTemplate->update($data);
        $this->audit->log('updated', EmailTemplate::class, (int) $emailTemplate->id, null, ['key' => $emailTemplate->key]);

        return response()->json($emailTemplate->fresh());
    }

    public function destroy(EmailTemplate $emailTemplate): JsonResponse
    {
        if ($emailTemplate->is_system) {
            return response()->json(['message' => 'System templates cannot be deleted.'], 422);
        }

        $this->audit->log('deleted', EmailTemplate::class, (int) $emailTemplate->id, ['key' => $emailTemplate->key], null);
        $emailTemplate->delete();

        return response()->json(['message' => 'Template deleted.']);
    }

    /** Render unsaved subject/body with sample data for the live preview. */
    public function preview(Request $request, EmailTemplate $emailTemplate): JsonResponse
    {
        $data = $request->validate([
            'subject'   => 'required|string',
            'body_html' => 'required|string',
        ]);

        $sample = $this->sampleData($emailTemplate->variables ?? []);
        $r = $this->renderer->preview($data['subject'], $this->sanitize($data['body_html']), $sample);

        return response()->json($r);
    }

    /** Send a test of this template to an address using sample data. */
    public function test(Request $request, EmailTemplate $emailTemplate): JsonResponse
    {
        $request->validate(['email' => 'required|email']);

        if ($this->mail->effectiveDriver() === null) {
            return response()->json(['message' => 'No mail transport is configured.'], 422);
        }

        try {
            $r = $this->renderer->render($emailTemplate->key, $this->sampleData($emailTemplate->variables ?? []));
            $this->mail->send($request->email, $r['subject'], $r['html']);
            return response()->json(['message' => 'Test sent via ' . strtoupper($this->mail->effectiveDriver()) . '.']);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Failed to send: ' . $e->getMessage()], 422);
        }
    }

    /** Placeholder values so previews/tests render meaningfully. */
    private function sampleData(array $variables): array
    {
        $samples = [
            'name' => 'Jane Doe', 'email' => 'jane@example.com', 'role' => 'Operations',
            'reset_url' => 'https://admin.halelotower.so/reset/sample',
            'set_password_url' => 'https://admin.halelotower.so/invite/sample',
            'expiry' => '60 minutes', 'invoice_code' => 'INV-2026-0001', 'amount' => '500.00',
            'due_date' => now()->addDays(7)->format('d M Y'), 'payslip_code' => 'PAY-2026-0001',
            'month' => now()->format('F Y'), 'net' => '300.00', 'message' => 'This is a sample message body.',
            'booking_code' => 'BK-2026-0001', 'status_label' => 'Confirmed',
            'subject' => 'A spot has opened up', 'space' => 'Office 14', 'end_date' => now()->addMonths(3)->format('d M Y'),
        ];

        $out = [];
        foreach ($variables as $v) {
            $out[$v] = $samples[$v] ?? Str::headline($v);
        }
        return $out;
    }

    /** Basic HTML sanitisation for stored email bodies (strip scripts & event handlers). */
    private function sanitize(string $html): string
    {
        // Remove <script>...</script> blocks
        $html = preg_replace('#<script\b[^>]*>.*?</script>#is', '', $html);
        // Remove inline event handlers (onclick=, onerror=, ...)
        $html = preg_replace('#\son\w+\s*=\s*(".*?"|\'.*?\'|[^\s>]+)#is', '', $html);
        // Neutralise javascript: URIs
        $html = preg_replace('#javascript\s*:#i', '#', $html);
        return $html;
    }
}
