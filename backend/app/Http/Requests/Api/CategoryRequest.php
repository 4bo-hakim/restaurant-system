<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class CategoryRequest extends FormRequest
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
                'name' => 'required|array',
                'name.en' => 'required|string|max:255',
                'name.ar' => 'required|string|max:255',
                'name.ku' => 'required|string|max:255',
                'image_path' => 'nullable|image|mimes:jpeg,png,jpg,gif,svg|max:2048',
            ];
        }

        return [
            'name' => 'sometimes|array',
            'name.en' => 'sometimes|required|string|max:255',
            'name.ar' => 'sometimes|required|string|max:255',
            'name.ku' => 'sometimes|required|string|max:255',
            'image_path' => 'nullable|image|mimes:jpeg,png,jpg,gif,svg|max:2048',
        ];
    }
}
