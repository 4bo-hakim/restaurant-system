<?php

use App\Http\Controllers\Api\Admin\CategoryController;
use App\Http\Controllers\Api\Admin\UserController;
use App\Http\Controllers\Api\AuthController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::post('/login', [AuthController::class, 'login']);
Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');

Route::prefix('admin')->middleware(['auth:sanctum'])->group(function () {
    Route::get('/roles-permissions', [UserController::class, 'getRolesAndPermissions']);

    Route::apiResource('/users', UserController::class);
    Route::middleware(['auth:sanctum', 'role:admin'])->group(function () {
        Route::post('/admin/users', [UserController::class, 'store']);
        Route::apiResource('/categories', CategoryController::class);
    });
});
