<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['workspace_id', 'task_id', 'user_id', 'started_at', 'ended_at', 'minutes', 'note'])]
class TimeEntry extends Model
{
    protected function casts(): array
    {
        return ['started_at' => 'datetime', 'ended_at' => 'datetime', 'minutes' => 'integer'];
    }

    public function isRunning(): bool
    {
        return $this->ended_at === null;
    }

    /** Stops a running timer, counting whole minutes (at least one). */
    public function stop(): void
    {
        if (! $this->isRunning()) {
            return;
        }
        $this->ended_at = now();
        $this->minutes = max(1, (int) round($this->started_at->diffInSeconds($this->ended_at) / 60));
        $this->save();

        Activity::record($this->task, 'time_logged', ['minutes' => $this->minutes]);
    }

    /**
     * @param  Builder<TimeEntry>  $query
     */
    public function scopeRunning(Builder $query): void
    {
        $query->whereNull('ended_at');
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
}
