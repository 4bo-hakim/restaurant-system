<?php

namespace Tests\Feature;

use App\Models\Food;
use App\Models\User;
use Carbon\Carbon;
use Database\Seeders\AdminUserSeeder;
use Database\Seeders\CategorySeeder;
use Database\Seeders\FoodSeeder;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\SubCategorySeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class AdminWorkflowTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);
        $this->seed(AdminUserSeeder::class);
        $this->seed(CategorySeeder::class);
        $this->seed(SubCategorySeeder::class);
        $this->seed(FoodSeeder::class);

        $this->adminUser = User::factory()->create([
            'name' => 'Workflow Admin',
            'email' => 'workflow-admin@example.com',
        ]);

        $this->adminUser->assignRole('admin');

        $this->actingAs($this->adminUser, 'sanctum');
    }

    protected function assertResponseStatus(TestResponse $response, int $status, string $message): void
    {
        $this->assertSame($status, $response->status(), $message);
    }

    public function test_admin_can_view_all_users(): void
    {
        $response = $this->getJson('/api/admin/users');

        $this->assertResponseStatus($response, 200, 'An admin with view_users should be able to list all users.');
    }

    public function test_admin_can_manage_categories_subcategories_and_foods(): void
    {
        $categoryResponse = $this->post('/api/admin/categories', [
            'name' => [
                'en' => 'Workflow Category',
                'ar' => 'Test Category Arabic',
                'ku' => 'Test Category Kurdish',
            ],
        ]);

        $this->assertResponseStatus($categoryResponse, 201, 'An admin should be able to create a category without an image.');
        $categoryId = $categoryResponse->json('data.id');
        $this->assertNotNull($categoryId, 'The created category response should contain an id.');

        $categoryUpdateResponse = $this->putJson('/api/admin/categories/' . $categoryId, [
            'name' => [
                'en' => 'Updated Workflow Category',
                'ar' => 'Updated Category Arabic',
                'ku' => 'Updated Category Kurdish',
            ],
        ]);
        $this->assertResponseStatus($categoryUpdateResponse, 200, 'An admin should be able to update a category.');

        $categoryDeleteResponse = $this->deleteJson('/api/admin/categories/' . $categoryId);
        $this->assertResponseStatus($categoryDeleteResponse, 200, 'An admin should be able to delete a category with no sub-categories.');

        $subCategoryResponse = $this->postJson('/api/admin/sub-categories', [
            'category_id' => 1,
            'name' => [
                'en' => 'Workflow Sub-category',
                'ar' => 'Test Sub-category Arabic',
                'ku' => 'Test Sub-category Kurdish',
            ],
        ]);

        $this->assertResponseStatus($subCategoryResponse, 201, 'An admin should be able to create a sub-category.');
        $subCategoryId = $subCategoryResponse->json('data.id');
        $this->assertNotNull($subCategoryId, 'The created sub-category response should contain an id.');

        $foodResponse = $this->postJson('/api/admin/foods', [
            'sub_category_id' => $subCategoryId,
            'name' => [
                'en' => 'Workflow Food',
                'ar' => 'Test Food Arabic',
                'ku' => 'Test Food Kurdish',
            ],
            'price' => 4500,
        ]);

        $this->assertResponseStatus($foodResponse, 201, 'An admin should be able to create a food item.');
        $foodId = $foodResponse->json('data.id');
        $this->assertNotNull($foodId, 'The created food response should contain an id.');

        $foodUpdateResponse = $this->putJson('/api/admin/foods/' . $foodId, [
            'price' => 5000,
        ]);
        $this->assertResponseStatus($foodUpdateResponse, 200, 'An admin should be able to update a food item.');

        $foodDeleteResponse = $this->deleteJson('/api/admin/foods/' . $foodId);
        $this->assertResponseStatus($foodDeleteResponse, 200, 'An admin should be able to delete food with no invoice history.');
    }

    public function test_admin_can_manage_tables_reservations_and_invoices(): void
    {
        $tableResponse = $this->postJson('/api/admin/tables', [
            'table_number' => 'ADMIN-WORKFLOW-01',
        ]);

        $this->assertResponseStatus($tableResponse, 201, 'An admin should be able to create a table.');
        $tableId = $tableResponse->json('data.id');
        $this->assertNotNull($tableId, 'The created table response should contain an id.');

        $reservationResponse = $this->postJson('/api/admin/reservations', [
            'table_id' => $tableId,
            'name' => 'Workflow Guest',
            'phone_number' => '+9647700000010',
            'reservation_at' => Carbon::now()->addDay()->setTime(18, 0)->toISOString(),
            'reservation_end' => Carbon::now()->addDay()->setTime(20, 0)->toISOString(),
            'guest_count' => 4,
            'status' => 'pending',
        ]);

        $this->assertResponseStatus($reservationResponse, 201, 'An admin should be able to create a reservation.');

        $invoiceResponse = $this->postJson('/api/admin/invoices', [
            'table_id' => $tableId,
            'discount' => 0,
            'items' => [],
        ]);

        $this->assertResponseStatus($invoiceResponse, 201, 'An admin should be able to create an invoice.');
        $invoiceId = $invoiceResponse->json('data.id');
        $this->assertNotNull($invoiceId, 'The created invoice response should contain an id.');

        $food = Food::query()->where('is_available', true)->firstOrFail();
        $itemResponse = $this->postJson('/api/admin/invoices/' . $invoiceId . '/food', [
            'food_id' => $food->id,
            'person_number' => 1,
            'quantity' => 2,
        ]);

        $this->assertResponseStatus($itemResponse, 201, 'An admin should be able to add an item to an invoice.');
        $foodItemId = $itemResponse->json('data.id');
        $this->assertNotNull($foodItemId, 'The created invoice item response should contain an id.');

        $statusResponse = $this->patchJson('/api/admin/invoices/' . $invoiceId . '/food/' . $foodItemId . '/status', [
            'status' => 'preparing',
        ]);
        $this->assertResponseStatus($statusResponse, 200, 'An admin should be able to update invoice food preparation status.');

        $itemUpdateResponse = $this->putJson('/api/admin/invoices/' . $invoiceId . '/food/' . $foodItemId, [
            'quantity' => 3,
            'note' => 'Workflow note',
        ]);
        $this->assertResponseStatus($itemUpdateResponse, 200, 'An admin should be able to update invoice item quantity and note.');
    }

    public function test_admin_can_create_update_and_delete_users_but_not_delete_self(): void
    {
        $userResponse = $this->postJson('/api/admin/users', [
            'name' => 'Workflow User',
            'email' => 'workflow-user@example.com',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
            'role' => 'waiter',
            'permissions' => [],
        ]);

        $this->assertResponseStatus($userResponse, 201, 'An admin should be able to create a user.');
        $userId = $userResponse->json('data.id');
        $this->assertNotNull($userId, 'The created user response should contain an id.');

        $userUpdateResponse = $this->putJson('/api/admin/users/' . $userId, [
            'name' => 'Updated Workflow User',
            'role' => 'chef',
        ]);
        $this->assertResponseStatus($userUpdateResponse, 200, 'An admin should be able to update a user.');

        $userDeleteResponse = $this->deleteJson('/api/admin/users/' . $userId);
        $this->assertResponseStatus($userDeleteResponse, 200, 'An admin should be able to delete another user.');

        $selfDeleteResponse = $this->deleteJson('/api/admin/users/' . $this->adminUser->id);
        $this->assertResponseStatus($selfDeleteResponse, 403, 'An admin must not be able to delete their own account.');
    }

    public function test_admin_can_view_dashboard_summary_and_table_availability(): void
    {
        $summaryResponse = $this->getJson('/api/admin/dashboard/summary');
        $this->assertResponseStatus($summaryResponse, 200, 'An admin should be able to view the dashboard summary.');

        $availabilityResponse = $this->getJson('/api/admin/tables/availability');
        $this->assertResponseStatus($availabilityResponse, 200, 'An admin should be able to view table availability.');
    }

    public function test_waiter_cannot_view_all_users_without_view_users_permission(): void
    {
        $waiter = User::factory()->create(['email' => 'permission-waiter@example.com']);
        $waiter->assignRole('waiter');
        $this->actingAs($waiter, 'sanctum');

        $response = $this->getJson('/api/admin/users');
        $this->assertResponseStatus($response, 403, 'A waiter without view_users must not be able to list users.');
    }

    public function test_chef_cannot_view_all_users_without_view_users_permission(): void
    {
        $chef = User::factory()->create(['email' => 'permission-chef@example.com']);
        $chef->assignRole('chef');
        $this->actingAs($chef, 'sanctum');

        $response = $this->getJson('/api/admin/users');
        $this->assertResponseStatus($response, 403, 'A chef without view_users must not be able to list users.');
    }

    public function test_cashier_cannot_view_all_users_without_view_users_permission(): void
    {
        $cashier = User::factory()->create(['email' => 'permission-cashier@example.com']);
        $cashier->assignRole('cashier');
        $this->actingAs($cashier, 'sanctum');

        $response = $this->getJson('/api/admin/users');
        $this->assertResponseStatus($response, 403, 'A cashier without view_users must not be able to list users.');
    }
}
