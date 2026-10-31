<?php

namespace App\Policies;

use App\Models\Project;
use App\Models\User;

class ProjectPolicy
{
    public function __construct(private WorkspacePolicy $workspaces) {}

    public function view(User $user, Project $project): bool
    {
        return $this->workspaces->view($user, $project->workspace);
    }

    public function update(User $user, Project $project): bool
    {
        return $this->workspaces->contribute($user, $project->workspace);
    }

    public function delete(User $user, Project $project): bool
    {
        return $this->workspaces->contribute($user, $project->workspace);
    }
}
