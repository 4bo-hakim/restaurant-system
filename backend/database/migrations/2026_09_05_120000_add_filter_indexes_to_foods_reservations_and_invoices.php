<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('foods', function (Blueprint $table) {
            $table->index('sub_category_id', 'foods_sub_category_id_index');
            $table->index('is_available', 'foods_is_available_index');
        });

        Schema::table('reservations', function (Blueprint $table) {
            $table->index('status', 'reservations_status_index');
            $table->index('reservation_at', 'reservations_reservation_at_index');
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->index('status', 'invoices_status_index');
            $table->index('created_at', 'invoices_created_at_index');
        });
    }

    public function down(): void
    {
        Schema::table('foods', function (Blueprint $table) {
            $table->dropIndex('foods_sub_category_id_index');
            $table->dropIndex('foods_is_available_index');
        });

        Schema::table('reservations', function (Blueprint $table) {
            $table->dropIndex('reservations_status_index');
            $table->dropIndex('reservations_reservation_at_index');
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->dropIndex('invoices_status_index');
            $table->dropIndex('invoices_created_at_index');
        });
    }
};
