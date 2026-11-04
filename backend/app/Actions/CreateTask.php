<?php

namespace App\Actions;

use App\Models\Task;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Support\Facades\DB;

class CreateTask
{
    /**
     * @param  array<string, mixed>  $data  Validated input (StoreTaskRequest).
     */
    public function handle(Workspace $workspace, User $author, array $data, ?Task $parent = null): Task
    {
        return DB::transaction(function () use ($workspace, $author, $data, $parent) {
            $statuses = $workspace->statuses;
            $status = isset($data['status_id'])
                ? $statuses->firstWhere('id', $data['status_id'])
                : $statuses->firstWhere('is_done', false);

            $task = new Task([
                ...collect($data)->except(['assignee_ids', 'status_id'])->all(),
                'workspace_id' => $workspace->id,
                'parent_id' => $parent?->id,
                // Subtasks always live in the same project as their parent.
                'project_id' => $parent ? $parent->project_id : ($data['project_id'] ?? null),
                'created_by' => $author->id,
                'position' => (int) $workspace->tasks()->where('parent_id', $parent?->id)->max('position') + 1,
            ]);
            $task->setRelation('workspace', $workspace);
            $task->moveToStatus($status);
            $task->save();

            if (! empty($data['assignee_ids'])) {
                $task->assignees()->sync($data['assignee_ids']);
            }

            // A new open subtask reopens a completed parent.
            $task->syncParentCompletion();

            return $task;
        });
    }
}
