<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CateringPackage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CateringPackageController extends Controller
{
    public function index(): JsonResponse
    {
        $packages = CateringPackage::with('items')->orderBy('id')->get();
        return response()->json($packages);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'        => 'required|string|max:255',
            'description' => 'nullable|string',
            'base_price'  => 'required|numeric|min:0',
            'active'      => 'boolean',
            'items'       => 'array',
            'items.*.service_name' => 'required|string|max:255',
            'items.*.description'  => 'nullable|string',
        ]);

        $package = CateringPackage::create([
            'name'        => $validated['name'],
            'slug'        => Str::slug($validated['name']),
            'description' => $validated['description'] ?? null,
            'base_price'  => $validated['base_price'],
            'active'      => $validated['active'] ?? true,
        ]);

        if (!empty($validated['items'])) {
            foreach ($validated['items'] as $item) {
                $package->items()->create($item);
            }
        }

        return response()->json($package->load('items'), 201);
    }

    public function update(Request $request, CateringPackage $cateringPackage): JsonResponse
    {
        $validated = $request->validate([
            'name'        => 'required|string|max:255',
            'description' => 'nullable|string',
            'base_price'  => 'required|numeric|min:0',
            'active'      => 'boolean',
            'items'       => 'array',
            'items.*.service_name' => 'required|string|max:255',
            'items.*.description'  => 'nullable|string',
        ]);

        $cateringPackage->update([
            'name'        => $validated['name'],
            'slug'        => Str::slug($validated['name']),
            'description' => $validated['description'] ?? null,
            'base_price'  => $validated['base_price'],
            'active'      => $validated['active'] ?? $cateringPackage->active,
        ]);

        // Replace items wholesale
        if (isset($validated['items'])) {
            $cateringPackage->items()->delete();
            foreach ($validated['items'] as $item) {
                $cateringPackage->items()->create($item);
            }
        }

        return response()->json($cateringPackage->load('items'));
    }

    public function toggle(CateringPackage $cateringPackage): JsonResponse
    {
        $cateringPackage->update(['active' => !$cateringPackage->active]);
        return response()->json($cateringPackage->load('items'));
    }

    public function destroy(CateringPackage $cateringPackage): JsonResponse
    {
        $cateringPackage->items()->delete();
        $cateringPackage->delete();
        return response()->json(['message' => 'Package deleted.']);
    }
}
