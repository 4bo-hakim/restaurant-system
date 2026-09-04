<?php

use App\Http\Controllers\Api\Admin\CategoryController;
use App\Http\Controllers\Api\Admin\DashboardController;
use App\Http\Controllers\Api\Admin\FoodController;
use App\Http\Controllers\Api\Admin\InvoiceController;
use App\Http\Controllers\Api\Admin\InvoiceFoodController;
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

    // Dashboard routes
    Route::get('/dashboard/summary', [DashboardController::class, 'summary'])->middleware('permission:view_reports');
    Route::get('/dashboard/top-items', [DashboardController::class, 'topItems'])->middleware('permission:view_reports');
    Route::get('/dashboard/revenue-by-category', [DashboardController::class, 'revenueByCategory'])->middleware('permission:view_reports');
    Route::get('/dashboard/reservations-summary', [DashboardController::class, 'reservationsSummary'])->middleware('permission:view_reports');

    // Categories routes
    Route::get('/categories', [CategoryController::class, 'index']);
    Route::get('/categories/{category}', [CategoryController::class, 'show']);
    Route::post('/categories', [CategoryController::class, 'store'])->middleware('permission:create_category');
    Route::put('/categories/{category}', [CategoryController::class, 'update'])->middleware('permission:update_category');
    Route::delete('/categories/{category}', [CategoryController::class, 'destroy'])->middleware('permission:delete_category');

    // Sub-categories routes
    Route::get('/sub-categories', [SubCategoryController::class, 'index']);
    Route::get('/sub-categories/{subCategory}', [SubCategoryController::class, 'show']);
    Route::post('/sub-categories', [SubCategoryController::class, 'store'])->middleware('permission:create_sub_category');
    Route::put('/sub-categories/{subCategory}', [SubCategoryController::class, 'update'])->middleware('permission:update_sub_category');
    Route::delete('/sub-categories/{subCategory}', [SubCategoryController::class, 'destroy'])->middleware('permission:delete_sub_category');

    // Foods routes
    Route::get('/foods', [FoodController::class, 'index']);
    Route::get('/foods/{food}', [FoodController::class, 'show']);
    Route::post('/foods', [FoodController::class, 'store'])->middleware('permission:create_food');
    Route::put('/foods/{food}', [FoodController::class, 'update'])->middleware('permission:update_food');
    Route::delete('/foods/{food}', [FoodController::class, 'destroy'])->middleware('permission:delete_food');

    // Users routes
    Route::get('/users', [UserController::class, 'index']);
    Route::get('/users/{user}', [UserController::class, 'show']);
    Route::post('/users', [UserController::class, 'store'])->middleware('permission:create_user');
    Route::put('/users/{user}', [UserController::class, 'update'])->middleware('permission:update_user');
    Route::delete('/users/{user}', [UserController::class, 'destroy'])->middleware('permission:delete_user');

    // Tables routes
    Route::get('/tables', [TableController::class, 'index']);
    Route::get('/tables/availability', [TableController::class, 'availability']);
    Route::get('/tables/{table}', [TableController::class, 'show']);
    Route::post('/tables', [TableController::class, 'store'])->middleware('permission:create_table');
    Route::put('/tables/{table}', [TableController::class, 'update'])->middleware('permission:update_table');
    Route::delete('/tables/{table}', [TableController::class, 'destroy'])->middleware('permission:delete_table');

    // Reservations routes
    Route::get('/reservations', [ReservationController::class, 'index']);
    Route::get('/reservations/{reservation}', [ReservationController::class, 'show']);
    Route::post('/reservations', [ReservationController::class, 'store'])->middleware('permission:manage_reservations');
    Route::put('/reservations/{reservation}', [ReservationController::class, 'update'])->middleware('permission:manage_reservations');
    Route::delete('/reservations/{reservation}', [ReservationController::class, 'destroy'])->middleware('permission:manage_reservations');

    // Invoices routes
    Route::get('/invoices', [InvoiceController::class, 'index']);
    Route::get('/invoices/{invoice}', [InvoiceController::class, 'show']);
    Route::post('/invoices', [InvoiceController::class, 'store'])->middleware('permission:create_invoice');
    Route::put('/invoices/{invoice}', [InvoiceController::class, 'update'])->middleware('permission:update_invoice');
    Route::delete('/invoices/{invoice}', [InvoiceController::class, 'destroy'])->middleware('permission:cancel_invoice');

    // Invoice Food routes (nested under invoices)
    Route::get('/invoices/{invoice}/food', [InvoiceFoodController::class, 'index']);
    Route::post('/invoices/{invoice}/food', [InvoiceFoodController::class, 'store'])->middleware('permission:create_invoice');
    Route::put('/invoices/{invoice}/food/{foodItem}', [InvoiceFoodController::class, 'update'])->middleware('permission:update_invoice_item');
    Route::patch('/invoices/{invoice}/food/{foodItem}/quantity', [InvoiceFoodController::class, 'adjustQuantity'])->middleware('permission:update_invoice_item');
    Route::patch('/invoices/{invoice}/food/{foodItem}/status', [InvoiceFoodController::class, 'updateStatus'])->middleware('permission:update_invoice_food_status');
    Route::delete('/invoices/{invoice}/food/{foodItem}', [InvoiceFoodController::class, 'destroy'])->middleware('permission:update_invoice_item');
});
