<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Space;
use App\Models\Floor;
use App\Models\ProductService;
use App\Services\AuditService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ProductController extends Controller
{
    public function __construct(private AuditService $auditService) {}

    public function index(Request $request): JsonResponse
    {
        $query = Space::with('floor')->withCount('bookings');

        if ($request->filled('type')) {
            $query->where('type', $request->input('type'));
        }
        if ($request->filled('floor_id')) {
            $query->where('floor_id', $request->input('floor_id'));
        }
        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where('name', 'like', "%$search%");
        }

        $products = $query->orderBy('floor_id')->orderBy('name')->paginate(50);

        return response()->json($products);
    }

    public function floors(): JsonResponse
    {
        return response()->json(Floor::orderBy('level')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name'        => 'required|string|max:255',
            'type'        => 'required|in:conference_hall,office_space,educational_space',
            'floor_id'    => 'required|exists:floors,id',
            'capacity'    => 'nullable|integer|min:1',
            'description' => 'nullable|string',
            'amenities'   => 'nullable|array',
            'base_price'  => 'required|numeric|min:0',
            'price_unit'  => 'required|in:per_session,per_month,per_semester',
            'status'      => 'nullable|in:active,inactive',
        ]);

        $slug = $this->uniqueSlug($request->input('name'));

        $product = Space::create([
            'name'        => $request->input('name'),
            'slug'        => $slug,
            'type'        => $request->input('type'),
            'floor_id'    => $request->input('floor_id'),
            'capacity'    => $request->input('capacity'),
            'description' => $request->input('description'),
            'amenities'   => $request->input('amenities', []),
            'base_price'  => $request->input('base_price'),
            'price_unit'  => $request->input('price_unit'),
            'photos'      => [],
            'status'      => $request->input('status', 'active'),
        ]);

        $this->auditService->log('created', Space::class, (int) $product->id, null, $product->toArray());

        return response()->json($product->load('floor'), 201);
    }

    public function show(Space $product): JsonResponse
    {
        return response()->json($product->load(['floor', 'productServices']));
    }

    public function update(Request $request, Space $product): JsonResponse
    {
        $request->validate([
            'name'        => 'sometimes|string|max:255',
            'type'        => 'sometimes|in:conference_hall,office_space,educational_space',
            'floor_id'    => 'sometimes|exists:floors,id',
            'capacity'    => 'nullable|integer|min:1',
            'description' => 'nullable|string',
            'amenities'   => 'nullable|array',
            'base_price'  => 'sometimes|numeric|min:0',
            'price_unit'  => 'sometimes|in:per_session,per_month,per_semester',
            'status'      => 'sometimes|in:active,inactive',
        ]);

        $old = $product->toArray();

        $product->update(array_filter([
            'name'        => $request->input('name'),
            'floor_id'    => $request->input('floor_id'),
            'capacity'    => $request->input('capacity'),
            'description' => $request->input('description'),
            'amenities'   => $request->input('amenities'),
            'base_price'  => $request->input('base_price'),
            'price_unit'  => $request->input('price_unit'),
            'status'      => $request->input('status'),
        ], fn($v) => $v !== null));

        $this->auditService->log('updated', Space::class, (int) $product->id, $old, $product->fresh()->toArray());

        return response()->json($product->fresh()->load(['floor', 'productServices']));
    }

    public function toggle(Space $product): JsonResponse
    {
        $product->update(['status' => $product->status === 'active' ? 'inactive' : 'active']);

        return response()->json(['status' => $product->status, 'message' => "Product {$product->status}."]);
    }

    public function uploadPhoto(Request $request, Space $product): JsonResponse
    {
        $request->validate([
            'photo' => 'required|image|max:5120',
        ]);

        $path = $request->file('photo')->store("spaces/{$product->id}/photos", 'public');
        $url  = Storage::disk('public')->url($path);

        $photos = $product->photos ?? [];
        $photos[] = $url;
        $product->update(['photos' => $photos]);

        return response()->json(['photo_url' => $url, 'photos' => $photos]);
    }

    public function deletePhoto(Request $request, Space $product): JsonResponse
    {
        $request->validate(['photo_url' => 'required|string']);

        $photos = collect($product->photos ?? [])
            ->filter(fn($p) => $p !== $request->input('photo_url'))
            ->values()
            ->all();

        $product->update(['photos' => $photos]);

        return response()->json(['photos' => $photos]);
    }

    // ─── Product Add-on Services ────────────────────────────────────────────────

    public function getServices(Space $product): JsonResponse
    {
        return response()->json(
            $product->productServices()->orderBy('service_type')->orderBy('service_name')->get()
        );
    }

    public function addService(Request $request, Space $product): JsonResponse
    {
        $request->validate([
            'service_name' => 'required|string|max:255',
            'service_type' => 'required|in:cleaning,garbage,internet,parking,security,generator,ac_service,maintenance,storage,printing,coffee_tea,reception,furniture,sound_system,projector_rental,photography,catering_package,dj,cameraman,other',
            'price'        => 'required|numeric|min:0',
            'active'       => 'boolean',
        ]);

        $service = $product->productServices()->create([
            'service_name' => $request->input('service_name'),
            'service_type' => $request->input('service_type'),
            'price'        => $request->input('price'),
            'active'       => $request->boolean('active', true),
        ]);

        return response()->json($service, 201);
    }

    public function updateService(Request $request, Space $product, ProductService $service): JsonResponse
    {
        $request->validate([
            'service_name' => 'sometimes|string|max:255',
            'service_type' => 'sometimes|in:cleaning,garbage,internet,parking,security,generator,ac_service,maintenance,storage,printing,coffee_tea,reception,furniture,sound_system,projector_rental,photography,catering_package,dj,cameraman,other',
            'price'        => 'sometimes|numeric|min:0',
            'active'       => 'sometimes|boolean',
        ]);

        $service->update(array_filter(
            $request->only(['service_name', 'service_type', 'price', 'active']),
            fn ($v) => $v !== null
        ));

        return response()->json($service->fresh());
    }

    public function deleteService(Space $product, ProductService $service): JsonResponse
    {
        $service->delete();
        return response()->json(['message' => 'Add-on removed.']);
    }

    public function reorderPhotos(Request $request, Space $product): JsonResponse
    {
        $request->validate(['photos' => 'required|array']);
        $product->update(['photos' => $request->input('photos')]);
        return response()->json(['photos' => $product->photos]);
    }

    private function uniqueSlug(string $name): string
    {
        $base = Str::slug($name);
        $slug = $base;
        $i    = 1;

        while (Space::withTrashed()->where('slug', $slug)->exists()) {
            $slug = "{$base}-{$i}";
            $i++;
        }

        return $slug;
    }
}
