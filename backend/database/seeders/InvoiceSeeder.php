<?php

namespace Database\Seeders;

use App\Models\Invoice;
use App\Models\InvoiceFood;
use Illuminate\Database\Seeder;

class InvoiceSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get available foods (assuming they exist from FoodSeeder)
        $foods = \App\Models\Food::where('is_available', true)->take(5)->get();

        if ($foods->isEmpty()) {
            $this->command->info('No foods found. Please run FoodSeeder first.');
            return;
        }

        // Invoice 1: Table 1 - Completed order with 2 items
        $invoice1 = Invoice::create([
            'table_id' => 1,
            'created_by' => 1,
            'status' => 'completed',
            'discount' => 0,
            'total' => 0,
        ]);

        InvoiceFood::create([
            'invoice_id' => $invoice1->id,
            'food_id' => $foods[0]->id,
            'person_number' => 1,
            'quantity' => 2,
            'unit_price' => $foods[0]->price,
            'status' => 'pending',
            'note' => null,
        ]);

        InvoiceFood::create([
            'invoice_id' => $invoice1->id,
            'food_id' => $foods[1]->id,
            'person_number' => 1,
            'quantity' => 1,
            'unit_price' => $foods[1]->price,
            'status' => 'pending',
            'note' => 'Extra spicy',
        ]);

        // Invoice 2: Table 2 - Pending order with 3 items and discount
        $invoice2 = Invoice::create([
            'table_id' => 2,
            'created_by' => 1,
            'status' => 'pending',
            'discount' => 5000,
            'total' => 0,
        ]);

        InvoiceFood::create([
            'invoice_id' => $invoice2->id,
            'food_id' => $foods[2]->id,
            'person_number' => 1,
            'quantity' => 3,
            'unit_price' => $foods[2]->price,
            'status' => 'pending',
            'note' => null,
        ]);

        InvoiceFood::create([
            'invoice_id' => $invoice2->id,
            'food_id' => $foods[3]->id,
            'person_number' => 2,
            'quantity' => 2,
            'unit_price' => $foods[3]->price,
            'status' => 'pending',
            'note' => 'No onions',
        ]);

        InvoiceFood::create([
            'invoice_id' => $invoice2->id,
            'food_id' => $foods[4]->id,
            'person_number' => 2,
            'quantity' => 1,
            'unit_price' => $foods[4]->price,
            'status' => 'pending',
            'note' => null,
        ]);

        // Invoice 3: Table 3 - Pending order with 1 item and 1 cancelled item
        $invoice3 = Invoice::create([
            'table_id' => 3,
            'created_by' => 1,
            'status' => 'pending',
            'discount' => 0,
            'total' => 0,
        ]);

        InvoiceFood::create([
            'invoice_id' => $invoice3->id,
            'food_id' => $foods[0]->id,
            'person_number' => 1,
            'quantity' => 1,
            'unit_price' => $foods[0]->price,
            'status' => 'pending',
            'note' => null,
        ]);

        InvoiceFood::create([
            'invoice_id' => $invoice3->id,
            'food_id' => $foods[1]->id,
            'person_number' => 1,
            'quantity' => 2,
            'unit_price' => $foods[1]->price,
            'status' => 'cancelled',
            'note' => 'Customer cancelled',
        ]);

        // Invoice 4: Table 4 - Pending order with large discount
        $invoice4 = Invoice::create([
            'table_id' => 4,
            'created_by' => 1,
            'status' => 'pending',
            'discount' => 15000,
            'total' => 0,
        ]);

        InvoiceFood::create([
            'invoice_id' => $invoice4->id,
            'food_id' => $foods[2]->id,
            'person_number' => 1,
            'quantity' => 5,
            'unit_price' => $foods[2]->price,
            'status' => 'pending',
            'note' => 'Group order',
        ]);

        // Invoice 5: Table 5 - Cancelled invoice
        $invoice5 = Invoice::create([
            'table_id' => 5,
            'created_by' => 1,
            'status' => 'cancelled',
            'discount' => 0,
            'total' => 0,
        ]);

        InvoiceFood::create([
            'invoice_id' => $invoice5->id,
            'food_id' => $foods[3]->id,
            'person_number' => 1,
            'quantity' => 1,
            'unit_price' => $foods[3]->price,
            'status' => 'pending',
            'note' => null,
        ]);

        $this->command->info('InvoiceSeeder completed successfully!');
    }
}
