<?php

namespace App\Http\Resources;

use App\Models\KeyResult;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin KeyResult
 */
class KeyResultResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'goal_id' => $this->goal_id,
            'title' => $this->title,
            'kind' => $this->kind,
            'start_value' => $this->start_value,
            'target_value' => $this->target_value,
            'current_value' => $this->current_value,
            'unit' => $this->unit,
            'project' => $this->project ? ['id' => $this->project->id, 'name' => $this->project->name, 'color' => $this->project->color] : null,
            'tasks' => $this->kind === 'tasks' ? $this->taskCounts() : null,
            'progress' => (int) round($this->progress() * 100),
        ];
    }
}
