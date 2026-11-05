<?php

namespace App\Http\Requests;

use App\Enums\Theme;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePreferencesRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'theme' => ['sometimes', Rule::enum(Theme::class)],
            'confetti' => ['sometimes', 'boolean'],
            'timezone' => ['sometimes', 'timezone:all'],
            'due_notice_minutes' => ['sometimes', 'nullable', 'integer', 'in:5,15,30,60,120,1440'],
            'all_day_notice' => ['sometimes', 'boolean'],
            'all_day_notice_time' => ['sometimes', 'date_format:H:i'],
            'popups' => ['sometimes', 'boolean'],
        ];
    }
}
