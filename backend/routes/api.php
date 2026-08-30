<?php

use App\Http\Controllers\Api\Admin\CategoryController;
use App\Http\Controllers\Api\Admin\FoodController;
use App\Http\Controllers\Api\Admin\SubCategoryController;
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

    Route::get('/categories', [CategoryController::class, 'index']);
    Route::get('/categories/{id}', [CategoryController::class, 'show']);
    Route::post('/categories', [CategoryController::class, 'store'])->middleware('permission:create_category');
    Route::put('/categories/{id}', [CategoryController::class, 'update'])->middleware('permission:update_category');
    Route::delete('/categories/{id}', [CategoryController::class, 'destroy'])->middleware('permission:delete_category');

    Route::get('/sub-categories', [SubCategoryController::class, 'index']);
    Route::get('/sub-categories/{id}', [SubCategoryController::class, 'show']);
    Route::post('/sub-categories', [SubCategoryController::class, 'store'])->middleware('permission:create_sub_category');
    Route::put('/sub-categories/{id}', [SubCategoryController::class, 'update'])->middleware('permission:update_sub_category');
    Route::delete('/sub-categories/{id}', [SubCategoryController::class, 'destroy'])->middleware('permission:delete_sub_category');

    Route::get('/foods', [FoodController::class, 'index']);
    Route::get('/foods/{id}', [FoodController::class, 'show']);
    Route::post('/foods', [FoodController::class, 'store'])->middleware('permission:create_food');
    Route::put('/foods/{id}', [FoodController::class, 'update'])->middleware('permission:update_food');
    Route::delete('/foods/{id}', [FoodController::class, 'destroy'])->middleware('permission:delete_food');

    Route::apiResource('/users', UserController::class);
    Route::middleware(['auth:sanctum', 'role:admin'])->group(function () {
        Route::post('/admin/users', [UserController::class, 'store']);
    });
});
