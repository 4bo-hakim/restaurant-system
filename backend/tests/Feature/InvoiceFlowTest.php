<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Food;
use App\Models\Invoice;
use App\Models\InvoiceFood;
use App\Models\RestaurantTable;
use App\Models\SubCategory;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class InvoiceFlowTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected RestaurantTable $table;
    protected Food $food;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seedPermissions();

        $this->admin = User::factory()->create();
        $this->admin->assignRole('admin');

        $this->table = RestaurantTable::create([
            'table_number' => 'T-1',
            'created_by' => $this->admin->id,
        ]);

        $category = Category::create([
            'name' => ['en' => 'Drinks', 'ar' => 'مشروبات', 'ku' => 'Xwarin'],
            'created_by' => $this->admin->id,
        ]);

        $subcategory = SubCategory::create([
            'category_id' => $category->id,
            'name' => ['en' => 'Hot Drinks', 'ar' => 'مشروبات ساخنة', 'ku' => 'Xwarinên germ'],
            'created_by' => $this->admin->id,
        ]);

        $this->food = Food::create([
            'sub_category_id' => $subcategory->id,
            'name' => ['en' => 'Tea', 'ar' => 'شاي', 'ku' => 'Çay'],
            'description' => ['en' => 'Green tea', 'ar' => 'شاي أخضر', 'ku' => 'Çaya kesk'],
            'size' => 'M',
            'price' => 25,
            'is_available' => true,
            'created_by' => $this->admin->id,
        ]);
    }

    protected function seedPermissions(): void
    {
        $permissions = [
            'create_invoice',
            'update_invoice',
            'update_invoice_item',
            'cancel_invoice',
            'update_invoice_food_status',
            'manage_reservations',
            'create_table',
            'create_food',
            'create_category',
            'update_food',
            'create_sub_category',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission]);
        }

        $role = Role::firstOrCreate(['name' => 'admin']);
        $role->syncPermissions($permissions);
    }

    public function test_it_creates_one_pending_invoice_per_table(): void
    {
        $this->actingAs($this->admin, 'sanctum');

        $response = $this->postJson('/api/admin/invoices', [
            'table_id' => $this->table->id,
            'discount' => 0,
            'items' => [[
                'food_id' => $this->food->id,
                'person_number' => 1,
                'quantity' => 2,
            ]],
        ]);

        $response->assertStatus(201);

        $second = $this->postJson('/api/admin/invoices', [
            'table_id' => $this->table->id,
            'discount' => 0,
            'items' => [[
                'food_id' => $this->food->id,
                'person_number' => 1,
                'quantity' => 1,
            ]],
        ]);

        $second->assertStatus(409);
        $this->assertDatabaseCount('invoices', 1);
    }

    public function test_it_merges_same_food_item_on_the_same_invoice(): void
    {
        $this->actingAs($this->admin, 'sanctum');

        $invoice = Invoice::create([
            'table_id' => $this->table->id,
            'created_by' => $this->admin->id,
            'status' => 'pending',
            'discount' => 0,
            'total' => 0,
        ]);

        $this->postJson('/api/admin/invoices/' . $invoice->id . '/food', [
            'food_id' => $this->food->id,
            'person_number' => 1,
            'quantity' => 2,
        ])->assertStatus(201);

        $this->postJson('/api/admin/invoices/' . $invoice->id . '/food', [
            'food_id' => $this->food->id,
            'person_number' => 1,
            'quantity' => 3,
        ])->assertStatus(200);

        $this->assertDatabaseCount('invoice_food', 1);
        $this->assertSame(5, InvoiceFood::first()->quantity);
        $this->assertSame(125, Invoice::find($invoice->id)->total);
    }

    public function test_it_updates_invoice_item_quantity_using_delta_and_exact_value(): void
    {
        $this->actingAs($this->admin, 'sanctum');

        $invoice = Invoice::create([
            'table_id' => $this->table->id,
            'created_by' => $this->admin->id,
            'status' => 'pending',
            'discount' => 0,
            'total' => 0,
        ]);

        $item = InvoiceFood::create([
            'invoice_id' => $invoice->id,
            'food_id' => $this->food->id,
            'person_number' => 1,
            'quantity' => 7,
            'unit_price' => $this->food->price,
            'status' => 'pending',
        ]);

        $this->putJson('/api/admin/invoices/' . $invoice->id . '/food/' . $item->id, [
            'delta' => 1,
        ])->assertStatus(200)
            ->assertJsonPath('data.quantity', 8);

        $this->putJson('/api/admin/invoices/' . $invoice->id . '/food/' . $item->id, [
            'quantity' => 6,
        ])->assertStatus(200)
            ->assertJsonPath('data.quantity', 6);

        $this->assertSame(6, $item->fresh()->quantity);
        $this->assertSame(150, $invoice->fresh()->total);
    }

    public function test_it_allows_quantity_delta_updates_on_a_specific_invoice_item(): void
    {
        $this->actingAs($this->admin, 'sanctum');

        $invoice = Invoice::create([
            'table_id' => $this->table->id,
            'created_by' => $this->admin->id,
            'status' => 'pending',
            'discount' => 0,
            'total' => 0,
        ]);

        $item = InvoiceFood::create([
            'invoice_id' => $invoice->id,
            'food_id' => $this->food->id,
            'person_number' => 1,
            'quantity' => 7,
            'unit_price' => $this->food->price,
            'status' => 'pending',
        ]);

        $this->patchJson('/api/admin/invoices/' . $invoice->id . '/food/' . $item->id . '/quantity', [
            'delta' => 1,
        ])->assertStatus(200)
            ->assertJsonPath('data.quantity', 8);

        $this->patchJson('/api/admin/invoices/' . $invoice->id . '/food/' . $item->id . '/quantity', [
            'delta' => -1,
        ])->assertStatus(200)
            ->assertJsonPath('data.quantity', 7);

        $this->assertSame(7, $item->fresh()->quantity);
    }

    public function test_it_rejects_adding_items_to_a_completed_invoice(): void
    {
        $this->actingAs($this->admin, 'sanctum');

        $invoice = Invoice::create([
            'table_id' => $this->table->id,
            'created_by' => $this->admin->id,
            'status' => 'completed',
            'discount' => 0,
            'total' => 100,
        ]);

        $response = $this->postJson('/api/admin/invoices/' . $invoice->id . '/food', [
            'food_id' => $this->food->id,
            'person_number' => 2,
            'quantity' => 1,
        ]);

        $response->assertStatus(409);
    }

    public function test_it_rejects_updating_items_after_invoice_is_completed(): void
    {
        $this->actingAs($this->admin, 'sanctum');

        $invoice = Invoice::create([
            'table_id' => $this->table->id,
            'created_by' => $this->admin->id,
            'status' => 'pending',
            'discount' => 0,
            'total' => 0,
        ]);

        $item = InvoiceFood::create([
            'invoice_id' => $invoice->id,
            'food_id' => $this->food->id,
            'person_number' => 1,
            'quantity' => 1,
            'unit_price' => $this->food->price,
            'status' => 'pending',
        ]);

        $invoice->update(['status' => 'completed']);

        $response = $this->putJson('/api/admin/invoices/' . $invoice->id . '/food/' . $item->id, [
            'quantity' => 3,
        ]);

        $response->assertStatus(409);
    }

    public function test_it_recalculates_total_after_item_cancel_and_discount(): void
    {
        $this->actingAs($this->admin, 'sanctum');

        $invoice = Invoice::create([
            'table_id' => $this->table->id,
            'created_by' => $this->admin->id,
            'status' => 'pending',
            'discount' => 10,
            'total' => 0,
        ]);

        $item = InvoiceFood::create([
            'invoice_id' => $invoice->id,
            'food_id' => $this->food->id,
            'person_number' => 1,
            'quantity' => 3,
            'unit_price' => $this->food->price,
            'status' => 'pending',
        ]);

        $invoice->refresh();
        $this->assertSame(65, $invoice->total);

        $item->update(['status' => 'cancelled']);
        $invoice->refresh();
        $this->assertSame(0, $invoice->total);
    }

    public function test_it_blocks_invoice_deletion_when_items_exist(): void
    {
        $this->actingAs($this->admin, 'sanctum');

        $invoice = Invoice::create([
            'table_id' => $this->table->id,
            'created_by' => $this->admin->id,
            'status' => 'pending',
            'discount' => 0,
            'total' => 0,
        ]);

        InvoiceFood::create([
            'invoice_id' => $invoice->id,
            'food_id' => $this->food->id,
            'person_number' => 1,
            'quantity' => 1,
            'unit_price' => $this->food->price,
            'status' => 'pending',
        ]);

        $response = $this->deleteJson('/api/admin/invoices/' . $invoice->id);

        $response->assertStatus(409);
    }
}
