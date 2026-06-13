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
        .section { padding: 0 32px; }
        .label { color: #888; font-size: 10px; text-transform: uppercase; }
        .value { font-weight: bold; }
        table.kv { width: 100%; margin-top: 20px; }
        table.kv td { padding: 3px 0; vertical-align: top; }
        table.earn { width: 100%; border-collapse: collapse; margin-top: 20px; }
        table.earn th { background: #1B2D4F; color: #fff; text-align: left; padding: 8px 10px; font-size: 11px; }
        table.earn th.num, table.earn td.num { text-align: right; }
        table.earn td { padding: 7px 10px; border-bottom: 1px solid #eee; }
        .netbox { margin: 24px 32px; padding: 16px 20px; background: #1B2D4F; color: #fff; border-radius: 8px; }
        .netbox .amt { font-size: 26px; font-weight: bold; color: #C9A052; }
        .footer { text-align: center; color: #aaa; font-size: 10px; margin-top: 24px; padding: 12px; border-top: 1px solid #eee; }
    </style>
</head>
<body>
    <div class="header">
        <table style="width:100%;"><tr>
            <td><div class="brand"><?php echo e($building['name']); ?></div><div style="font-size:11px;color:#cbd5e1;"><?php echo e($building['address']); ?></div></td>
            <td><div class="doc-title">PAYSLIP</div><div style="font-size:11px;color:#cbd5e1;text-align:right;"><?php echo e($slip->payslip_code); ?></div></td>
        </tr></table>
    </div>

    <div class="section">
        <table class="kv">
            <tr>
                <td width="50%">
                    <div class="label">Employee</div>
                    <div class="value"><?php echo e($slip->employee->full_name); ?></div>
                    <div><?php echo e($slip->employee->job_title); ?></div>
                    <div style="color:#888;font-size:11px;"><?php echo e(ucfirst(str_replace('_',' ', $slip->employee->department))); ?> · <?php echo e($slip->employee->employee_code); ?></div>
                </td>
                <td width="50%">
                    <table style="width:100%;">
                        <tr><td class="label">Pay Period</td><td class="value" style="text-align:right;"><?php echo e($slip->payrollRun->month); ?></td></tr>
                        <tr><td class="label">Run</td><td class="value" style="text-align:right;"><?php echo e($slip->payrollRun->run_code); ?></td></tr>
                        <tr><td class="label">Employment</td><td class="value" style="text-align:right;"><?php echo e(ucfirst(str_replace('_',' ', $slip->employee->employment_type))); ?></td></tr>
                    </table>
                </td>
            </tr>
        </table>

        <table class="earn">
            <tr><th>Attendance</th><th class="num">Value</th></tr>
            <tr><td>Working days in month</td><td class="num"><?php echo e($slip->working_days_in_month); ?></td></tr>
            <tr><td>Days worked</td><td class="num"><?php echo e($slip->days_worked); ?></td></tr>
        </table>

        <table class="earn">
            <tr><th>Earnings & Deductions</th><th class="num">Amount</th></tr>
            <tr><td>Base pay <?php echo e($slip->employee->employment_type === 'salaried' ? '(prorated)' : '(daily rate)'); ?></td><td class="num">$<?php echo e(number_format($slip->base_pay, 2)); ?></td></tr>
            <tr><td>Overtime pay</td><td class="num">$<?php echo e(number_format($slip->overtime_pay, 2)); ?></td></tr>
            <tr><td><strong>Gross Pay</strong></td><td class="num"><strong>$<?php echo e(number_format($slip->gross_pay, 2)); ?></strong></td></tr>
            <tr><td>Less: Deductions</td><td class="num">− $<?php echo e(number_format($slip->total_deductions, 2)); ?></td></tr>
        </table>
    </div>

    <div class="netbox">
        <table style="width:100%;"><tr>
            <td style="color:#fff;font-size:14px;vertical-align:middle;">NET PAY</td>
            <td class="amt" style="text-align:right;">$<?php echo e(number_format($slip->net_pay, 2)); ?></td>
        </tr></table>
    </div>

    <div class="footer"><?php echo e($building['name']); ?> · This is a system-generated payslip.</div>
</body>
</html>
<?php /**PATH D:\haleelo-tower\api\resources\views/pdfs/payslip.blade.php ENDPATH**/ ?>