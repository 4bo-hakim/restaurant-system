<?php

namespace App\Http\Requests\Api;

use App\Models\Reservation;
use Carbon\Carbon;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class ReservationRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        if ($this->isMethod('post')) {
            return [
                'table_id' => 'required|integer|exists:tables,id',
                'name' => 'required|string|max:255',
                'phone_number' => 'required|string|max:20',
                'reservation_at' => 'required|date|after_or_equal:now',
                'reservation_end' => 'required|date|after:reservation_at',
                'guest_count' => 'required|integer|min:1|max:50',
                'status' => 'sometimes|string|in:pending,confirmed,cancelled,completed',
                'note' => 'nullable|string',
            ];
        } elseif ($this->isMethod('put') || $this->isMethod('patch')) {
            return [
                'table_id' => 'sometimes|integer|exists:tables,id',
                'name' => 'sometimes|string|max:255',
                'phone_number' => 'sometimes|string|max:20',
                'reservation_at' => [
                    'sometimes',
                    'date',
                    function (string $attribute, mixed $value, \Closure $fail): void {
                        $reservation = $this->route('reservation');
                        if (! $reservation instanceof Reservation) {
                            $reservation = Reservation::find($reservation);
                        }

                        try {
                            $newDate = Carbon::parse($value);
                        } catch (\Throwable) {
                            return;
                        }

                        if (! $reservation) {
                            return;
                        }

                        // If the date was not changed, allow it even if the reservation is in the past
                        if (
                            $reservation->reservation_at && (
                                $newDate->equalTo($reservation->reservation_at) ||
                                $newDate->format('Y-m-d H:i') === $reservation->reservation_at->format('Y-m-d H:i')
                            )
                        ) {
                            return;
                        }

                        // If changed to a new date/time, ensure it is not in the past
                        if ($newDate->isBefore(now()->subMinutes(5))) {
                            $fail('The reservation at field must be a date after or equal to now.');
                        }
                    },
                ],
                'reservation_end' => 'sometimes|date|after:reservation_at',
                'guest_count' => 'sometimes|integer|min:1|max:50',
                'status' => 'sometimes|string|in:pending,confirmed,cancelled,completed',
                'note' => 'nullable|string',
            ];
        }

        return [];
    }
}
