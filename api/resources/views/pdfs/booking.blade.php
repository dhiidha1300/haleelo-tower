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
        h3.block { color: #1B2D4F; font-size: 13px; margin: 26px 0 8px; border-bottom: 2px solid #C9A052; padding-bottom: 4px; }
        table.kv { width: 100%; border-collapse: collapse; }
        table.kv td { padding: 5px 0; font-size: 12px; vertical-align: top; }
        table.kv td.k { color: #888; width: 35%; }
        .catering-box { margin-top: 8px; padding: 14px 16px; background: #f9f9f9; border: 1px solid #eee; border-radius: 6px; }
        .catering-pkg { font-weight: bold; color: #1B2D4F; font-size: 13px; margin-bottom: 6px; }
        ul.items { margin: 6px 0 0; padding-left: 18px; }
        ul.items li { padding: 2px 0; font-size: 11px; }
        .addons span { display: inline-block; background: #1B2D4F; color: #fff; border-radius: 4px; padding: 3px 10px; font-size: 11px; margin: 3px 4px 0 0; }
        .totals { width: 45%; margin-left: 55%; margin-top: 22px; }
        .totals .grand { background: #C9A052; color: #fff; font-weight: bold; font-size: 15px; }
        .totals td { padding: 8px 12px; }
        .footer { text-align: center; color: #aaa; font-size: 10px; margin-top: 36px; padding: 12px; border-top: 1px solid #eee; }
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
                    <div class="doc-title">BOOKING CONFIRMATION</div>
                    <div class="doc-code">{{ $booking->booking_code }}</div>
                </td>
            </tr>
        </table>
    </div>

    <div class="section">
        <table class="meta-table">
            <tr>
                <td width="55%">
                    <div class="label">Client</div>
                    <div class="value">{{ $booking->client_name }}</div>
                    @if($booking->client_company)<div>{{ $booking->client_company }}</div>@endif
                    @if($booking->client_phone)<div>{{ $booking->client_phone }}</div>@endif
                    @if($booking->client_email)<div>{{ $booking->client_email }}</div>@endif
                </td>
                <td width="45%">
                    <table style="width:100%;">
                        <tr><td class="label">Date</td><td class="value" style="text-align:right;">{{ $booking->booking_date->format('d M Y') }}</td></tr>
                        <tr><td class="label">Session</td><td class="value" style="text-align:right;text-transform:capitalize;">{{ $booking->session_type }}</td></tr>
                        <tr><td class="label">Time</td><td class="value" style="text-align:right;">{{ $booking->start_time }} – {{ $booking->end_time }}</td></tr>
                        <tr><td class="label">Status</td><td style="text-align:right;">
                            <span class="status-badge" style="background:
                                @if($booking->status==='booking_approved')#d1fae5;color:#065f46;
                                @elseif($booking->status==='rejected'||$booking->status==='cancelled')#fee2e2;color:#991b1b;
                                @else#fef3c7;color:#92400e;@endif">
                                {{ strtoupper(str_replace('_',' ', $booking->status)) }}
                            </span>
                        </td></tr>
                    </table>
                </td>
            </tr>
        </table>

        <h3 class="block">Venue</h3>
        <table class="kv">
            <tr><td class="k">Space</td><td>{{ $booking->product?->name ?? '—' }}</td></tr>
            <tr><td class="k">Floor</td><td>{{ $booking->product?->floor?->name ?? '—' }}</td></tr>
        </table>

        <h3 class="block">Catering</h3>
        @if($booking->cateringPackage)
            <div class="catering-box">
                <div class="catering-pkg">{{ $booking->cateringPackage->name }} Package</div>
                @if($booking->cateringPackage->description)
                    <div style="color:#666;font-size:11px;">{{ $booking->cateringPackage->description }}</div>
                @endif
                @if($booking->cateringPackage->items->count())
                    <div class="label" style="margin-top:8px;">Included</div>
                    <ul class="items">
                        @foreach($booking->cateringPackage->items as $item)
                            <li><strong>{{ $item->service_name }}</strong>@if($item->description) — {{ $item->description }}@endif</li>
                        @endforeach
                    </ul>
                @endif
            </div>
        @else
            <div style="color:#888;font-size:11px;">No catering package selected.</div>
        @endif

        @php
            $addons = [];
            if ($booking->dj_requested) $addons[] = 'DJ Service';
            if ($booking->cameraman_requested) $addons[] = 'Cameraman Service';
            foreach ((array) $booking->extra_services as $ex) {
                $addons[] = is_array($ex) ? ($ex['name'] ?? json_encode($ex)) : $ex;
            }
        @endphp
        @if(count($addons))
            <h3 class="block">Additional Services</h3>
            <div class="addons">
                @foreach($addons as $a)<span>{{ $a }}</span>@endforeach
            </div>
        @endif

        @if($booking->notes)
            <h3 class="block">Notes</h3>
            <div style="font-size:11px;color:#555;">{{ $booking->notes }}</div>
        @endif

        <table class="totals">
            <tr class="grand"><td>TOTAL</td><td style="text-align:right;">${{ number_format($booking->total_price, 2) }}</td></tr>
        </table>
    </div>

    <div class="footer">
        {{ $building['name'] ?? 'Haleelo Tower' }} · {{ $building['phone'] ?? '' }} · {{ $building['email'] ?? '' }}<br>
        Thank you for choosing {{ $building['name'] ?? 'Haleelo Tower' }}.
    </div>
</body>
</html>
