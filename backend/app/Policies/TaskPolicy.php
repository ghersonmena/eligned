<?php

namespace App\Policies;

use App\Models\Task;
use App\Models\User;

class TaskPolicy
{
    public function __construct(private WorkspacePolicy $workspaces) {}

    public function view(User $user, Task $task): bool
    {
        return $this->workspaces->view($user, $task->workspace);
    }

    public function update(User $user, Task $task): bool
    {
        return $this->workspaces->contribute($user, $task->workspace);
    }

    public function delete(User $user, Task $task): bool
    {
        return $this->workspaces->contribute($user, $task->workspace);
    }
}
