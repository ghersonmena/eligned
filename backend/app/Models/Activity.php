<?php

namespace App\Models;

use App\Support\LiveUpdates;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One entry of a task's history.
 *
 * Events: created, updated (with `changes`: field => [from, to]), deleted,
 * commented, subtask_added, assigned (changes: added/removed names),
 * time_logged (changes: minutes).
 */
#[Fillable(['workspace_id', 'task_id', 'user_id', 'event', 'subject', 'changes'])]
class Activity extends Model
{
    public const UPDATED_AT = null;

    protected function casts(): array
    {
        return ['changes' => 'array', 'created_at' => 'datetime'];
    }

    /**
     * Records an event on a task, done by the signed-in user (null when the
     * system did it, e.g. a scheduled job).
     *
     * @param  array<string, mixed>|null  $changes
     */
    public static function record(Task $task, string $event, ?array $changes = null): self
    {
        app(LiveUpdates::class)->touch($task->workspace_id, $task->exists ? $task->id : null);

        return self::create([
            'workspace_id' => $task->workspace_id,
            'task_id' => $task->exists ? $task->id : null,
            'user_id' => auth()->id(),
            'event' => $event,
            'subject' => $task->title,
            'changes' => $changes,
        ]);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return BelongsTo<Task, $this>
     */
    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }
}
