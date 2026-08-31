<?php

namespace Database\Seeders;

use App\Models\Reservation;
use Illuminate\Database\Seeder;

class ReservationSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $reservations = [
            [
                'table_id' => 1,
                'name' => 'John Doe',
                'phone_number' => '+1234567890',
                'reservation_at' => now()->addDays(1)->setHour(18)->setMinute(0),
                'reservation_end' => now()->addDays(1)->setHour(20)->setMinute(0),
                'guest_count' => 4,
                'status' => 'confirmed',
                'note' => 'Window seat preferred',
                'created_by' => 1,
            ],
            [
                'table_id' => 2,
                'name' => 'Jane Smith',
                'phone_number' => '+1234567891',
                'reservation_at' => now()->addDays(1)->setHour(19)->setMinute(0),
                'reservation_end' => now()->addDays(1)->setHour(21)->setMinute(0),
                'guest_count' => 2,
                'status' => 'pending',
                'note' => null,
                'created_by' => 1,
            ],
            [
                'table_id' => 3,
                'name' => 'Mike Johnson',
                'phone_number' => '+1234567892',
                'reservation_at' => now()->addDays(2)->setHour(17)->setMinute(30),
                'reservation_end' => now()->addDays(2)->setHour(19)->setMinute(30),
                'guest_count' => 6,
                'status' => 'confirmed',
                'note' => 'Birthday celebration',
                'created_by' => 1,
            ],
            [
                'table_id' => 1,
                'name' => 'Sarah Williams',
                'phone_number' => '+1234567893',
                'reservation_at' => now()->addDays(2)->setHour(20)->setMinute(30),
                'reservation_end' => now()->addDays(2)->setHour(22)->setMinute(30),
                'guest_count' => 3,
                'status' => 'pending',
                'note' => 'Dietary restrictions: vegetarian',
                'created_by' => 1,
            ],
            [
                'table_id' => 4,
                'name' => 'Robert Brown',
                'phone_number' => '+1234567894',
                'reservation_at' => now()->addDays(3)->setHour(18)->setMinute(0),
                'reservation_end' => now()->addDays(3)->setHour(20)->setMinute(0),
                'guest_count' => 5,
                'status' => 'confirmed',
                'note' => null,
                'created_by' => 1,
            ],
            [
                'table_id' => 5,
                'name' => 'Emma Davis',
                'phone_number' => '+1234567895',
                'reservation_at' => now()->addDays(3)->setHour(19)->setMinute(30),
                'reservation_end' => now()->addDays(3)->setHour(21)->setMinute(30),
                'guest_count' => 2,
                'status' => 'cancelled',
                'note' => null,
                'created_by' => 1,
            ],
        ];

        foreach ($reservations as $reservation) {
            Reservation::firstOrCreate(
                [
                    'table_id' => $reservation['table_id'],
                    'reservation_at' => $reservation['reservation_at'],
                ],
                $reservation
            );
        }
    }
}
