<?php

namespace Database\Seeders;

use App\Models\RestaurantTable;
use Illuminate\Database\Seeder;

class TableSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $tables = [
            [
                'table_number' => 'T-01',
                'created_by' => 1,
            ],
            [
                'table_number' => 'T-02',
                'created_by' => 1,
            ],
            [
                'table_number' => 'T-03',
                'created_by' => 1,
            ],
            [
                'table_number' => 'T-04',
                'created_by' => 1,
            ],
            [
                'table_number' => 'T-05',
                'created_by' => 1,
            ],
            [
                'table_number' => 'T-06',
                'created_by' => 1,
            ],
            [
                'table_number' => 'T-07',
                'created_by' => 1,
            ],
            [
                'table_number' => 'T-08',
                'created_by' => 1,
            ],
        ];

        foreach ($tables as $table) {
            RestaurantTable::firstOrCreate(
                ['table_number' => $table['table_number']],
                $table
            );
        }
    }
}
