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
                    <div class="brand"><?php echo e($building['name'] ?? 'Haleelo Tower'); ?></div>
                    <div class="brand-sub"><?php echo e($building['address'] ?? 'Mogadishu, Somalia'); ?></div>
                </td>
                <td>
                    <div class="doc-title">BOOKING CONFIRMATION</div>
                    <div class="doc-code"><?php echo e($booking->booking_code); ?></div>
                </td>
            </tr>
        </table>
    </div>

    <div class="section">
        <table class="meta-table">
            <tr>
                <td width="55%">
                    <div class="label">Client</div>
                    <div class="value"><?php echo e($booking->client_name); ?></div>
                    <?php if($booking->client_company): ?><div><?php echo e($booking->client_company); ?></div><?php endif; ?>
                    <?php if($booking->client_phone): ?><div><?php echo e($booking->client_phone); ?></div><?php endif; ?>
                    <?php if($booking->client_email): ?><div><?php echo e($booking->client_email); ?></div><?php endif; ?>
                </td>
                <td width="45%">
                    <table style="width:100%;">
                        <tr><td class="label">Date</td><td class="value" style="text-align:right;"><?php echo e($booking->booking_date->format('d M Y')); ?></td></tr>
                        <tr><td class="label">Session</td><td class="value" style="text-align:right;text-transform:capitalize;"><?php echo e($booking->session_type); ?></td></tr>
                        <tr><td class="label">Time</td><td class="value" style="text-align:right;"><?php echo e($booking->start_time); ?> – <?php echo e($booking->end_time); ?></td></tr>
                        <tr><td class="label">Status</td><td style="text-align:right;">
                            <span class="status-badge" style="background:
                                <?php if($booking->status==='booking_approved'): ?>#d1fae5;color:#065f46;
                                <?php elseif($booking->status==='rejected'||$booking->status==='cancelled'): ?>#fee2e2;color:#991b1b;
                                <?php else: ?>#fef3c7;color:#92400e;<?php endif; ?>">
                                <?php echo e(strtoupper(str_replace('_',' ', $booking->status))); ?>

                            </span>
                        </td></tr>
                    </table>
                </td>
            </tr>
        </table>

        <h3 class="block">Venue</h3>
        <table class="kv">
            <tr><td class="k">Space</td><td><?php echo e($booking->product?->name ?? '—'); ?></td></tr>
            <tr><td class="k">Floor</td><td><?php echo e($booking->product?->floor?->name ?? '—'); ?></td></tr>
        </table>

        <h3 class="block">Catering</h3>
        <?php if($booking->cateringPackage): ?>
            <div class="catering-box">
                <div class="catering-pkg"><?php echo e($booking->cateringPackage->name); ?> Package</div>
                <?php if($booking->cateringPackage->description): ?>
                    <div style="color:#666;font-size:11px;"><?php echo e($booking->cateringPackage->description); ?></div>
                <?php endif; ?>
                <?php if($booking->cateringPackage->items->count()): ?>
                    <div class="label" style="margin-top:8px;">Included</div>
                    <ul class="items">
                        <?php $__currentLoopData = $booking->cateringPackage->items; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $item): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                            <li><strong><?php echo e($item->service_name); ?></strong><?php if($item->description): ?> — <?php echo e($item->description); ?><?php endif; ?></li>
                        <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
                    </ul>
                <?php endif; ?>
            </div>
        <?php else: ?>
            <div style="color:#888;font-size:11px;">No catering package selected.</div>
        <?php endif; ?>

        <?php
            $addons = [];
            if ($booking->dj_requested) $addons[] = 'DJ Service';
            if ($booking->cameraman_requested) $addons[] = 'Cameraman Service';
            foreach ((array) $booking->extra_services as $ex) {
                $addons[] = is_array($ex) ? ($ex['name'] ?? json_encode($ex)) : $ex;
            }
        ?>
        <?php if(count($addons)): ?>
            <h3 class="block">Additional Services</h3>
            <div class="addons">
                <?php $__currentLoopData = $addons; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $a): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?><span><?php echo e($a); ?></span><?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
            </div>
        <?php endif; ?>

        <?php if($booking->notes): ?>
            <h3 class="block">Notes</h3>
            <div style="font-size:11px;color:#555;"><?php echo e($booking->notes); ?></div>
        <?php endif; ?>

        <table class="totals">
            <tr class="grand"><td>TOTAL</td><td style="text-align:right;">$<?php echo e(number_format($booking->total_price, 2)); ?></td></tr>
        </table>
    </div>

    <div class="footer">
        <?php echo e($building['name'] ?? 'Haleelo Tower'); ?> · <?php echo e($building['phone'] ?? ''); ?> · <?php echo e($building['email'] ?? ''); ?><br>
        Thank you for choosing <?php echo e($building['name'] ?? 'Haleelo Tower'); ?>.
    </div>
</body>
</html>
<?php /**PATH D:\haleelo-tower\api\resources\views/pdfs/booking.blade.php ENDPATH**/ ?>