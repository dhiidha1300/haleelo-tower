<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        * { font-family: DejaVu Sans, sans-serif; }
        body { margin: 0; color: #333; font-size: 12px; }
        .header { background: #1B2D4F; color: #fff; padding: 22px 32px; }
        .brand { font-size: 24px; font-weight: bold; color: #C9A052; }
        .brand-sub { font-size: 11px; color: #cbd5e1; }
        .doc-title { font-size: 20px; font-weight: bold; text-align: right; }
        .doc-code { font-size: 12px; color: #cbd5e1; text-align: right; }
        .section { padding: 0 32px; }
        table.kv { width: 100%; border-collapse: collapse; margin-top: 22px; }
        table.kv td { padding: 6px 0; font-size: 12px; vertical-align: top; }
        td.k { color: #888; width: 26%; text-transform: uppercase; font-size: 10px; letter-spacing: .04em; }
        .status { display: inline-block; padding: 3px 10px; border-radius: 4px; font-size: 11px; font-weight: bold; }
        h3.block { color: #1B2D4F; font-size: 13px; margin: 26px 0 10px; border-bottom: 2px solid #C9A052; padding-bottom: 4px; }
        .notes { font-size: 12px; color: #444; line-height: 1.5; background: #f9f9f9; border: 1px solid #eee; border-radius: 6px; padding: 12px; }
        .photos td { width: 50%; padding: 5px; vertical-align: top; }
        .photos img { width: 100%; height: 150px; object-fit: cover; border-radius: 6px; border: 1px solid #ddd; }
        .empty { color: #999; font-size: 11px; font-style: italic; }
        .cost-box { margin-top: 18px; padding: 12px 16px; background: #FBF1DC; border-radius: 6px; }
        .footer { text-align: center; color: #aaa; font-size: 10px; margin-top: 30px; padding: 12px; border-top: 1px solid #eee; }
    </style>
</head>
<body>
    <div class="header">
        <table style="width:100%"><tr>
            <td><div class="brand">{{ $building['name'] ?? 'Haleelo Tower' }}</div><div class="brand-sub">{{ $building['address'] ?? '' }}</div></td>
            <td><div class="doc-title">MAINTENANCE REPORT</div><div class="doc-code">{{ $m->request_code }}</div></td>
        </tr></table>
    </div>

    <div class="section">
        <table class="kv">
            <tr><td class="k">Title</td><td><strong>{{ $m->title }}</strong></td>
                <td class="k">Status</td><td>
                    <span class="status" style="background:
                        @if($m->status==='resolved')#d1fae5;color:#065f46;
                        @elseif($m->status==='cancelled')#fee2e2;color:#991b1b;
                        @elseif($m->status==='in_progress')#fff7ed;color:#c2410c;
                        @else#fef3c7;color:#92400e;@endif">{{ strtoupper(str_replace('_',' ', $m->status)) }}</span></td></tr>
            <tr><td class="k">Category</td><td style="text-transform:capitalize">{{ $m->category }}</td>
                <td class="k">Priority</td><td style="text-transform:capitalize">{{ $m->priority }}</td></tr>
            <tr><td class="k">Location</td><td>{{ $m->space?->name ?? $m->location_text ?? '—' }}{{ $m->space?->floor?->name ? ' · '.$m->space->floor->name : '' }}</td>
                <td class="k">Tenant</td><td>{{ $m->tenant?->company_name ?? '—' }}</td></tr>
            <tr><td class="k">Job Type</td><td style="text-transform:capitalize">{{ $m->job_type ?? 'Unassigned' }}</td>
                <td class="k">Assigned To</td><td>{{ $m->assignedEmployee?->full_name ?? $m->vendor?->name ?? '—' }}</td></tr>
            <tr><td class="k">Logged By</td><td>{{ $m->createdBy?->name ?? 'System' }}</td>
                <td class="k">Reported</td><td>{{ $m->created_at?->format('d M Y') }}{{ $m->resolved_at ? ' · Resolved '.$m->resolved_at->format('d M Y') : '' }}</td></tr>
        </table>

        @if($m->job_type === 'outsourced')
        <div class="cost-box">
            <strong>Outsourced to {{ $m->vendor?->name }}</strong> — Cost: <strong>${{ number_format((float)$m->estimated_cost, 2) }}</strong>
            @if($m->vendorBill) · Vendor Bill: <strong>{{ $m->vendorBill->bill_code }}</strong>@endif
        </div>
        @endif

        <h3 class="block">Reported Problem (Before)</h3>
        <div class="notes">{{ $m->description ?: 'No description provided.' }}</div>
        @if(count($before))
        <table class="photos" style="width:100%;margin-top:10px;">
            @foreach(array_chunk($before, 2) as $row)
            <tr>@foreach($row as $src)<td><img src="{{ $src }}"></td>@endforeach @if(count($row)===1)<td></td>@endif</tr>
            @endforeach
        </table>
        @else <p class="empty">No before photos.</p> @endif

        <h3 class="block">Resolution (After)</h3>
        <div class="notes">{{ $m->resolution_notes ?: 'Not yet resolved.' }}</div>
        @if(count($after))
        <table class="photos" style="width:100%;margin-top:10px;">
            @foreach(array_chunk($after, 2) as $row)
            <tr>@foreach($row as $src)<td><img src="{{ $src }}"></td>@endforeach @if(count($row)===1)<td></td>@endif</tr>
            @endforeach
        </table>
        @else <p class="empty">No after photos.</p> @endif
    </div>

    <div class="footer">{{ $building['name'] ?? 'Haleelo Tower' }} · Maintenance Report · {{ $m->request_code }}</div>
</body>
</html>
