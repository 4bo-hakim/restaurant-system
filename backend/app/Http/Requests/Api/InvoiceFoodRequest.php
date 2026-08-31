<?php

namespace App\Http\Requests\Api;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class InvoiceFoodRequest extends FormRequest
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
                'food_id' => 'required|integer|exists:foods,id',
                'person_number' => 'required|integer|min:1|max:8',
                'quantity' => 'required|integer|min:1',
                'note' => 'nullable|string',
            ];
        }

        return [
            'food_id' => 'sometimes|required|integer|exists:foods,id',
            'person_number' => 'sometimes|required|integer|min:1|max:8',
            'quantity' => 'sometimes|required|integer|min:1',
            'note' => 'nullable|string',
        ];
    }
}
