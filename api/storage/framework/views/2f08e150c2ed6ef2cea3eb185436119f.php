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
                    <div class="brand"><?php echo e($building['name'] ?? 'Haleelo Tower'); ?></div>
                    <div class="brand-sub"><?php echo e($building['address'] ?? 'Mogadishu, Somalia'); ?></div>
                </td>
                <td>
                    <div class="doc-title">INVOICE</div>
                    <div class="doc-code"><?php echo e($invoice->invoice_code); ?></div>
                </td>
            </tr>
        </table>
    </div>

    <div class="section">
        <table class="meta-table">
            <tr>
                <td width="50%">
                    <div class="label">Bill To</div>
                    <div class="value"><?php echo e($invoice->billToName()); ?></div>
                    <?php if($invoice->bill_to_email): ?><div><?php echo e($invoice->bill_to_email); ?></div><?php endif; ?>
                    <?php if($invoice->bill_to_phone): ?><div><?php echo e($invoice->bill_to_phone); ?></div><?php endif; ?>
                    <?php if($invoice->lpo_number): ?><div style="margin-top:6px;"><span class="label">LPO No:</span> <strong><?php echo e($invoice->lpo_number); ?></strong></div><?php endif; ?>
                </td>
                <td width="50%">
                    <table style="width:100%;">
                        <tr><td class="label">Issue Date</td><td class="value" style="text-align:right;"><?php echo e($invoice->issue_date->format('d M Y')); ?></td></tr>
                        <tr><td class="label">Due Date</td><td class="value" style="text-align:right;"><?php echo e($invoice->due_date->format('d M Y')); ?></td></tr>
                        <?php if($invoice->billing_period_start): ?>
                        <tr><td class="label">Period</td><td class="value" style="text-align:right;"><?php echo e($invoice->billing_period_start->format('d M')); ?> – <?php echo e($invoice->billing_period_end->format('d M Y')); ?></td></tr>
                        <?php endif; ?>
                        <tr><td class="label">Status</td><td style="text-align:right;">
                            <span class="status-badge" style="background:
                                <?php if($invoice->status==='paid'): ?>#d1fae5;color:#065f46;
                                <?php elseif($invoice->status==='overdue'): ?>#fee2e2;color:#991b1b;
                                <?php elseif($invoice->status==='partial'): ?>#fef3c7;color:#92400e;
                                <?php else: ?>#e5e7eb;color:#374151;<?php endif; ?>">
                                <?php echo e(strtoupper($invoice->status)); ?>

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
                <?php $__currentLoopData = $invoice->lineItems; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $item): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                <tr>
                    <td><?php echo e($item->description); ?></td>
                    <td class="num"><?php echo e(rtrim(rtrim(number_format($item->quantity, 2), '0'), '.')); ?></td>
                    <td class="num">$<?php echo e(number_format($item->unit_price, 2)); ?></td>
                    <td class="num">$<?php echo e(number_format($item->line_total, 2)); ?></td>
                </tr>
                <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
            </tbody>
        </table>

        <table class="totals">
            <tr><td class="label">Subtotal</td><td class="num" style="text-align:right;">$<?php echo e(number_format($invoice->subtotal, 2)); ?></td></tr>
            <tr class="grand"><td>TOTAL DUE</td><td style="text-align:right;">$<?php echo e(number_format($invoice->total_amount, 2)); ?></td></tr>
        </table>
    </div>

    <div class="pay-box">
        <div class="pay-title">Payment Instructions</div>
        <div style="font-size:11px; color:#666; margin-bottom:8px;">Pay via any of the accounts below, quoting invoice code <strong><?php echo e($invoice->invoice_code); ?></strong>:</div>
        <table class="pay-table">
            <?php $__currentLoopData = $accounts; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $acc): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
            <tr>
                <td><strong><?php echo e($acc['name']); ?></strong></td>
                <td><?php echo e(ucfirst(str_replace('_',' ', $acc['type']))); ?></td>
                <td style="text-align:right;"><?php echo e($acc['identifier'] ?? '—'); ?></td>
            </tr>
            <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
        </table>
    </div>

    <div class="footer">
        <?php echo e($building['name'] ?? 'Haleelo Tower'); ?> · <?php echo e($building['phone'] ?? ''); ?> · <?php echo e($building['email'] ?? ''); ?><br>
        Thank you for your business.
    </div>
</body>
</html>
<?php /**PATH D:\haleelo-tower\api\resources\views/pdfs/invoice.blade.php ENDPATH**/ ?>