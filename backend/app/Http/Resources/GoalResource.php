<?php

namespace App\Http\Resources;

use App\Models\Goal;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Goal
 */
class GoalResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'color' => $this->color,
            'owner' => $this->owner ? ['id' => $this->owner->id, 'name' => $this->owner->name] : null,
            'start_date' => $this->start_date?->toDateString(),
            'due_date' => $this->due_date?->toDateString(),
            'closed' => $this->closed_at !== null,
            'progress' => (int) round($this->progress() * 100),
            'health' => $this->health(),
            'key_results' => KeyResultResource::collection($this->keyResults),
            'created_at' => $this->created_at,
        ];
    }
}
