<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\UserRequest;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    public function index()
    {
        $users = User::with('roles')->get();

        return $this->success($users, 'Users retrieved successfully');
    }

    public function show($id)
    {
        $user = User::with('roles')->find($id);

        if (!$user) {
            return $this->error('User not found', 404);
        }

        $user->all_permissions = $user->getAllPermissions()->pluck('name');

        return $this->success($user, 'User retrieved successfully');
    }

    public function store(UserRequest $request)
    {
        $validated = $request->validated();

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
        ]);

        $user->assignRole($validated['role']);

        if (!empty($validated['permissions'])) {
            $user->givePermissionTo($validated['permissions']);
        }

        $user->all_permissions = $user->getAllPermissions()->pluck('name');

        return $this->success($user->load('roles'), 'User created successfully', 201);
    }

    public function update(UserRequest $request, int $id)
    {
        $user = User::find($id);

        if (!$user) {
            return $this->error('User not found', 404);
        }

        $validated = $request->validated();

        if (isset($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        }

        $user->update(collect($validated)->except(['role', 'permissions'])->toArray());

        if (isset($validated['role'])) {
            $user->syncRoles([$validated['role']]);
        }

        if (isset($validated['permissions'])) {
            $user->syncPermissions($validated['permissions']);
        }

        $user->all_permissions = $user->getAllPermissions()->pluck('name');

        return $this->success($user->load('roles'), 'User updated successfully');
    }

    public function destroy(int $id)
    {
        if ($id === auth()->id()) {
            return $this->error('You cannot delete your own account', 403);
        }

        $user = User::find($id);

        if (!$user) {
            return $this->error('User not found', 404);
        }

        $user->delete();

        return $this->success(null, 'User deleted successfully');
    }

    public function getRolesAndPermissions()
    {
        $roles = Role::pluck('name');
        $permissions = Permission::pluck('name');

        return $this->success([
            'roles' => $roles,
            'permissions' => $permissions,
        ], 'Roles and permissions retrieved successfully');
    }
}
