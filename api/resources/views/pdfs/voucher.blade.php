<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        * { font-family: DejaVu Sans, sans-serif; }
        body { margin: 0; color: #333; font-size: 12px; }
        .header { background: #1B2D4F; color: #fff; padding: 24px 32px; }
        .brand { font-size: 24px; font-weight: bold; color: #C9A052; }
        .doc-title { font-size: 18px; text-align: right; }
        .doc-code { font-size: 12px; color: #cbd5e1; text-align: right; }
        .section { padding: 24px 32px; }
        table.kv { width: 100%; border-collapse: collapse; }
        table.kv td { padding: 8px 0; border-bottom: 1px solid #eee; }
        table.kv td.label { color: #888; width: 40%; }
        table.kv td.value { font-weight: bold; text-align: right; }
        .amount-box { margin: 24px 32px; padding: 16px 20px; background: #C9A052; color: #fff; border-radius: 8px; }
        .amount-box .amt { font-size: 26px; font-weight: bold; }
        .sign { margin: 40px 32px 0; }
        .sign-line { border-top: 1px solid #999; width: 220px; padding-top: 6px; font-size: 11px; color: #888; }
        .footer { text-align: center; color: #aaa; font-size: 10px; margin-top: 30px; padding: 12px; border-top: 1px solid #eee; }
    </style>
</head>
<body>
    <div class="header">
        <table style="width:100%;"><tr>
            <td><div class="brand">{{ $building['name'] }}</div><div style="font-size:11px;color:#cbd5e1;">{{ $building['address'] }}</div></td>
            <td><div class="doc-title">{{ $title }}</div><div class="doc-code">{{ $code }}</div></td>
        </tr></table>
    </div>

    <div class="amount-box">
        <table style="width:100%;"><tr>
            <td style="color:#fff;font-size:14px;vertical-align:middle;">{{ $amountLabel ?? 'AMOUNT' }}</td>
            <td class="amt" style="text-align:right;">${{ number_format((float) $amount, 2) }}</td>
        </tr></table>
    </div>

    <div class="section">
        <table class="kv">
            @foreach($rows as $label => $value)
                <tr><td class="label">{{ $label }}</td><td class="value">{{ $value }}</td></tr>
            @endforeach
        </table>
    </div>

    <div class="sign">
        <div class="sign-line">Authorised signature</div>
    </div>

    <div class="footer">{{ $building['name'] }} · This document serves as official proof of the transaction above.</div>
</body>
</html>
