<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: DejaVu Sans, sans-serif; font-size: 11px; color: #333; }
    .header { background: #1B2D4F; color: white; padding: 20px 24px; margin-bottom: 20px; }
    .header h1 { font-size: 20px; color: #C9A052; font-weight: bold; }
    .header p  { font-size: 11px; opacity: 0.8; margin-top: 4px; }
    .meta { padding: 0 24px 16px; font-size: 10px; color: #666; }
    table { width: 100%; border-collapse: collapse; margin: 0 24px; width: calc(100% - 48px); }
    th { background: #f1f1f1; padding: 8px 10px; text-align: left; font-size: 10px;
         text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #ddd; }
    td { padding: 7px 10px; border-bottom: 1px solid #eee; vertical-align: top; }
    tr:nth-child(even) td { background: #fafafa; }
    .badge { display: inline-block; padding: 2px 6px; border-radius: 3px; font-size: 9px; font-weight: bold; }
    .badge-login    { background: #ede9fe; color: #6d28d9; }
    .badge-logout   { background: #f3f4f6; color: #374151; }
    .badge-created  { background: #d1fae5; color: #065f46; }
    .badge-updated  { background: #dbeafe; color: #1e40af; }
    .badge-deleted  { background: #fee2e2; color: #991b1b; }
    .badge-exported { background: #fef3c7; color: #92400e; }
    .footer { margin-top: 20px; padding: 12px 24px; border-top: 1px solid #eee;
              font-size: 9px; color: #999; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Haleelo Tower</h1>
    <p>Audit Log Export — Generated {{ now()->format('d M Y, H:i') }} EAT</p>
  </div>

  <div class="meta">
    @if($filters['start_date'] || $filters['end_date'])
      Period: {{ $filters['start_date'] ?? 'All' }} → {{ $filters['end_date'] ?? 'Now' }} &nbsp;|&nbsp;
    @endif
    @if($filters['action']) Action: {{ ucfirst($filters['action']) }} &nbsp;|&nbsp; @endif
    @if($filters['model_type']) Resource: {{ $filters['model_type'] }} &nbsp;|&nbsp; @endif
    Total records: {{ $logs->count() }}
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:18%">User</th>
        <th style="width:10%">Action</th>
        <th style="width:16%">Resource</th>
        <th style="width:10%">ID</th>
        <th style="width:20%">Date & Time</th>
        <th style="width:26%">IP Address</th>
      </tr>
    </thead>
    <tbody>
      @forelse($logs as $log)
        <tr>
          <td>
            <strong>{{ $log->user_name ?? 'System' }}</strong><br>
            <span style="color:#888;font-size:9px">{{ $log->user_role ?? '' }}</span>
          </td>
          <td>
            <span class="badge badge-{{ strtolower($log->action) }}">
              {{ ucfirst($log->action) }}
            </span>
          </td>
          <td>{{ class_basename($log->model_type ?? '') }}</td>
          <td>{{ $log->model_id }}</td>
          <td>{{ \Carbon\Carbon::parse($log->created_at)->setTimezone('Africa/Mogadishu')->format('d M Y H:i') }}</td>
          <td style="color:#888">{{ $log->ip_address }}</td>
        </tr>
      @empty
        <tr><td colspan="6" style="text-align:center;color:#999;padding:20px">No records found</td></tr>
      @endforelse
    </tbody>
  </table>

  <div class="footer">
    Haleelo Tower · Audit Log · Confidential · {{ now()->format('Y') }}
  </div>
</body>
</html>
