<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RolePermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $permissions = [
            'create_category',
            'update_category',
            'delete_category',
            'create_sub_category',
            'update_sub_category',
            'delete_sub_category',
            'create_food',
            'update_food',
            'delete_food',
            'create_table',
            'update_table',
            'delete_table',
            'manage_reservations',
            'create_invoice',
            'update_invoice',
            'cancel_invoice',
            'update_invoice_item',
            'update_invoice_food_status',
            'create_user',
            'update_user',
            'delete_user',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission]);
        }

        $roles = [
            'admin',
            'cashier',
            'waiter',
            'chef',
        ];

        foreach ($roles as $roleName) {
            Role::firstOrCreate(['name' => $roleName]);
        }

        $admin = Role::findByName('admin');
        $cashier = Role::findByName('cashier');
        $waiter = Role::findByName('waiter');
        $chef = Role::findByName('chef');

        $admin->syncPermissions($permissions);

        $cashier->syncPermissions([
            'create_invoice',
            'update_invoice',
            'cancel_invoice',
        ]);

        $waiter->syncPermissions([
            'manage_reservations',
            'create_invoice',
            'create_table',
            'update_invoice_item',
        ]);

        $chef->syncPermissions([
            'update_invoice_food_status',
            'update_food',
        ]);
    }
}
