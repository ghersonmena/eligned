<?php

namespace App\Http\Resources;

use App\Models\Comment;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Comment
 */
class CommentResource extends JsonResource
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
            'body' => $this->body,
            'author' => $this->user ? ['id' => $this->user->id, 'name' => $this->user->name] : null,
            'attachments' => $this->whenLoaded('attachments', fn () => $this->attachments->map(fn ($a) => [
                'id' => $a->id,
                'name' => $a->name,
                'mime' => $a->mime,
                'size' => $a->size,
                'is_image' => $a->isImage(),
                'url' => "/api/v1/attachments/{$a->id}",
            ])->values()),
            'can_delete' => $request->user()?->can('delete', $this->resource) ?? false,
            'created_at' => $this->created_at,
        ];
    }
}
