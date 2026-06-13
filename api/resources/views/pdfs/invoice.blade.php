<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        * { font-family: DejaVu Sans, sans-serif; }
        body { margin: 0; color: #333; font-size: 12px; }
        .header { background: #1B2D4F; color: #fff; padding: 24px 32px; }
        .header-table { width: 100%; }
        .brand { font-size: 26px; font-weight: bold; color: #C9A052; }
        .brand-sub { font-size: 11px; color: #cbd5e1; }
        .doc-title { font-size: 22px; font-weight: bold; text-align: right; }
        .doc-code { font-size: 12px; color: #cbd5e1; text-align: right; }
        .section { padding: 0 32px; }
        .meta-table { width: 100%; margin-top: 24px; }
        .meta-table td { vertical-align: top; padding: 2px 0; }
        .label { color: #888; font-size: 10px; text-transform: uppercase; }
        .value { font-weight: bold; font-size: 12px; }
        .status-badge { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 11px; font-weight: bold; }
        table.items { width: 100%; border-collapse: collapse; margin-top: 28px; }
        table.items th { background: #1B2D4F; color: #fff; text-align: left; padding: 8px 10px; font-size: 11px; }
        table.items th.num, table.items td.num { text-align: right; }
        table.items td { padding: 8px 10px; border-bottom: 1px solid #eee; }
        .totals { width: 40%; margin-left: 60%; margin-top: 16px; }
        .totals td { padding: 6px 10px; }
        .totals .grand { background: #C9A052; color: #fff; font-weight: bold; font-size: 14px; }
        .pay-box { margin: 28px 32px; padding: 16px; background: #f9f9f9; border: 1px solid #eee; border-radius: 6px; }
        .pay-title { font-weight: bold; color: #1B2D4F; margin-bottom: 8px; }
        .pay-table { width: 100%; border-collapse: collapse; }
        .pay-table td { padding: 4px 8px; font-size: 11px; border-bottom: 1px solid #eee; }
        .footer { text-align: center; color: #aaa; font-size: 10px; margin-top: 30px; padding: 12px; border-top: 1px solid #eee; }
    </style>
</head>
<body>
    <div class="header">
        <table class="header-table">
            <tr>
                <td>
                    <div class="brand">{{ $building['name'] ?? 'Haleelo Tower' }}</div>
                    <div class="brand-sub">{{ $building['address'] ?? 'Mogadishu, Somalia' }}</div>
                </td>
                <td>
                    <div class="doc-title">INVOICE</div>
                    <div class="doc-code">{{ $invoice->invoice_code }}</div>
                </td>
            </tr>
        </table>
    </div>

    <div class="section">
        <table class="meta-table">
            <tr>
                <td width="50%">
                    <div class="label">Bill To</div>
                    <div class="value">{{ $invoice->billToName() }}</div>
                    @if($invoice->bill_to_email)<div>{{ $invoice->bill_to_email }}</div>@endif
                    @if($invoice->bill_to_phone)<div>{{ $invoice->bill_to_phone }}</div>@endif
                    @if($invoice->lpo_number)<div style="margin-top:6px;"><span class="label">LPO No:</span> <strong>{{ $invoice->lpo_number }}</strong></div>@endif
                </td>
                <td width="50%">
                    <table style="width:100%;">
                        <tr><td class="label">Issue Date</td><td class="value" style="text-align:right;">{{ $invoice->issue_date->format('d M Y') }}</td></tr>
                        <tr><td class="label">Due Date</td><td class="value" style="text-align:right;">{{ $invoice->due_date->format('d M Y') }}</td></tr>
                        @if($invoice->billing_period_start)
                        <tr><td class="label">Period</td><td class="value" style="text-align:right;">{{ $invoice->billing_period_start->format('d M') }} – {{ $invoice->billing_period_end->format('d M Y') }}</td></tr>
                        @endif
                        <tr><td class="label">Status</td><td style="text-align:right;">
                            <span class="status-badge" style="background:
                                @if($invoice->status==='paid')#d1fae5;color:#065f46;
                                @elseif($invoice->status==='overdue')#fee2e2;color:#991b1b;
                                @elseif($invoice->status==='partial')#fef3c7;color:#92400e;
                                @else#e5e7eb;color:#374151;@endif">
                                {{ strtoupper($invoice->status) }}
                            </span>
                        </td></tr>
                    </table>
                </td>
            </tr>
        </table>

        <table class="items">
            <thead>
                <tr>
                    <th>Description</th>
                    <th class="num">Qty</th>
                    <th class="num">Unit Price</th>
                    <th class="num">Amount</th>
                </tr>
            </thead>
            <tbody>
                @foreach($invoice->lineItems as $item)
                <tr>
                    <td>{{ $item->description }}</td>
                    <td class="num">{{ rtrim(rtrim(number_format($item->quantity, 2), '0'), '.') }}</td>
                    <td class="num">${{ number_format($item->unit_price, 2) }}</td>
                    <td class="num">${{ number_format($item->line_total, 2) }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>

        <table class="totals">
            <tr><td class="label">Subtotal</td><td class="num" style="text-align:right;">${{ number_format($invoice->subtotal, 2) }}</td></tr>
            <tr class="grand"><td>TOTAL DUE</td><td style="text-align:right;">${{ number_format($invoice->total_amount, 2) }}</td></tr>
        </table>
    </div>

    <div class="pay-box">
        <div class="pay-title">Payment Instructions</div>
        <div style="font-size:11px; color:#666; margin-bottom:8px;">Pay via any of the accounts below, quoting invoice code <strong>{{ $invoice->invoice_code }}</strong>:</div>
        <table class="pay-table">
            @foreach($accounts as $acc)
            <tr>
                <td><strong>{{ $acc['name'] }}</strong></td>
                <td>{{ ucfirst(str_replace('_',' ', $acc['type'])) }}</td>
                <td style="text-align:right;">{{ $acc['identifier'] ?? '—' }}</td>
            </tr>
            @endforeach
        </table>
    </div>

    <div class="footer">
        {{ $building['name'] ?? 'Haleelo Tower' }} · {{ $building['phone'] ?? '' }} · {{ $building['email'] ?? '' }}<br>
        Thank you for your business.
    </div>
</body>
</html>
