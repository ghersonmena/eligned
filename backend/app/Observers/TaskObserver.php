<?php

namespace App\Observers;

use App\Models\Activity;
use App\Models\Project;
use App\Models\Task;
use App\Models\TaskStatus;
use App\Models\TimeEntry;
use App\Support\LiveUpdates;

/** Writes the task history. Ordering fields (position, board_position) are not history. */
class TaskObserver
{
    /** Fields whose changes show up in the history. */
    private const TRACKED = ['title', 'description', 'priority', 'status_id', 'project_id', 'start_at', 'due_at', 'completed_at'];

    public function created(Task $task): void
    {
        Activity::record($task, 'created');

        if ($task->parent_id && ($parent = Task::find($task->parent_id))) {
            Activity::record($parent, 'subtask_added', ['subtask' => $task->title]);
        }
    }

    public function updated(Task $task): void
    {
        // Also plain reorders (board), which are not history.
        app(LiveUpdates::class)->touch($task->workspace_id, $task->id);

        $changes = [];
        foreach (self::TRACKED as $field) {
            if (! $task->wasChanged($field)) {
                continue;
            }
            $from = $task->getOriginal($field);
            $to = $task->getAttribute($field);
            $changes[$field] = match ($field) {
                // Long text: only say it changed.
                'description' => null,
                'status_id' => [TaskStatus::find($from)?->name, TaskStatus::find($to)?->name],
                'project_id' => [$from ? Project::find($from)?->name : null, $to ? Project::find($to)?->name : null],
                'start_at', 'due_at', 'completed_at' => [$from?->toIso8601String(), $to?->toIso8601String()],
                default => [$from, $to],
            };
        }

        if ($changes === []) {
            return;
        }

        // "Before the due date" reminders follow it.
        if ($task->wasChanged('due_at')) {
            $task->reminders()->whereNotNull('offset_minutes')->get()->each->followDueDate($task->due_at);
        }

        // Finishing a task stops the timers running on it.
        if ($task->wasChanged('completed_at') && $task->completed_at !== null) {
            TimeEntry::running()->where('task_id', $task->id)->get()->each->stop();
        }

        if ($task->activityReason) {
            $changes['reason'] = $task->activityReason;
            $task->activityReason = null;
        }

        Activity::record($task, 'updated', $changes);
    }

    public function deleted(Task $task): void
    {
        Activity::record($task, 'deleted');
    }
}
