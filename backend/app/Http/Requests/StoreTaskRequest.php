<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ResolvesWorkspace;
use Illuminate\Foundation\Http\FormRequest;

class StoreTaskRequest extends FormRequest
{
    use ResolvesWorkspace;

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:20000'],
            'priority' => ['sometimes', 'integer', 'between:1,3'],
            'start_at' => ['nullable', 'date'],
            'due_at' => ['nullable', 'date'],
            'project_id' => ['nullable', 'integer', $this->projectInWorkspace()],
            'status_id' => ['nullable', 'integer', $this->statusInWorkspace()],
            'assignee_ids' => ['sometimes', 'array', 'max:20'],
            'assignee_ids.*' => ['integer', 'distinct', $this->memberOfWorkspace()],
        ];
    }
}
