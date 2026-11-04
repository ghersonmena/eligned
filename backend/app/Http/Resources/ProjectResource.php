<?php

namespace App\Http\Resources;

use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Project
 */
class ProjectResource extends JsonResource
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
            'name' => $this->name,
            'description' => $this->description,
            'color' => $this->color,
            'archived' => $this->archived_at !== null,
            'open_tasks_count' => $this->whenCounted('open_tasks'),
            'done_tasks_count' => $this->whenCounted('done_tasks'),
            'created_at' => $this->created_at,
        ];
    }
}
