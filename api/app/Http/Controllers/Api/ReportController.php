<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ReportService;
use App\Exports\GenericReportExport;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;

class ReportController extends Controller
{
    public function __construct(
        private ReportService $reports,
        private AuditService $auditService
    ) {}

    /** Compute and return a report's data as JSON. */
    public function data(Request $request, string $type): JsonResponse
    {
        return response()->json($this->compute($type, $request));
    }

    /** Export a report as PDF or Excel. */
    public function export(Request $request, string $type)
    {
        $format = $request->input('format', 'pdf');
        [$title, $headers, $rows] = $this->flatten($type, $request);

        $this->auditService->logExport(ucfirst(str_replace('-', ' ', $type)) . ' Report');

        $filename = $type . '-' . now()->format('Ymd');

        if ($format === 'excel') {
            return Excel::download(new GenericReportExport($title, $headers, $rows), "{$filename}.xlsx");
        }

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('pdfs.report', [
            'title' => $title, 'headers' => $headers, 'rows' => $rows,
            'building' => \App\Models\SystemSetting::get('building_name', 'Haleelo Tower'),
            'generated' => now()->format('d M Y H:i'),
        ])->setPaper('a4', 'landscape');

        return response($pdf->output(), 200, [
            'Content-Type'        => 'application/pdf',
            'Content-Disposition' => "inline; filename=\"{$filename}.pdf\"",
        ]);
    }

    private function compute(string $type, Request $r): array
    {
        $from = $r->input('from');
        $to   = $r->input('to');

        return match ($type) {
            'balance-sheet'     => $this->reports->balanceSheet($r->input('as_of')),
            'profit-loss'       => $this->reports->profitAndLoss($from, $to),
            'cash-flow'         => $this->reports->cashFlow($from, $to),
            'general-ledger'    => $this->reports->generalLedger((int) $r->input('account_id'), $from, $to),
            'aged-receivables'  => $this->reports->agedReceivables(),
            'aged-payables'     => $this->reports->agedPayables(),
            'partner-ledger'    => $this->reports->partnerLedger($r->input('partner_type', 'tenant'), (int) $r->input('partner_id')),
            'revenue'           => $this->reports->revenueReport($from, $to),
            'expense'           => $this->reports->expenseReport($from, $to),
            'bookings'          => $this->reports->bookingsReport($from, $to, $r->input('status')),
            'payments'          => $this->reports->paymentReport($from, $to),
            'invoice-analysis'  => $this->reports->invoiceAnalysis($from, $to),
            'electricity'       => $this->reports->electricityReport($from, $to),
            'occupancy'         => $this->reports->occupancyReport($from, $to),
            'payroll-summary'   => $this->reports->payrollSummary($r->input('month')),
            default             => abort(404, 'Unknown report type'),
        };
    }

