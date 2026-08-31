<?php

namespace App\Http\Requests\Api;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class InvoiceRequest extends FormRequest
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
                'discount' => 'nullable|integer|min:0',
                'items' => 'nullable|array',
                'items.*.food_id' => 'required|integer|exists:foods,id',
                'items.*.person_number' => 'required|integer|min:1|max:8',
                'items.*.quantity' => 'required|integer|min:1',
                'items.*.note' => 'nullable|string',
            ];
        } elseif ($this->isMethod('put') || $this->isMethod('patch')) {
            return [
                'status' => 'sometimes|string|in:pending,completed,cancelled',
                'discount' => 'sometimes|integer|min:0',
            ];
        }

        return [];
    }
}
