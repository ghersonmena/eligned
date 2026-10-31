<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ResolvesWorkspace;
use Illuminate\Foundation\Http\FormRequest;

class UpdateTaskRequest extends FormRequest
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
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string', 'max:20000'],
            'priority' => ['sometimes', 'integer', 'between:1,3'],
            'start_at' => ['sometimes', 'nullable', 'date'],
            'due_at' => ['sometimes', 'nullable', 'date'],
            'project_id' => ['sometimes', 'nullable', 'integer', $this->projectInWorkspace()],
            'status_id' => ['sometimes', 'integer', $this->statusInWorkspace()],
            'completed' => ['sometimes', 'boolean'],
            'assignee_ids' => ['sometimes', 'array', 'max:20'],
            'assignee_ids.*' => ['integer', 'distinct', $this->memberOfWorkspace()],
        ];
    }
}
