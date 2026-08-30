<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class FoodRequest extends FormRequest
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
                'sub_category_id' => 'required|integer|exists:sub_categories,id',
                'name' => 'required|array',
                'name.en' => 'required|string|max:255',
                'name.ar' => 'required|string|max:255',
                'name.ku' => 'required|string|max:255',
                'description' => 'nullable|array',
                'description.en' => 'nullable|string',
                'description.ar' => 'nullable|string',
                'description.ku' => 'nullable|string',
                'size' => 'nullable|string|max:100',
                'price' => 'required|integer|min:0',
                'is_available' => 'nullable|boolean',
                'image_path' => 'nullable|image|max:2048',
            ];
        }

        return [
            'sub_category_id' => 'sometimes|required|integer|exists:sub_categories,id',
            'name' => 'sometimes|array',
            'name.en' => 'sometimes|required|string|max:255',
            'name.ar' => 'sometimes|required|string|max:255',
            'name.ku' => 'sometimes|required|string|max:255',
            'description' => 'nullable|array',
            'description.en' => 'nullable|string',
            'description.ar' => 'nullable|string',
            'description.ku' => 'nullable|string',
            'size' => 'nullable|string|max:100',
            'price' => 'sometimes|required|integer|min:0',
            'is_available' => 'nullable|boolean',
            'image_path' => 'nullable|image|max:2048',
        ];
    }
}
