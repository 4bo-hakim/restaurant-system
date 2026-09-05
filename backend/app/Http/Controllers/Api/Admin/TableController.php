<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\TableRequest;
use App\Models\RestaurantTable;
use Illuminate\Database\QueryException;
use Carbon\Carbon;

class TableController extends Controller
{
    public function index()
    {
        $tables = RestaurantTable::all();

        return $this->success($tables, 'Tables retrieved successfully');
    }

    public function availability()
    {
        $tables = RestaurantTable::with(['invoices' => function ($query) {
            $query->where('status', 'pending');
        }, 'reservations' => function ($query) {
            $query->whereIn('status', ['pending', 'confirmed']);
        }])->get();

        $now = Carbon::now();

        $availability = $tables->map(function ($table) use ($now) {
            // Check if table has pending invoice (occupied)
            $hasPendingInvoice = $table->invoices->isNotEmpty();

            // Check if table has active reservation (reserved)
            $activeReservation = $table->reservations->first(function ($reservation) use ($now) {
                return $reservation->reservation_at <= $now && $reservation->reservation_end >= $now;
            });

            if ($hasPendingInvoice) {
                $status = 'occupied';
            } elseif ($activeReservation) {
                $status = 'reserved';
            } else {
                $status = 'available';
            }

            // Get next upcoming reservation
            $nextReservation = $table->reservations
                ->filter(function ($reservation) use ($now) {
                    return $reservation->reservation_at > $now;
                })
                ->sortBy('reservation_at')
                ->first();

            $nextReservationData = $nextReservation ? [
                'reservation_at' => $nextReservation->reservation_at,
                'name' => $nextReservation->name,
                'guest_count' => $nextReservation->guest_count,
            ] : null;

            return [
                'id' => $table->id,
                'table_number' => $table->table_number,
                'status' => $status,
                'next_reservation' => $nextReservationData,
            ];
        });

        return $this->success($availability, 'Table availability retrieved successfully');
    }

    public function show($id)
    {
        $table = RestaurantTable::find($id);

        if (!$table) {
            return $this->error('Table not found', 404);
        }

        return $this->success($table, 'Table retrieved successfully');
    }

    public function store(TableRequest $request)
    {
        $validated = $request->validated();

        $table = RestaurantTable::create([
            'table_number' => $validated['table_number'],
            'created_by' => auth()->id(),
        ]);

        return $this->success($table, 'Table created successfully', 201);
    }

    public function update(TableRequest $request, $id)
    {
        $table = RestaurantTable::find($id);

        if (!$table) {
            return $this->error('Table not found', 404);
        }

        $validated = $request->validated();

        $table->update($validated);

        return $this->success($table, 'Table updated successfully');
    }

    public function destroy($id)
    {
        $table = RestaurantTable::find($id);

        if (!$table) {
            return $this->error('Table not found', 404);
        }

        try {
            $table->delete();
        } catch (QueryException $e) {
            if ($e->getCode() == '23000') {
                return $this->error('Cannot delete table with existing reservations or invoices', 409);
            }
            throw $e;
        }

        return $this->success(null, 'Table deleted successfully');
    }
}