    /** Convert any report into a {title, headers[], rows[]} shape for export. */
    private function flatten(string $type, Request $r): array
    {
        $d = $this->compute($type, $r);

        return match ($type) {
            'balance-sheet' => ['Balance Sheet as of ' . $d['as_of'],
                ['Section', 'Code', 'Account', 'Amount'],
                array_merge(
                    collect($d['assets'])->map(fn ($a) => ['Asset', $a['code'], $a['name'], $a['balance']])->all(),
                    collect($d['liabilities'])->map(fn ($a) => ['Liability', $a['code'], $a['name'], $a['balance']])->all(),
                    collect($d['equity'])->map(fn ($a) => ['Equity', $a['code'], $a['name'], $a['balance']])->all(),
                    [['Equity', '', 'Current Period Earnings', $d['net_income']],
                     ['', '', 'TOTAL ASSETS', $d['total_assets']],
                     ['', '', 'TOTAL LIABILITIES + EQUITY', bcadd($d['total_liabilities'], $d['total_equity'], 2)]]
                )],

            'profit-loss' => ["Profit & Loss · {$d['from']} to {$d['to']}",
                ['Section', 'Code', 'Account', 'Amount'],
                array_merge(
                    collect($d['revenue'])->map(fn ($a) => ['Revenue', $a['code'], $a['name'], $a['amount']])->all(),
                    [['', '', 'Total Revenue', $d['total_revenue']]],
                    collect($d['expenses'])->map(fn ($a) => ['Expense', $a['code'], $a['name'], $a['amount']])->all(),
                    [['', '', 'Total Expenses', $d['total_expenses']],
                     ['', '', 'NET PROFIT', $d['net_profit']]]
                )],

            'cash-flow' => ["Cash Flow · {$d['from']} to {$d['to']}",
                ['Item', 'Amount'],
                [['Opening Balance', $d['opening_balance']], ['Cash In', $d['cash_in']],
                 ['Cash Out', $d['cash_out']], ['Net Cash Flow', $d['net_cash_flow']],
                 ['Closing Balance', $d['closing_balance']]]],

            'general-ledger' => ["General Ledger · {$d['account']['code']} {$d['account']['name']}",
                ['Date', 'JE Code', 'Description', 'Debit', 'Credit', 'Balance'],
                collect($d['rows'])->map(fn ($x) => [$x['date'], $x['journal_code'], $x['description'], $x['debit'], $x['credit'], $x['balance']])->all()],

            'aged-receivables' => ['Aged Receivables',
                ['Invoice', 'Customer', 'Due Date', 'Days Overdue', 'Balance', 'Bucket'],
                collect($d['rows'])->map(fn ($x) => [$x['invoice_code'], $x['customer'], $x['due_date'], $x['days_overdue'], $x['balance'], $x['bucket']])->all()],

            'aged-payables' => ['Aged Payables',
                ['Bill', 'Vendor', 'Due Date', 'Days Overdue', 'Balance', 'Bucket'],
                collect($d['rows'])->map(fn ($x) => [$x['bill_code'], $x['vendor'], $x['due_date'], $x['days_overdue'], $x['balance'], $x['bucket']])->all()],

            'partner-ledger' => ["Partner Ledger · {$d['partner']}",
                ['Document', 'Date', 'Total', 'Paid', 'Balance', 'Status'],
                collect($d['rows'])->map(fn ($x) => [$x['document'], $x['date'], $x['total'], $x['paid'], $x['balance'], $x['status']])->all()],

            'revenue' => ["Revenue Report · {$d['from']} to {$d['to']}",
                ['Code', 'Source', 'Amount'],
                array_merge(collect($d['sources'])->map(fn ($x) => [$x['code'], $x['name'], $x['amount']])->all(), [['', 'TOTAL', $d['total']]])],

            'expense' => ["Expense Report · {$d['from']} to {$d['to']}",
                ['Code', 'Category', 'Amount'],
                array_merge(collect($d['categories'])->map(fn ($x) => [$x['code'], $x['name'], $x['amount']])->all(), [['', 'TOTAL', $d['total']]])],

            'bookings' => ['Bookings Report',
                ['Code', 'Client', 'Space', 'Date', 'Session', 'Status', 'Total'],
                collect($d['rows'])->map(fn ($x) => [$x['booking_code'], $x['client'], $x['product'], $x['date'], $x['session'], $x['status'], $x['total']])->all()],

            'payments' => ['Payment Report',
                ['Code', 'Type', 'Document', 'Date', 'Method', 'Account', 'Amount'],
                collect($d['rows'])->map(fn ($x) => [$x['payment_code'], $x['type'], $x['document'], $x['date'], $x['method'], $x['account'], $x['amount']])->all()],

            'invoice-analysis' => ['Invoice Analysis',
                ['Group', 'Key', 'Count', 'Total'],
                array_merge(
                    collect($d['by_type'])->map(fn ($x) => ['Type', $x['type'], $x['count'], $x['total']])->all(),
                    collect($d['by_status'])->map(fn ($x) => ['Status', $x['status'], $x['count'], $x['total']])->all()
                )],

            'electricity' => ['Electricity Billing Report',
                ['Bill', 'Tenant', 'Space', 'Period', 'Prev R', 'Curr R', 'kWh', 'Rate', 'Charge', 'Status'],
                collect($d['rows'])->map(fn ($x) => [$x['bill_code'], $x['tenant'], $x['space'], $x['period'], $x['previous'], $x['current'], $x['kwh'], $x['rate'], $x['charge'], $x['status']])->all()],

            'occupancy' => ['Occupancy Report',
                ['Space', 'Floor', 'Type', 'Booked', 'Available', 'Rate %'],
                collect($d['rows'])->map(fn ($x) => [$x['space'], $x['floor'], $x['type'], $x['booked'], $x['available'], $x['rate']])->all()],

            'payroll-summary' => ['Payroll Summary' . ($d['month'] ? " · {$d['month']}" : ''),
                ['Department', 'Employees', 'Gross', 'Deductions', 'Net'],
                array_merge(
                    collect($d['departments'])->map(fn ($x) => [ucwords(str_replace('_', ' ', $x['department'])), $x['employees'], $x['gross'], $x['deductions'], $x['net']])->all(),
                    [['TOTAL', $d['employee_count'], $d['total_gross'], $d['total_deductions'], $d['total_net']]]
                )],

            default => ['Report', ['Data'], []],
        };
    }
}
