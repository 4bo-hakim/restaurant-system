<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class SubCategoryRequest extends FormRequest
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
     */
    public function rules(): array
    {
        if ($this->isMethod('post')) {
            return [
                'category_id' => 'required|integer|exists:categories,id',
                'name' => 'required|array',
                'name.en' => 'required|string|max:255',
                'name.ar' => 'required|string|max:255',
                'name.ku' => 'required|string|max:255',
                'image' => 'nullable|image|max:2048',
            ];
        }

        return [
            'category_id' => 'sometimes|required|integer|exists:categories,id',
            'name' => 'sometimes|array',
            'name.en' => 'sometimes|required|string|max:255',
            'name.ar' => 'sometimes|required|string|max:255',
            'name.ku' => 'sometimes|required|string|max:255',
            'image' => 'nullable|image|max:2048',
        ];
    }
}
