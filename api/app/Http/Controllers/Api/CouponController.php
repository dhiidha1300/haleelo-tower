<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Coupon;
use App\Models\User;
use App\Services\AuditService;
use App\Services\CouponService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CouponController extends Controller
{
    public function __construct(
        private CouponService $coupons,
        private AuditService $audit
    ) {}

    /** Super Admin: list every staff user with their coupon (creating rows as needed). */
    public function index(): JsonResponse
    {
        $users = User::where('status', 'active')->orderBy('name')->get();
        $rows = $users->map(function (User $u) {
            $c = $this->coupons->ensureForUser($u);
            return [
                'coupon_id'        => $c->id,
                'user_id'          => $u->id,
                'name'             => $u->name,
                'role'             => $u->getRoleNames()->first(),
                'code'             => $c->code,
                'discount_percent' => (float) $c->discount_percent,
                'active'           => $c->active,
                'role_cap'         => $this->coupons->roleCap($u),
            ];
        });

        return response()->json(['coupons' => $rows]);
    }

    /** Super Admin: set discount %, active flag, and/or regenerate the code. */
    public function update(Request $request, Coupon $coupon): JsonResponse
    {
        $data = $request->validate([
            'discount_percent' => 'sometimes|numeric|min:0|max:100',
            'active'           => 'sometimes|boolean',
            'regenerate'       => 'sometimes|boolean',
        ]);

        $cap = $this->coupons->roleCap($coupon->user);
        if (isset($data['discount_percent']) && $data['discount_percent'] > $cap) {
            return response()->json([
                'message' => "Discount exceeds this user's role limit of {$cap}%.",
            ], 422);
        }

        $update = array_intersect_key($data, array_flip(['discount_percent', 'active']));
        if (!empty($data['regenerate'])) {
            $update['code'] = $this->coupons->generateCode($coupon->user);
        }

        $coupon->update($update);
        $this->audit->log('updated', Coupon::class, $coupon->id, null, $coupon->only(['code', 'discount_percent', 'active']));

        return response()->json($coupon->fresh());
    }

    /** Used during booking creation to validate a code and preview the discount. */
    public function validateCode(Request $request): JsonResponse
    {
        $request->validate(['code' => 'required|string']);
        try {
            $coupon = $this->coupons->validateCode($request->input('code'));
            return response()->json([
                'valid'            => true,
                'coupon_id'        => $coupon->id,
                'discount_percent' => (float) $coupon->discount_percent,
                'owner'            => $coupon->user?->name,
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['valid' => false, 'message' => $e->getMessage()], 422);
        }
    }
}
