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
            <td><div class="brand"><?php echo e($building['name']); ?></div><div style="font-size:11px;color:#cbd5e1;"><?php echo e($building['address']); ?></div></td>
            <td><div class="doc-title"><?php echo e($title); ?></div><div class="doc-code"><?php echo e($code); ?></div></td>
        </tr></table>
    </div>

    <div class="amount-box">
        <table style="width:100%;"><tr>
            <td style="color:#fff;font-size:14px;vertical-align:middle;"><?php echo e($amountLabel ?? 'AMOUNT'); ?></td>
            <td class="amt" style="text-align:right;">$<?php echo e(number_format((float) $amount, 2)); ?></td>
        </tr></table>
    </div>

    <div class="section">
        <table class="kv">
            <?php $__currentLoopData = $rows; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $label => $value): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                <tr><td class="label"><?php echo e($label); ?></td><td class="value"><?php echo e($value); ?></td></tr>
            <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
        </table>
    </div>

    <div class="sign">
        <div class="sign-line">Authorised signature</div>
    </div>

    <div class="footer"><?php echo e($building['name']); ?> · This document serves as official proof of the transaction above.</div>
</body>
</html>
<?php /**PATH D:\haleelo-tower\api\resources\views/pdfs/voucher.blade.php ENDPATH**/ ?>