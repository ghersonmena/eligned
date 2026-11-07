<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['task_id', 'user_id', 'body'])]
class Comment extends Model
{
    protected static function booted(): void
    {
        // One by one so each file is removed from disk too.
        static::deleting(fn (Comment $c) => $c->attachments->each->delete());
    }

    /**
     * @return BelongsTo<Task, $this>
     */
    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return HasMany<CommentAttachment, $this>
     */
    public function attachments(): HasMany
    {
        return $this->hasMany(CommentAttachment::class);
    }

    /** Short text for the history and notifications ("📎 2 archivos" when it only has files). */
    public function excerpt(int $width): string
    {
        if ($this->body !== '') {
            return mb_strimwidth($this->body, 0, $width, '…');
        }
        $count = $this->attachments()->count();

        return '📎 '.($count === 1 ? __('1 archivo') : __(':n archivos', ['n' => $count]));
    }
}
