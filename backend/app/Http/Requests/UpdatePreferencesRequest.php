<?php

namespace App\Http\Requests;

use App\Enums\Theme;
use App\Models\User;
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
            'home_layout' => ['sometimes', 'nullable', 'array', 'max:20'],
            'home_layout.*.id' => ['required', 'distinct', Rule::in(User::HOME_CARDS)],
            'home_layout.*.hidden' => ['required', 'boolean'],
            'locale' => ['sometimes', Rule::in(User::LOCALES)],
            'home_note' => ['sometimes', 'nullable', 'string', 'max:'.User::HOME_NOTE_MAX],
            'seen_version' => ['sometimes', 'nullable', 'string', 'max:20', 'regex:/^\d+\.\d+\.\d+$/'],
            'current_workspace_id' => [
                'sometimes',
                'nullable',
                'integer',
                fn (string $attribute, mixed $value, \Closure $fail) => $value === null
                    || $this->user()->workspaces()->whereKey($value)->exists()
                    || $fail(__('No perteneces a ese espacio.')),
            ],
        ];
    }
}
