<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ElectricityRate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class ElectricityRateController extends Controller
{
    public function index(): JsonResponse
    {
        $rates = ElectricityRate::with('creator:id,name')
            ->orderByDesc('effective_from')
            ->get();

        return response()->json($rates);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'rate_per_kwh'   => 'required|numeric|min:0.0001',
            'effective_from' => 'required|date',
        ]);

        $newFrom = $request->effective_from;

        DB::transaction(function () use ($request, $newFrom) {
            // Close the current open-ended rate: set its effective_to to one day
            // before the new rate's effective_from.
            ElectricityRate::whereNull('effective_to')
                ->where('effective_from', '<', $newFrom)
                ->update([
                    'effective_to' => \Carbon\Carbon::parse($newFrom)->subDay()->toDateString(),
                ]);

            ElectricityRate::create([
                'rate_per_kwh'   => $request->rate_per_kwh,
                'effective_from' => $newFrom,
                'effective_to'   => null,
                'created_by'     => Auth::id(),
            ]);
        });

        return response()->json([
            'current' => ElectricityRate::current(),
            'history' => ElectricityRate::with('creator:id,name')->orderByDesc('effective_from')->get(),
        ], 201);
    }
}
