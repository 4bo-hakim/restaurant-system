<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call(RolePermissionSeeder::class);
        // $this->call(AdminUserSeeder::class);
        // $this->call(CategorySeeder::class);
        // $this->call(SubCategorySeeder::class);
        // $this->call(FoodSeeder::class);
        // $this->call(TableSeeder::class);
        // $this->call(ReservationSeeder::class);
        // $this->call(InvoiceSeeder::class);
    }
}
