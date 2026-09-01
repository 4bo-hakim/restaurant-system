<?php

namespace Tests\Feature;

use App\Models\Food;
use App\Models\Invoice;
use App\Models\InvoiceFood;
use App\Models\Reservation;
use App\Models\RestaurantTable;
use App\Models\User;
use Carbon\Carbon;
use Database\Seeders\AdminUserSeeder;
use Database\Seeders\CategorySeeder;
use Database\Seeders\FoodSeeder;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\SubCategorySeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WaiterWorkflowTest extends TestCase
{
    use RefreshDatabase;

    protected User $waiterUser;
    protected RestaurantTable $reservationTable;
    protected RestaurantTable $invoiceTable;
    protected int $invoiceId;
    protected int $foodId;
    protected int $foodItemId;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);
        $this->seed(AdminUserSeeder::class);
        $this->seed(CategorySeeder::class);
        $this->seed(SubCategorySeeder::class);
        $this->seed(FoodSeeder::class);

        $this->waiterUser = User::factory()->create([
            'name' => 'Waiter User',
            'email' => 'waiter@example.com',
        ]);

        $this->waiterUser->assignRole('waiter');

        $this->reservationTable = RestaurantTable::firstOrCreate(
            ['table_number' => 'WAIT-RES-01'],
            ['created_by' => $this->waiterUser->id]
        );

        $this->invoiceTable = RestaurantTable::firstOrCreate(
            ['table_number' => 'WAIT-INV-01'],
            ['created_by' => $this->waiterUser->id]
        );

        $this->actingAs($this->waiterUser, 'sanctum');
    }

    public function test_waiter_can_view_table_availability(): void
    {
        $response = $this->getJson('/api/admin/tables/availability');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonFragment(['status' => 'available']);

        $this->assertNotEmpty(
            collect($response->json('data'))->first(fn($table) => $table['status'] === 'available'),
            'Expected at least one table to be available for the waiter workflow.'
        );
    }

    public function test_waiter_can_create_a_future_reservation_for_a_table(): void
    {
        $payload = [
            'table_id' => $this->reservationTable->id,
            'name' => 'Ali Ahmed',
            'phone_number' => '+9647700000001',
            'reservation_at' => Carbon::now()->addDay()->setTime(18, 0, 0)->toISOString(),
            'reservation_end' => Carbon::now()->addDay()->setTime(20, 0, 0)->toISOString(),
            'guest_count' => 4,
            'status' => 'pending',
            'note' => 'Window table',
        ];

        $response = $this->postJson('/api/admin/reservations', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.table.id', $this->reservationTable->id);

        $this->assertDatabaseHas('reservations', [
            'table_id' => $this->reservationTable->id,
            'status' => 'pending',
            'guest_count' => 4,
        ]);
    }

    public function test_waiter_cannot_create_overlapping_reservation_on_same_table(): void
    {
        $start = Carbon::now()->addDay()->setTime(18, 30, 0);
        $end = Carbon::now()->addDay()->setTime(20, 30, 0);

        Reservation::create([
            'table_id' => $this->reservationTable->id,
            'name' => 'First Guest',
            'phone_number' => '+9647700000002',
            'reservation_at' => $start,
            'reservation_end' => $end,
            'guest_count' => 2,
            'status' => 'pending',
            'created_by' => $this->waiterUser->id,
        ]);

        $overlapResponse = $this->postJson('/api/admin/reservations', [
            'table_id' => $this->reservationTable->id,
            'name' => 'Second Guest',
            'phone_number' => '+9647700000003',
            'reservation_at' => $start->copy()->addHour(),
            'reservation_end' => $end->copy()->addHour(),
            'guest_count' => 3,
            'status' => 'pending',
        ]);

        $overlapResponse->assertStatus(409, 'The overlapping reservation should be rejected with a 409 conflict.');
    }

    public function test_waiter_can_create_pending_invoice_for_a_different_table(): void
    {
        $response = $this->postJson('/api/admin/invoices', [
            'table_id' => $this->invoiceTable->id,
            'discount' => 0,
            'items' => [],
        ]);

        $response->assertStatus(201, 'The waiter should be able to create a pending invoice on an unoccupied table.')
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.table_id', $this->invoiceTable->id);

        $this->invoiceId = $response->json('data.id');

        $this->assertNotNull($this->invoiceId, 'Invoice ID should be present in the API response.');
    }

    public function test_waiter_cannot_create_duplicate_pending_invoice_for_same_table(): void
    {
        $invoice = Invoice::create([
            'table_id' => $this->invoiceTable->id,
            'created_by' => $this->waiterUser->id,
            'status' => 'pending',
            'discount' => 0,
            'total' => 0,
        ]);

        $response = $this->postJson('/api/admin/invoices', [
            'table_id' => $this->invoiceTable->id,
            'discount' => 0,
            'items' => [],
        ]);

        $response->assertStatus(409, 'A second pending invoice for the same table should be blocked.');
        $this->assertSame(1, Invoice::count(), 'The system should keep only one pending invoice per table.');
        $this->assertEquals($invoice->id, Invoice::first()->id, 'The original invoice should remain the active invoice.');
    }

    public function test_waiter_can_add_food_item_to_invoice_and_merge_same_food_for_same_person(): void
    {
        $invoice = Invoice::create([
            'table_id' => $this->invoiceTable->id,
            'created_by' => $this->waiterUser->id,
            'status' => 'pending',
            'discount' => 0,
            'total' => 0,
        ]);

        $this->invoiceId = $invoice->id;

        $food = Food::query()->where('is_available', true)->firstOrFail();
        $this->foodId = $food->id;

        $firstResponse = $this->postJson('/api/admin/invoices/' . $this->invoiceId . '/food', [
            'food_id' => $this->foodId,
            'person_number' => 1,
            'quantity' => 2,
        ]);

        $firstResponse->assertStatus(201, 'The waiter should be able to add an item to the pending invoice.')
            ->assertJsonPath('data.quantity', 2)
            ->assertJsonPath('data.unit_price', $food->price);

        $this->assertSame(
            $food->price,
            InvoiceFood::where('invoice_id', $this->invoiceId)->where('food_id', $this->foodId)->value('unit_price'),
            'The stored unit_price should come from the seeded food record and not from the request payload.'
        );

        $secondResponse = $this->postJson('/api/admin/invoices/' . $this->invoiceId . '/food', [
            'food_id' => $this->foodId,
            'person_number' => 1,
            'quantity' => 1,
        ]);

        $secondResponse->assertStatus(200, 'Adding the same food for the same person should merge quantities.')
            ->assertJsonPath('data.quantity', 3);

        $invoiceFoods = InvoiceFood::where('invoice_id', $this->invoiceId)
            ->where('food_id', $this->foodId)
            ->where('person_number', 1)
            ->get();

        $this->assertCount(1, $invoiceFoods, 'Only one invoice_food row should exist for the same food and person on the same invoice.');
        $this->assertSame(3, $invoiceFoods->first()->quantity, 'The second add should increase the existing quantity from 2 to 3.');

        $this->foodItemId = $invoiceFoods->first()->id;
    }

    public function test_waiter_can_get_invoice_and_total_matches_merged_quantity(): void
    {
        $invoice = Invoice::create([
            'table_id' => $this->invoiceTable->id,
            'created_by' => $this->waiterUser->id,
            'status' => 'pending',
            'discount' => 0,
            'total' => 0,
        ]);

        $food = Food::query()->where('is_available', true)->firstOrFail();
        $invoiceFood = InvoiceFood::create([
            'invoice_id' => $invoice->id,
            'food_id' => $food->id,
            'person_number' => 1,
            'quantity' => 3,
            'unit_price' => $food->price,
            'status' => 'pending',
        ]);

        $this->invoiceId = $invoice->id;
        $this->foodItemId = $invoiceFood->id;

        $response = $this->getJson('/api/admin/invoices/' . $this->invoiceId);

        $response->assertStatus(200, 'The waiter should be able to fetch the invoice details.')
            ->assertJsonPath('data.id', $this->invoiceId);

        $this->assertSame(
            $food->price * 3,
            (int) $response->json('data.total'),
            'The invoice total should equal unit_price * quantity for the item.'
        );
    }

    public function test_waiter_can_update_invoice_item_quantity_and_note(): void
    {
        $invoice = Invoice::create([
            'table_id' => $this->invoiceTable->id,
            'created_by' => $this->waiterUser->id,
            'status' => 'pending',
            'discount' => 0,
            'total' => 0,
        ]);

        $food = Food::query()->where('is_available', true)->firstOrFail();
        $item = InvoiceFood::create([
            'invoice_id' => $invoice->id,
            'food_id' => $food->id,
            'person_number' => 1,
            'quantity' => 3,
            'unit_price' => $food->price,
            'status' => 'pending',
            'note' => null,
        ]);

        $response = $this->putJson('/api/admin/invoices/' . $invoice->id . '/food/' . $item->id, [
            'quantity' => 5,
            'note' => 'extra spicy',
        ]);

        $response->assertStatus(200, 'The waiter should be allowed to update the quantity and note of an existing item.')
            ->assertJsonPath('data.quantity', 5)
            ->assertJsonPath('data.note', 'extra spicy');

        $invoice->refresh();

        $this->assertSame(
            $food->price * 5,
            (int) $invoice->total,
            'The invoice total should be recalculated according to the updated quantity.'
        );
    }

    public function test_waiter_cannot_change_food_prep_status(): void
    {
        $invoice = Invoice::create([
            'table_id' => $this->invoiceTable->id,
            'created_by' => $this->waiterUser->id,
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

        $response->assertStatus(403, 'A waiter should not be able to change food preparation status.');
    }

    public function test_waiter_can_cancel_invoice_item_and_total_excludes_it(): void
    {
        $invoice = Invoice::create([
            'table_id' => $this->invoiceTable->id,
            'created_by' => $this->waiterUser->id,
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

        $deleteResponse = $this->deleteJson('/api/admin/invoices/' . $invoice->id . '/food/' . $item->id);

        $deleteResponse->assertStatus(200, 'The waiter should be able to cancel an item from the pending invoice.')
            ->assertJsonPath('message', 'Invoice item cancelled successfully');

        $item->refresh();
        $this->assertSame('cancelled', $item->status, 'Cancelled invoice items should remain visible but marked cancelled.');

        $invoice->refresh();
        $this->assertSame(0, $invoice->total, 'Cancelled items should be excluded from the invoice total.');
    }

    public function test_waiter_cannot_create_categories(): void
    {
        $response = $this->postJson('/api/admin/categories', [
            'name' => ['en' => 'Test Category'],
            'image_path' => null,
        ]);

        $response->assertStatus(403, 'A waiter should not be allowed to create categories.');
    }

    public function test_waiter_cannot_create_users(): void
    {
        $response = $this->postJson('/api/admin/users', [
            'name' => 'New User',
            'email' => 'newuser@example.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(403, 'A waiter should not be allowed to create users.');
    }

    public function test_waiter_cannot_delete_food(): void
    {
        $food = Food::query()->where('is_available', true)->firstOrFail();

        $response = $this->deleteJson('/api/admin/foods/' . $food->id);

        $response->assertStatus(403, 'A waiter should not be allowed to delete food items.');
    }
}
