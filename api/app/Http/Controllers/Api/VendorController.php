<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Vendor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VendorController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Vendor::withCount(['purchaseOrders', 'bills']);

        if ($request->filled('category')) {
            $query->where('category', $request->input('category'));
        }
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where('name', 'like', "%$search%");
        }
        if ($request->boolean('active_only')) {
            $query->where('active', true);
        }

        return response()->json($query->orderBy('name')->paginate(50));
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name'           => 'required|string|max:255',
            'contact_person' => 'nullable|string|max:255',
            'phone'          => 'nullable|string|max:20',
            'email'          => 'nullable|email',
            'category'       => 'required|in:food_supplier,cleaning,equipment,event_materials,other',
            'notes'          => 'nullable|string',
        ]);

        $vendor = Vendor::create($request->all() + ['active' => true]);

        return response()->json($vendor, 201);
    }

    public function show(Vendor $vendor): JsonResponse
    {
        return response()->json($vendor->load(['purchaseOrders', 'bills']));
    }

    public function update(Request $request, Vendor $vendor): JsonResponse
    {
        $request->validate([
            'name'           => 'sometimes|string|max:255',
            'contact_person' => 'nullable|string|max:255',
            'phone'          => 'nullable|string|max:20',
            'email'          => 'nullable|email',
            'category'       => 'sometimes|in:food_supplier,cleaning,equipment,event_materials,other',
            'notes'          => 'nullable|string',
            'active'         => 'sometimes|boolean',
        ]);

        $vendor->update($request->all());

        return response()->json($vendor->fresh());
    }

    public function destroy(Vendor $vendor): JsonResponse
    {
        $vendor->delete();
        return response()->json(['message' => 'Vendor deactivated.']);
    }
}
