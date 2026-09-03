<?php

namespace Tests\Feature;

use App\Models\Food;
use App\Models\Invoice;
use App\Models\InvoiceFood;
use App\Models\Reservation;
use App\Models\RestaurantTable;
use App\Models\User;
use Database\Seeders\AdminUserSeeder;
use Database\Seeders\CategorySeeder;
use Database\Seeders\FoodSeeder;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\SubCategorySeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CashierWorkflowTest extends TestCase
{
    use RefreshDatabase;

    protected User $cashierUser;
    protected RestaurantTable $table;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);
        $this->seed(AdminUserSeeder::class);
        $this->seed(CategorySeeder::class);
        $this->seed(SubCategorySeeder::class);
        $this->seed(FoodSeeder::class);

        $this->cashierUser = User::factory()->create([
            'name' => 'Cashier User',
            'email' => 'cashier@example.com',
        ]);

        $this->cashierUser->assignRole('cashier');

        $this->table = RestaurantTable::firstOrCreate(
            ['table_number' => 'CASH-01'],
            ['created_by' => $this->cashierUser->id]
        );

        $this->actingAs($this->cashierUser, 'sanctum');
    }

    public function test_cashier_can_view_all_invoices(): void
    {
        Invoice::create([
            'table_id' => $this->table->id,
            'created_by' => $this->cashierUser->id,
            'status' => 'pending',
            'discount' => 0,
            'total' => 0,
        ]);

        $response = $this->getJson('/api/admin/invoices');

        $response->assertStatus(200, 'A cashier should be able to view all invoices.')
            ->assertJsonPath('success', true);

        $this->assertNotEmpty($response->json('data'), 'Expected the cashier to see at least one invoice in the list.');
    }

    public function test_cashier_can_view_a_specific_invoice_with_items_and_total(): void
    {
        $invoice = Invoice::create([
            'table_id' => $this->table->id,
            'created_by' => $this->cashierUser->id,
            'status' => 'pending',
            'discount' => 0,
            'total' => 0,
        ]);

        $food = Food::query()->where('is_available', true)->firstOrFail();

        InvoiceFood::create([
            'invoice_id' => $invoice->id,
            'food_id' => $food->id,
            'person_number' => 1,
            'quantity' => 2,
            'unit_price' => $food->price,
            'status' => 'pending',
            'note' => 'No onions',
        ]);

        $invoice->update(['total' => $food->price * 2]);

        $response = $this->getJson('/api/admin/invoices/' . $invoice->id);

        $response->assertStatus(200, 'A cashier should be able to view a specific invoice and its total.')
            ->assertJsonPath('data.id', $invoice->id)
            ->assertJsonPath('data.invoice_foods.0.food.id', $food->id)
            ->assertJsonPath('data.total', $food->price * 2);
    }

    public function test_cashier_can_apply_a_discount_to_an_existing_invoice(): void
    {
        $invoice = Invoice::create([
            'table_id' => $this->table->id,
            'created_by' => $this->cashierUser->id,
            'status' => 'pending',
            'discount' => 0,
            'total' => 0,
        ]);

        $food = Food::query()->where('is_available', true)->firstOrFail();

        InvoiceFood::create([
            'invoice_id' => $invoice->id,
            'food_id' => $food->id,
            'person_number' => 1,
            'quantity' => 2,
            'unit_price' => $food->price,
            'status' => 'pending',
        ]);

        $response = $this->putJson('/api/admin/invoices/' . $invoice->id, [
            'discount' => 1000,
        ]);

        $response->assertStatus(200, 'A cashier should be able to apply a discount to an existing invoice.')
            ->assertJsonPath('data.discount', 1000);

        $expectedTotal = max(0, ($food->price * 2) - 1000);
        $this->assertSame($expectedTotal, (int) $invoice->fresh()->total, 'The invoice total should be reduced by the applied discount.');
    }

    public function test_cashier_can_mark_an_invoice_as_completed(): void
    {
        $invoice = Invoice::create([
            'table_id' => $this->table->id,
            'created_by' => $this->cashierUser->id,
            'status' => 'pending',
            'discount' => 0,
            'total' => 0,
        ]);

        $response = $this->putJson('/api/admin/invoices/' . $invoice->id, [
            'status' => 'completed',
        ]);

        $response->assertStatus(200, 'A cashier should be able to close a bill by marking an invoice completed.')
            ->assertJsonPath('data.status', 'completed');

        $this->assertSame('completed', $invoice->fresh()->status, 'The invoice status should be updated to completed in the database.');
    }

    public function test_cashier_can_cancel_an_invoice_on_a_different_pending_invoice(): void
    {
        $invoice = Invoice::create([
            'table_id' => RestaurantTable::firstOrCreate(
                ['table_number' => 'CASH-INV-2'],
                ['created_by' => $this->cashierUser->id]
            )->id,
            'created_by' => $this->cashierUser->id,
            'status' => 'pending',
            'discount' => 0,
            'total' => 0,
        ]);

        $response = $this->deleteJson('/api/admin/invoices/' . $invoice->id);

        $response->assertStatus(200, 'A cashier should be able to cancel an invoice that is already in the system.')
            ->assertJsonPath('message', 'Invoice deleted successfully');

        $this->assertDatabaseMissing('invoices', [
            'id' => $invoice->id,
        ]);
    }

    public function test_cashier_cannot_create_a_new_invoice(): void
    {
        $response = $this->postJson('/api/admin/invoices', [
            'table_id' => $this->table->id,
            'discount' => 0,
            'items' => [],
        ]);

        $response->assertStatus(403, 'A cashier should not be allowed to create a new invoice.');
    }

    public function test_cashier_cannot_add_items_to_an_invoice(): void
    {
        $invoice = Invoice::create([
            'table_id' => $this->table->id,
            'created_by' => $this->cashierUser->id,
            'status' => 'pending',
            'discount' => 0,
            'total' => 0,
        ]);

        $food = Food::query()->where('is_available', true)->firstOrFail();

        $response = $this->postJson('/api/admin/invoices/' . $invoice->id . '/food', [
            'food_id' => $food->id,
            'person_number' => 1,
            'quantity' => 2,
        ]);

        $response->assertStatus(403, 'A cashier should not be allowed to add items to an invoice.');
    }

    public function test_cashier_cannot_update_item_quantity_or_note(): void
    {
        $invoice = Invoice::create([
            'table_id' => $this->table->id,
            'created_by' => $this->cashierUser->id,
            'status' => 'pending',
            'discount' => 0,
            'total' => 0,
        ]);

        $food = Food::query()->where('is_available', true)->firstOrFail();
        $item = InvoiceFood::create([
            'invoice_id' => $invoice->id,
            'food_id' => $food->id,
            'person_number' => 1,
            'quantity' => 2,
            'unit_price' => $food->price,
            'status' => 'pending',
            'note' => null,
        ]);

        $response = $this->putJson('/api/admin/invoices/' . $invoice->id . '/food/' . $item->id, [
            'quantity' => 5,
            'note' => 'Cashier note',
        ]);

        $response->assertStatus(403, 'A cashier should not be allowed to update invoice item quantity or notes.');
    }

    public function test_cashier_cannot_change_food_prep_status(): void
    {
        $invoice = Invoice::create([
            'table_id' => $this->table->id,
            'created_by' => $this->cashierUser->id,
            'status' => 'pending',
            'discount' => 0,
            'total' => 0,
        ]);

        $food = Food::query()->where('is_available', true)->firstOrFail();
        $item = InvoiceFood::create([
            'invoice_id' => $invoice->id,
            'food_id' => $food->id,
            'person_number' => 1,
            'quantity' => 2,
            'unit_price' => $food->price,
            'status' => 'pending',
        ]);

        $response = $this->patchJson('/api/admin/invoices/' . $invoice->id . '/food/' . $item->id . '/status', [
            'status' => 'preparing',
        ]);

        $response->assertStatus(403, 'A cashier should not be allowed to change food preparation status.');
    }

    public function test_cashier_cannot_create_a_reservation(): void
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

        $response->assertStatus(403, 'A cashier should not be allowed to create reservations.');
    }

    public function test_cashier_cannot_create_a_category(): void
    {
        $response = $this->postJson('/api/admin/categories', [
            'name' => ['en' => 'Desserts'],
            'description' => ['en' => 'Sweet dishes'],
        ]);

        $response->assertStatus(403, 'A cashier should not be allowed to create categories.');
    }

    public function test_cashier_cannot_create_a_user(): void
    {
        $response = $this->postJson('/api/admin/users', [
            'name' => 'New User',
            'email' => 'newuser@example.com',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
            'role' => 'waiter',
            'permissions' => [],
        ]);

        $response->assertStatus(403, 'A cashier should not be allowed to create users.');
    }

    public function test_discount_larger_than_subtotal_floors_total_at_zero(): void
    {
        $invoice = Invoice::create([
            'table_id' => $this->table->id,
            'created_by' => $this->cashierUser->id,
            'status' => 'pending',
            'discount' => 0,
            'total' => 0,
        ]);

        $food = Food::query()->where('is_available', true)->firstOrFail();

        InvoiceFood::create([
            'invoice_id' => $invoice->id,
            'food_id' => $food->id,
            'person_number' => 1,
            'quantity' => 1,
            'unit_price' => 2000,
            'status' => 'pending',
        ]);

        $response = $this->putJson('/api/admin/invoices/' . $invoice->id, [
            'discount' => 5000,
        ]);

        $response->assertStatus(200, 'A discount larger than the subtotal should still be accepted and floored at zero.')
            ->assertJsonPath('data.discount', 5000);

        $this->assertSame(0, (int) $invoice->fresh()->total, 'The invoice total should floor at zero instead of becoming negative.');
    }

    public function test_negative_discount_is_rejected(): void
    {
        $invoice = Invoice::create([
            'table_id' => $this->table->id,
            'created_by' => $this->cashierUser->id,
            'status' => 'pending',
            'discount' => 0,
            'total' => 0,
        ]);

        $response = $this->putJson('/api/admin/invoices/' . $invoice->id, [
            'discount' => -500,
        ]);

        $response->assertStatus(422, 'Negative discounts should be rejected by the validation rules.')
            ->assertJsonValidationErrors(['discount']);
    }

    public function test_discount_set_before_items_added_still_calculates_correctly(): void
    {
        $invoice = Invoice::create([
            'table_id' => $this->table->id,
            'created_by' => $this->cashierUser->id,
            'status' => 'pending',
            'discount' => 0,
            'total' => 0,
        ]);

        $this->putJson('/api/admin/invoices/' . $invoice->id, [
            'discount' => 1000,
        ])->assertStatus(200, 'The initial discount should be stored before any items are added.');

        $waiterUser = User::factory()->create([
            'name' => 'Waiter For Discount Test',
            'email' => 'waiter-discount@example.com',
        ]);
        $waiterUser->assignRole('waiter');
        $this->actingAs($waiterUser, 'sanctum');

        $food = Food::query()->where('is_available', true)->firstOrFail();
        $food->update(['price' => 3000]);

        $this->postJson('/api/admin/invoices/' . $invoice->id . '/food', [
            'food_id' => $food->id,
            'person_number' => 1,
            'quantity' => 1,
        ])->assertStatus(201, 'A waiter should be able to add an item after a discount has already been set.');

        $this->actingAs($this->cashierUser, 'sanctum');
        $invoice->refresh();

        $this->assertSame(2000, (int) $invoice->total, 'The final total should reflect the discount even when the discount existed before the item was added.');
    }

    public function test_discount_changed_multiple_times_recalculates_correctly_each_time(): void
    {
        $invoice = Invoice::create([
            'table_id' => $this->table->id,
            'created_by' => $this->cashierUser->id,
            'status' => 'pending',
            'discount' => 0,
            'total' => 0,
        ]);

        $food = Food::query()->where('is_available', true)->firstOrFail();

        InvoiceFood::create([
            'invoice_id' => $invoice->id,
            'food_id' => $food->id,
            'person_number' => 1,
            'quantity' => 1,
            'unit_price' => 5000,
            'status' => 'pending',
        ]);

        $firstResponse = $this->putJson('/api/admin/invoices/' . $invoice->id, [
            'discount' => 1000,
        ]);

        $firstResponse->assertStatus(200, 'The discount should be applied once and recalculate the total correctly.')
            ->assertJsonPath('data.discount', 1000);

        $this->assertSame(4000, (int) $invoice->fresh()->total, 'After the first discount change, the total should be 5000 - 1000 = 4000.');

        $secondResponse = $this->putJson('/api/admin/invoices/' . $invoice->id, [
            'discount' => 2000,
        ]);

        $secondResponse->assertStatus(200, 'A second discount update should recalculate from the current subtotal, not compound the earlier value.')
            ->assertJsonPath('data.discount', 2000);

        $this->assertSame(3000, (int) $invoice->fresh()->total, 'After the second discount change, the total should be 5000 - 2000 = 3000 without stacking.');
    }

    public function test_non_integer_discount_is_rejected(): void
    {
        $invoice = Invoice::create([
            'table_id' => $this->table->id,
            'created_by' => $this->cashierUser->id,
            'status' => 'pending',
            'discount' => 0,
            'total' => 0,
        ]);

        $response = $this->putJson('/api/admin/invoices/' . $invoice->id, [
            'discount' => 500.75,
        ]);

        $response->assertStatus(422, 'Decimal discounts are rejected by the validation rules because the discount field is integer-based.')
            ->assertJsonValidationErrors(['discount']);
    }

    public function test_cashier_cannot_delete_a_food_item(): void
    {
        $food = Food::query()->where('is_available', true)->firstOrFail();

        $response = $this->deleteJson('/api/admin/foods/' . $food->id);

        $response->assertStatus(403, 'A cashier should not be allowed to delete food items.');
    }
}
