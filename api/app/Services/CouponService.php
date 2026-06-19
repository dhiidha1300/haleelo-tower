<?php

namespace App\Services;

use App\Models\Coupon;
use App\Models\User;
use Illuminate\Support\Str;

/**
 * Staff coupon codes (B5). Each staff user can have one code with a fixed
 * discount %, capped by their role. Discounts apply to bookings and post to the
 * contra-revenue account 3090 (handled in InvoiceService).
 */
class CouponService
{
    /** Maximum discount % a user's role may grant. */
    public function roleCap(User $user): float
    {
        return match (true) {
            $user->hasRole('super_admin') => 100.0,
            $user->hasRole('admin')       => 50.0,
            $user->hasRole('finance')     => 30.0,
            $user->hasRole('operations')  => 25.0,
            default                       => 0.0,
        };
    }

    public function generateCode(User $user): string
    {
        $prefix = strtoupper(Str::substr(preg_replace('/[^A-Za-z]/', '', $user->name) ?: 'STAFF', 0, 4));
        do {
            $code = $prefix . '-' . strtoupper(Str::random(4));
        } while (Coupon::where('code', $code)->exists());
        return $code;
    }

    /** Ensure a user has a coupon row (created inactive at 0% until configured). */
    public function ensureForUser(User $user): Coupon
    {
        return Coupon::firstOrCreate(
            ['user_id' => $user->id],
            ['code' => $this->generateCode($user), 'discount_percent' => 0, 'active' => false]
        );
    }

    /** Validate a code for use on a booking. Returns the coupon or throws. */
    public function validateCode(string $code): Coupon
    {
        $coupon = Coupon::with('user')->where('code', $code)->first();
        if (!$coupon || !$coupon->active) {
            throw new \InvalidArgumentException('Invalid or inactive coupon code.');
        }
        if ((float) $coupon->discount_percent <= 0) {
            throw new \InvalidArgumentException('This coupon has no discount set.');
        }
        return $coupon;
    }

    /** Discount amount for a gross figure, rounded to 2dp. */
    public function discountAmount(string $gross, float $percent): string
    {
        return bcdiv(bcmul($gross, (string) $percent, 4), '100', 2);
    }
}
