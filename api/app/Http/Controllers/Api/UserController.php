<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\UserService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class UserController extends Controller
{
    public function __construct(private UserService $userService) {}

    public function index(Request $request): JsonResponse
    {
        $query = User::with('roles');

        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where('name', 'like', "%$search%")
                ->orWhere('email', 'like', "%$search%");
        }

        if ($request->has('role')) {
            $query->role($request->input('role'));
        }

        if ($request->has('status')) {
            $query->where('status', $request->input('status'));
        }

        $users = $query->latest('created_at')->paginate(25);

        return response()->json($users);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'phone' => 'required|string|max:20',
            'job_title' => 'required|string|max:255',
            'role' => 'required|string|exists:roles,name',
            'password' => 'nullable|string|min:8',
            'status' => 'nullable|in:active,inactive',
        ]);

        try {
            $user = $this->userService->createUser($request->all());

            return response()->json($this->userService->getUserWithPermissions($user), 201);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Validation Error',
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    public function show(User $user): JsonResponse
    {
        return response()->json($this->userService->getUserWithPermissions($user));
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $request->validate([
            'name' => 'string|max:255',
            'email' => 'email|unique:users,email,' . $user->id,
            'phone' => 'string|max:20',
            'job_title' => 'string|max:255',
            'role' => 'string|exists:roles,name',
            'status' => 'in:active,inactive',
            'profile_photo_url' => 'nullable|url',
        ]);

        try {
            $user = $this->userService->updateUser($user, $request->all());

            return response()->json($this->userService->getUserWithPermissions($user));
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Validation Error',
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    public function destroy(User $user): JsonResponse
    {
        try {
            $this->userService->deactivateUser($user);

            return response()->json([
                'message' => 'User deactivated successfully.',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Error',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    public function reactivate(User $user): JsonResponse
    {
        try {
            $user = $this->userService->reactivateUser($user);

            return response()->json($this->userService->getUserWithPermissions($user));
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Error',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    public function changePassword(Request $request): JsonResponse
    {
        $request->validate([
            'current_password' => 'required|string',
            'new_password' => 'required|string|min:8',
            'new_password_confirmation' => 'required|string|same:new_password',
        ]);

        $user = auth()->user();

        try {
            if (!\Illuminate\Support\Facades\Hash::check($request->current_password, $user->password)) {
                return response()->json([
                    'error' => 'Validation Error',
                    'message' => 'Current password is incorrect.',
                ], 422);
            }

            $this->userService->changePassword($user, $request->new_password);

            return response()->json([
                'message' => 'Password changed successfully.',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Error',
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    public function resetPassword(Request $request, User $user): JsonResponse
    {
        $request->validate([
            'new_password' => 'required|string|min:8',
        ]);

        try {
            $this->userService->resetPassword($user, $request->new_password);

            return response()->json([
                'message' => 'Password reset successfully.',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Error',
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    public function unlock(User $user): JsonResponse
    {
        $user = $this->userService->unlockUser($user);

        return response()->json([
            'message' => 'User unlocked successfully.',
            'user' => $this->userService->getUserWithPermissions($user),
        ]);
    }
}
