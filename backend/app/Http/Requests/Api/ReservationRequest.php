<?php

namespace App\Http\Requests\Api;

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
                'reservation_at' => 'sometimes|date|after_or_equal:now',
                'reservation_end' => 'sometimes|date|after:reservation_at',
                'guest_count' => 'sometimes|integer|min:1|max:50',
                'status' => 'sometimes|string|in:pending,confirmed,cancelled,completed',
                'note' => 'nullable|string',
            ];
        }

        return [];
    }
}
