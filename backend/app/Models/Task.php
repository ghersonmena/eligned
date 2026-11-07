<?php

namespace App\Models;

use App\Observers\TaskObserver;
use Database\Factories\TaskFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'workspace_id', 'project_id', 'parent_id', 'status_id', 'title', 'description',
    'priority', 'start_at', 'due_at', 'position', 'board_position', 'completed_at', 'created_by',
])]
#[ObservedBy(TaskObserver::class)]
class Task extends Model
{
    /** @use HasFactory<TaskFactory> */
    use HasFactory;

    /**
     * Why the next save happens when it's not a direct edit (e.g. "subtasks":
     * completed or re-dated by its subtasks). Shown in the history.
     */
    public ?string $activityReason = null;

    public const PRIORITY_HIGH = 1;

    public const PRIORITY_MEDIUM = 2;

    public const PRIORITY_LOW = 3;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'priority' => 'integer',
            'board_position' => 'integer',
            'start_at' => 'datetime',
            'due_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Workspace, $this>
     */
    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }

    /**
     * @return BelongsTo<Project, $this>
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    /**
     * @return BelongsTo<TaskStatus, $this>
     */
    public function status(): BelongsTo
    {
        return $this->belongsTo(TaskStatus::class, 'status_id');
    }

    /**
     * @return BelongsTo<Task, $this>
     */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(Task::class, 'parent_id');
    }

    /**
     * @return HasMany<Task, $this>
     */
    public function subtasks(): HasMany
    {
        return $this->hasMany(Task::class, 'parent_id')->orderBy('position');
    }

    /**
     * @return BelongsToMany<User, $this>
     */
    public function assignees(): BelongsToMany
    {
        return $this->belongsToMany(User::class)->withTimestamps();
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * @return HasMany<Reminder, $this>
     */
    public function reminders(): HasMany
    {
        return $this->hasMany(Reminder::class);
    }

    /**
     * @return HasMany<TimeEntry, $this>
     */
    public function timeEntries(): HasMany
    {
        return $this->hasMany(TimeEntry::class);
    }

    /**
     * @return HasMany<Activity, $this>
     */
    public function activities(): HasMany
    {
        return $this->hasMany(Activity::class);
    }

    /**
     * @return HasMany<Comment, $this>
     */
    public function comments(): HasMany
    {
        return $this->hasMany(Comment::class)->oldest();
    }

    public function isCompleted(): bool
    {
        return $this->completed_at !== null;
    }

    /**
     * Completing moves the task to the workspace's "done" column and
     * reopening moves it back to the first open one (and vice versa).
     */
    public function setCompleted(bool $completed): void
    {
        $statuses = $this->workspace->statuses;

        if ($completed) {
            $this->completed_at ??= now();
            if (! $this->status?->is_done) {
                $this->status_id = $statuses->firstWhere('is_done', true)?->id ?? $this->status_id;
            }
        } else {
            $this->completed_at = null;
            if ($this->status?->is_done) {
                $this->status_id = $statuses->firstWhere('is_done', false)?->id ?? $this->status_id;
            }
        }
    }

    /**
     * A parent task is completed exactly when all of its subtasks are: finishing
     * the last subtask completes it, and reopening or adding one reopens it.
     */
    public function syncParentCompletion(): void
    {
        $parent = $this->parent_id ? Task::find($this->parent_id) : null;
        if (! $parent) {
            return;
        }

        $subtasks = $parent->subtasks()->get(['id', 'completed_at']);
        $allDone = $subtasks->isNotEmpty() && $subtasks->every(fn (Task $s) => $s->completed_at !== null);

        if ($allDone !== $parent->isCompleted()) {
            $parent->setCompleted($allDone);
            $parent->activityReason = 'subtasks';
            $parent->save();
        }
    }

    /** After a subtask's dates change (or it is added/removed), its parent's span follows. */
    public function syncParentDates(): void
    {
        if ($this->parent_id) {
            Task::find($this->parent_id)?->syncDatesFromSubtasks();
        }
    }

    /**
     * A task with dated subtasks spans them: it starts on the earliest subtask
     * date and is due on the latest one. Without dated subtasks its own dates
     * are kept as they are.
     */
    public function syncDatesFromSubtasks(): void
    {
        $subtasks = $this->subtasks()->get(['id', 'start_at', 'due_at']);
        $starts = $subtasks->map(fn (Task $s) => $s->start_at ?? $s->due_at)->filter()->sortBy(fn ($d) => $d->getTimestamp());
        $ends = $subtasks->map(fn (Task $s) => $s->due_at ?? $s->start_at)->filter()->sortBy(fn ($d) => $d->getTimestamp());

        if ($starts->isEmpty()) {
            return;
        }

        $this->start_at = $starts->first();
        $this->due_at = $ends->last();
        if ($this->isDirty(['start_at', 'due_at'])) {
            $this->activityReason = 'subtasks';
            $this->save();
        }
    }

    /** Keeps completed_at in sync when the status is changed directly (e.g. Kanban). */
    public function moveToStatus(TaskStatus $status): void
    {
        $this->status_id = $status->id;
        $this->completed_at = $status->is_done ? ($this->completed_at ?? now()) : null;
    }
}
