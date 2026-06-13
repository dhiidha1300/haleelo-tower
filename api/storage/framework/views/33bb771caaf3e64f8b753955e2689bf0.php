<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        * { font-family: DejaVu Sans, sans-serif; }
        body { margin: 0; color: #333; font-size: 10px; }
        .header { background: #1B2D4F; color: #fff; padding: 18px 28px; }
        .brand { font-size: 20px; font-weight: bold; color: #C9A052; }
        .report-title { font-size: 15px; margin-top: 4px; }
        .meta { padding: 8px 28px; color: #888; font-size: 9px; border-bottom: 1px solid #eee; }
        table { width: 100%; border-collapse: collapse; margin: 16px 28px; width: calc(100% - 56px); }
        th { background: #1B2D4F; color: #fff; text-align: left; padding: 6px 8px; font-size: 9px; }
        td { padding: 5px 8px; border-bottom: 1px solid #eee; font-size: 9px; }
        tr:nth-child(even) td { background: #f9f9f9; }
        .footer { text-align: center; color: #aaa; font-size: 8px; margin-top: 20px; padding: 10px; }
    </style>
</head>
<body>
    <div class="header">
        <div class="brand"><?php echo e($building); ?></div>
        <div class="report-title"><?php echo e($title); ?></div>
    </div>
    <div class="meta">Generated <?php echo e($generated); ?></div>

    <table>
        <thead>
            <tr>
                <?php $__currentLoopData = $headers; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $h): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                    <th <?php if($loop->index > 0 && $loop->last): ?> style="text-align:right;" <?php endif; ?>><?php echo e($h); ?></th>
                <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
            </tr>
        </thead>
        <tbody>
            <?php $__empty_1 = true; $__currentLoopData = $rows; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $row): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); $__empty_1 = false; ?>
                <tr>
                    <?php $__currentLoopData = $row; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $i => $cell): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                        <td <?php if($i === count($row) - 1): ?> style="text-align:right;" <?php endif; ?>><?php echo e($cell); ?></td>
                    <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
                </tr>
            <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); if ($__empty_1): ?>
                <tr><td colspan="<?php echo e(count($headers)); ?>" style="text-align:center;color:#aaa;padding:20px;">No data for this report.</td></tr>
            <?php endif; ?>
        </tbody>
    </table>

    <div class="footer"><?php echo e($building); ?> · Confidential financial report</div>
</body>
</html>
<?php /**PATH D:\haleelo-tower\api\resources\views/pdfs/report.blade.php ENDPATH**/ ?>