<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

#[Fillable(['comment_id', 'path', 'name', 'mime', 'size'])]
class CommentAttachment extends Model
{
    /** Image types the browser may show inline; anything else is downloaded. */
    public const INLINE_IMAGES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    protected static function booted(): void
    {
        static::deleted(fn (CommentAttachment $a) => Storage::disk('local')->delete($a->path));
    }

    public function isImage(): bool
    {
        return in_array($this->mime, self::INLINE_IMAGES, true);
    }

    /**
     * @return BelongsTo<Comment, $this>
     */
    public function comment(): BelongsTo
    {
        return $this->belongsTo(Comment::class);
    }
}
