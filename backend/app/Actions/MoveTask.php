<?php

namespace App\Actions;

use App\Models\Task;
use App\Models\TaskStatus;
use Illuminate\Support\Facades\DB;

class MoveTask
{
    /**
     * Puts a task (or subtask: they are cards too) in a Kanban column at the
     * given index (0 = top) and renumbers that column so positions stay
     * consecutive. Uses board_position, so the subtask order inside its parent
     * (position) is untouched.
     */
    public function handle(Task $task, TaskStatus $status, int $index): Task
    {
        return DB::transaction(function () use ($task, $status, $index) {
            $wasCompleted = $task->isCompleted();
            $task->moveToStatus($status);

            $siblings = Task::query()
                ->where('workspace_id', $task->workspace_id)
                ->where('status_id', $status->id)
                ->whereKeyNot($task->id)
                ->orderBy('board_position')
                ->orderBy('id')
                ->lockForUpdate()
                ->pluck('id')
                ->all();

            array_splice($siblings, min($index, count($siblings)), 0, [$task->id]);

            $task->board_position = array_search($task->id, $siblings, true);
            $task->save();

            foreach ($siblings as $position => $id) {
                if ($id !== $task->id) {
                    Task::whereKey($id)->where('board_position', '!=', $position)->update(['board_position' => $position]);
                }
            }

            if ($wasCompleted !== $task->isCompleted()) {
                $task->syncParentCompletion();
            }

            return $task;
        });
    }
}
