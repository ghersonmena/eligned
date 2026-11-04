<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ResolvesWorkspace;
use Illuminate\Foundation\Http\FormRequest;

/** Kanban drag and drop: target column and place inside it. */
class MoveTaskRequest extends FormRequest
{
    use ResolvesWorkspace;

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'status_id' => ['required', 'integer', $this->statusInWorkspace()],
            'position' => ['required', 'integer', 'min:0', 'max:100000'],
        ];
    }
}
