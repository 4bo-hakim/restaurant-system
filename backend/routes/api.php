<?php

use App\Http\Controllers\Api\Admin\CategoryController;
use App\Http\Controllers\Api\Admin\FoodController;
use App\Http\Controllers\Api\Admin\ReservationController;
use App\Http\Controllers\Api\Admin\SubCategoryController;
use App\Http\Controllers\Api\Admin\TableController;
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

    Route::apiResource('/categories', CategoryController::class);
    Route::apiResource('/sub-categories', SubCategoryController::class);
    Route::apiResource('/foods', FoodController::class);

    Route::apiResource('/users', UserController::class);

    // Tables routes
    Route::apiResource('/tables', TableController::class);
    // Reservations routes
    Route::apiResource('/reservations', ReservationController::class);

    Route::middleware(['auth:sanctum', 'role:admin'])->group(function () {});
});
