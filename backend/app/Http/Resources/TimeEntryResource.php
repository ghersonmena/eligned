<?php

namespace App\Http\Resources;

use App\Models\TimeEntry;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin TimeEntry
 */
class TimeEntryResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'task_id' => $this->task_id,
            'started_at' => $this->started_at,
            'ended_at' => $this->ended_at,
            'minutes' => $this->minutes,
            'running' => $this->isRunning(),
            'note' => $this->note,
            'user' => $this->whenLoaded('user', fn () => ['id' => $this->user->id, 'name' => $this->user->name]),
            'task' => $this->whenLoaded('task', fn () => [
                'id' => $this->task->id,
                'title' => $this->task->title,
                'project' => $this->task->project ? ['name' => $this->task->project->name, 'color' => $this->task->project->color] : null,
            ]),
            'can_delete' => $request->user()?->id === $this->user_id,
        ];
    }
}
