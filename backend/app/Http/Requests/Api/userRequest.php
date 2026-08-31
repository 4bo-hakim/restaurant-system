<?php

namespace App\Http\Requests\api;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class userRequest extends FormRequest
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
    public function rules()
    {
        if ($this->isMethod('POST')) {
            return [
                'name' => 'required|string|max:255',
                'email' => 'required|email|unique:users,email',
                'password' => 'required|string|min:8|confirmed',
                'role' => 'required|string|exists:roles,name',
                'permissions' => 'sometimes|array',
                'permissions.*' => 'string|exists:permissions,name'
            ];
        } elseif ($this->isMethod('PUT') || $this->isMethod('PATCH')) {
            return [
                'name' => 'sometimes|required|string|max:255',
                'email' => 'sometimes|required|email|unique:users,email,' . $this->route('user'),
                'password' => 'sometimes|required|string|min:8|confirmed',
                'role' => 'sometimes|required|string|exists:roles,name',
                'permissions' => 'sometimes|array',
                'permissions.*' => 'string|exists:permissions,name'
            ];
        }
    }
}
