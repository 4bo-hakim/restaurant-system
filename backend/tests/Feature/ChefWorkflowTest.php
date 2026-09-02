<?php

namespace Tests\Feature;

use App\Models\Food;
use App\Models\Invoice;
use App\Models\InvoiceFood;
use App\Models\RestaurantTable;
use App\Models\User;
use Database\Seeders\AdminUserSeeder;
use Database\Seeders\CategorySeeder;
use Database\Seeders\FoodSeeder;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\SubCategorySeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ChefWorkflowTest extends TestCase
{
    use RefreshDatabase;

    protected User $chefUser;
    protected RestaurantTable $table;
    protected Invoice $invoice;
    protected Food $food;
    protected InvoiceFood $invoiceFood;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);
        $this->seed(AdminUserSeeder::class);
        $this->seed(CategorySeeder::class);
        $this->seed(SubCategorySeeder::class);
        $this->seed(FoodSeeder::class);

        $this->chefUser = User::factory()->create([
            'name' => 'Chef User',
            'email' => 'chef@example.com',
        ]);

        $this->chefUser->assignRole('chef');

        $this->table = RestaurantTable::firstOrCreate(
            ['table_number' => 'CHEF-01'],
            ['created_by' => $this->chefUser->id]
        );

        $this->food = Food::query()->where('is_available', true)->firstOrFail();

        $this->invoice = Invoice::create([
            'table_id' => $this->table->id,
            'created_by' => $this->chefUser->id,
            'status' => 'pending',
            'discount' => 0,
            'total' => 0,
        ]);

        $this->invoiceFood = InvoiceFood::create([
            'invoice_id' => $this->invoice->id,
            'food_id' => $this->food->id,
            'person_number' => 1,
            'quantity' => 2,
            'unit_price' => $this->food->price,
            'status' => 'pending',
            'note' => null,
        ]);

        $this->actingAs($this->chefUser, 'sanctum');
    }

    public function test_chef_can_view_all_invoices(): void
    {
        $response = $this->getJson('/api/admin/invoices');

        $response->assertStatus(200, 'A chef should be able to view all invoices.');
    }

    public function test_chef_can_view_a_specific_invoice_with_its_items(): void
    {
        $response = $this->getJson('/api/admin/invoices/' . $this->invoice->id);

        $response->assertStatus(200, 'A chef should be able to view a specific invoice and its items.')
            ->assertJsonPath('data.id', $this->invoice->id)
            ->assertJsonPath('data.invoice_foods.0.food.id', $this->food->id);

        $this->assertNotEmpty($response->json('data.invoice_foods'), 'The invoice should include at least one invoice item.');
    }

    public function test_chef_can_update_food_prep_status(): void
    {
        $response = $this->patchJson('/api/admin/invoices/' . $this->invoice->id . '/food/' . $this->invoiceFood->id . '/status', [
            'status' => 'preparing',
        ]);

        $response->assertStatus(200, 'A chef should be allowed to change an item status to preparing.')
            ->assertJsonPath('data.status', 'preparing');

        $this->assertDatabaseHas('invoice_food', [
            'id' => $this->invoiceFood->id,
            'status' => 'preparing',
        ]);

        $this->assertSame('preparing', $this->invoiceFood->fresh()->status, 'The item status in the database should be updated to preparing.');
    }

    public function test_chef_can_progress_status_through_full_lifecycle(): void
    {
        $this->invoiceFood->update(['status' => 'pending']);

        $readyResponse = $this->patchJson('/api/admin/invoices/' . $this->invoice->id . '/food/' . $this->invoiceFood->id . '/status', [
            'status' => 'ready',
        ]);

        $readyResponse->assertStatus(200, 'A chef should be able to mark an item as ready.')
            ->assertJsonPath('data.status', 'ready');

        $servedResponse = $this->patchJson('/api/admin/invoices/' . $this->invoice->id . '/food/' . $this->invoiceFood->id . '/status', [
            'status' => 'served',
        ]);

        $servedResponse->assertStatus(200, 'A chef should be able to mark an item as served.')
            ->assertJsonPath('data.status', 'served');

        $this->assertSame('served', $this->invoiceFood->fresh()->status, 'The food item should reach the served state after the full lifecycle progression.');
    }

    public function test_chef_can_update_food_menu_item_mark_unavailable(): void
    {
        $response = $this->putJson('/api/admin/foods/' . $this->food->id, [
            'is_available' => false,
        ]);

        $response->assertStatus(200, 'A chef should be allowed to mark a food item unavailable.')
            ->assertJsonPath('data.is_available', false);

        $this->assertDatabaseHas('foods', [
            'id' => $this->food->id,
            'is_available' => false,
        ]);

        $this->assertFalse((bool) $this->food->fresh()->is_available, 'The food item should be marked unavailable in the database.');
    }

    public function test_chef_cannot_create_invoice(): void
    {
        $response = $this->postJson('/api/admin/invoices', [
            'table_id' => $this->table->id,
            'discount' => 0,
            'items' => [],
        ]);

        $response->assertStatus(403, 'A chef should not be able to create a new invoice.');
    }

    public function test_chef_cannot_create_reservation(): void
    {
        $response = $this->postJson('/api/admin/reservations', [
            'table_id' => $this->table->id,
            'name' => 'Guest Reservation',
            'phone_number' => '+9647700000001',
            'reservation_at' => now()->addDay()->setTime(18, 0, 0)->toISOString(),
            'reservation_end' => now()->addDay()->setTime(20, 0, 0)->toISOString(),
            'guest_count' => 3,
            'status' => 'pending',
        ]);

        $response->assertStatus(403, 'A chef should not be able to create reservations.');
    }

    public function test_chef_cannot_update_quantity_or_note_on_invoice_item(): void
    {
        $response = $this->putJson('/api/admin/invoices/' . $this->invoice->id . '/food/' . $this->invoiceFood->id, [
            'quantity' => 5,
            'note' => 'chef note',
        ]);

        $response->assertStatus(403, 'A chef should not be allowed to update invoice item quantity or notes.');
    }

    public function test_chef_cannot_cancel_delete_invoice_item(): void
    {
        $response = $this->deleteJson('/api/admin/invoices/' . $this->invoice->id . '/food/' . $this->invoiceFood->id);

        $response->assertStatus(403, 'A chef should not be allowed to cancel or delete invoice items.');
    }

    public function test_chef_cannot_create_category(): void
    {
        $response = $this->postJson('/api/admin/categories', [
            'name' => ['en' => 'Desserts', 'ar' => 'حلويات', 'ku' => 'Desert'],
            'description' => ['en' => 'Sweet dishes', 'ar' => 'أطباق حلوة', 'ku' => 'Xwarin şîrîn'],
        ]);

        $response->assertStatus(403, 'A chef should not be allowed to create categories.');
    }

    public function test_chef_cannot_create_user(): void
    {
        $response = $this->postJson('/api/admin/users', [
            'name' => 'New User',
            'email' => 'newuser@example.com',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
            'role' => 'waiter',
            'permissions' => [],
        ]);

        $response->assertStatus(403, 'A chef should not be allowed to create users.');
    }

    public function test_chef_cannot_delete_food_item(): void
    {
        $response = $this->deleteJson('/api/admin/foods/' . $this->food->id);

        $response->assertStatus(403, 'A chef should not be allowed to delete food items.');
    }

    public function test_chef_cannot_create_table(): void
    {
        $response = $this->postJson('/api/admin/tables', [
            'table_number' => 'CHEF-NEW',
        ]);

        $response->assertStatus(403, 'A chef should not be allowed to create tables.');
    }
}
