<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\ReservationRequest;
use App\Models\Reservation;
use Illuminate\Support\Facades\Validator;

class ReservationController extends Controller
{
    public function index()
    {
        $request = request();

        $validator = Validator::make($request->query(), [
            'status' => ['nullable', 'in:pending,confirmed,cancelled,completed'],
            'table_id' => ['nullable', 'integer'],
            'date' => ['nullable', 'date_format:Y-m-d'],
        ]);

        if ($validator->fails()) {
            return $this->error('Invalid reservation filters', 422, $validator->errors());
        }

        $filters = $validator->validated();

        $reservationQuery = Reservation::with('table')
            ->when($filters['status'] ?? null, fn($query, $status) => $query->where('status', $status))
            ->when(array_key_exists('table_id', $filters), fn($query) => $query->where('table_id', $filters['table_id']))
            ->when($filters['date'] ?? null, fn($query, $date) => $query->whereDate('reservation_at', $date));

        $reservations = auth()->user()->hasRole('admin')
            ? $reservationQuery->paginate(20)
            : $reservationQuery->get();

        return $this->success($reservations, 'Reservations retrieved successfully');
    }

    public function show($id)
    {
        $reservation = Reservation::with('table')->find($id);

        if (!$reservation) {
            return $this->error('Reservation not found', 404);
        }

        return $this->success($reservation, 'Reservation retrieved successfully');
    }

    public function store(ReservationRequest $request)
    {
        $validated = $request->validated();

        // Check for overlapping reservations
        $overlap = Reservation::where('table_id', $validated['table_id'])
            ->where('status', '!=', 'cancelled')
            ->where('reservation_at', '<', $validated['reservation_end'])
            ->where('reservation_end', '>', $validated['reservation_at'])
            ->exists();

        if ($overlap) {
            return $this->error('This table is already reserved during the selected time', 409);
        }

        $reservation = Reservation::create([
            'table_id' => $validated['table_id'],
            'name' => $validated['name'],
            'phone_number' => $validated['phone_number'],
            'reservation_at' => $validated['reservation_at'],
            'reservation_end' => $validated['reservation_end'],
            'guest_count' => $validated['guest_count'],
            'status' => $validated['status'] ?? 'pending',
            'note' => $validated['note'] ?? null,
            'created_by' => auth()->id(),
        ]);

        return $this->success($reservation->load('table'), 'Reservation created successfully', 201);
    }

    public function update(ReservationRequest $request, $id)
    {
        $reservation = Reservation::find($id);

        if (!$reservation) {
            return $this->error('Reservation not found', 404);
        }

        $validated = $request->validated();

        // If reservation_at or reservation_end is being changed, check for overlaps
        if (isset($validated['reservation_at']) || isset($validated['reservation_end'])) {
            $reservation_at = $validated['reservation_at'] ?? $reservation->reservation_at;
            $reservation_end = $validated['reservation_end'] ?? $reservation->reservation_end;

            $overlap = Reservation::where('table_id', $validated['table_id'] ?? $reservation->table_id)
                ->where('id', '!=', $id)
                ->where('status', '!=', 'cancelled')
                ->where('reservation_at', '<', $reservation_end)
                ->where('reservation_end', '>', $reservation_at)
                ->exists();

            if ($overlap) {
                return $this->error('This table is already reserved during the selected time', 409);
            }
        }

        $reservation->update($validated);

        return $this->success($reservation->load('table'), 'Reservation updated successfully');
    }

    public function destroy($id)
    {
        $reservation = Reservation::find($id);

        if (!$reservation) {
            return $this->error('Reservation not found', 404);
        }

        $reservation->delete();

        return $this->success(null, 'Reservation deleted successfully');
    }
}
