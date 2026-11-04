<?php

namespace App\Http\Resources;

use App\Models\Task;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Task
 */
class TaskResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'priority' => $this->priority,
            'status_id' => $this->status_id,
            'project_id' => $this->project_id,
            'parent_id' => $this->parent_id,
            'start_at' => $this->start_at,
            'due_at' => $this->due_at,
            'completed' => $this->isCompleted(),
            'completed_at' => $this->completed_at,
            'position' => $this->position,
            'project' => $this->whenLoaded('project', fn () => $this->project
                ? ['id' => $this->project->id, 'name' => $this->project->name, 'color' => $this->project->color]
                : null),
            'assignees' => MemberResource::collection($this->whenLoaded('assignees')),
            'subtasks_count' => $this->whenCounted('subtasks'),
            'subtasks_done_count' => $this->whenCounted('done_subtasks'),
            'comments_count' => $this->whenCounted('comments'),
            'subtasks' => TaskResource::collection($this->whenLoaded('subtasks')),
            'comments' => CommentResource::collection($this->whenLoaded('comments')),
            'created_at' => $this->created_at,
        ];
    }
}
