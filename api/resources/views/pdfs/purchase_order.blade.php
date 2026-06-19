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
        .notes-box { margin: 26px 32px; padding: 14px 16px; background: #f9f9f9; border: 1px solid #eee; border-radius: 6px; font-size: 11px; color: #555; }
        .footer { text-align: center; color: #aaa; font-size: 10px; margin-top: 30px; padding: 12px; border-top: 1px solid #eee; }
    </style>
</head>
<body>
    <div class="header">
        <table class="header-table">
            <tr>
                <td>
                    <div class="brand">{{ $building['name'] ?? 'Haleelo Tower' }}</div>
                    <div class="brand-sub">{{ $building['address'] ?? '' }}</div>
                </td>
                <td>
                    <div class="doc-title">PURCHASE ORDER</div>
                    <div class="doc-code">{{ $po->po_code }}</div>
                </td>
            </tr>
        </table>
    </div>

    <div class="section">
        <table class="meta-table">
            <tr>
                <td width="55%">
                    <div class="label">Vendor</div>
                    <div class="value">{{ $po->vendor?->name }}</div>
                    @if($po->vendor?->contact_person)<div>{{ $po->vendor->contact_person }}</div>@endif
                    @if($po->vendor?->phone)<div>{{ $po->vendor->phone }}</div>@endif
                    @if($po->vendor?->email)<div>{{ $po->vendor->email }}</div>@endif
                </td>
                <td width="45%">
                    <table style="width:100%;">
                        <tr><td class="label">Order Date</td><td class="value" style="text-align:right;">{{ $po->order_date?->format('d M Y') }}</td></tr>
                        @if($po->expected_delivery_date)
                        <tr><td class="label">Expected Delivery</td><td class="value" style="text-align:right;">{{ $po->expected_delivery_date->format('d M Y') }}</td></tr>
                        @endif
                        <tr><td class="label">Status</td><td style="text-align:right;">
                            <span class="status-badge" style="background:
                                @if($po->status==='received')#d1fae5;color:#065f46;
                                @elseif($po->status==='billed')#dbeafe;color:#1e40af;
                                @elseif($po->status==='cancelled')#fee2e2;color:#991b1b;
                                @else#fef3c7;color:#92400e;@endif">
                                {{ strtoupper($po->status) }}
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
                @foreach($po->items as $item)
                <tr>
                    <td>{{ $item->description }}</td>
                    <td class="num">{{ rtrim(rtrim(number_format($item->quantity, 2), '0'), '.') }}</td>
                    <td class="num">${{ number_format($item->estimated_unit_price, 2) }}</td>
                    <td class="num">${{ number_format($item->line_total, 2) }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>

        <table class="totals">
            <tr class="grand"><td>ESTIMATED TOTAL</td><td style="text-align:right;">${{ number_format($po->total_estimated_amount, 2) }}</td></tr>
        </table>
    </div>

    @if($po->notes)
    <div class="notes-box"><strong>Notes:</strong> {{ $po->notes }}</div>
    @endif

    <div class="footer">
        {{ $building['name'] ?? 'Haleelo Tower' }} · {{ $building['phone'] ?? '' }} · {{ $building['email'] ?? '' }}<br>
        This is a purchase order, not an invoice. Prices are estimates pending final billing.
    </div>
</body>
</html>
