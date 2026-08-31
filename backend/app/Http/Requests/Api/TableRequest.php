<?php

namespace App\Http\Requests\Api;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class TableRequest extends FormRequest
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
                'table_number' => 'required|string|max:50|unique:tables,table_number',
            ];
        } elseif ($this->isMethod('put') || $this->isMethod('patch')) {
            return [
                'table_number' => 'sometimes|string|max:50|unique:tables,table_number,' . $this->route('table'),
            ];
        }

        return [];
    }
}
