<?php

namespace App\Policies;

use App\Enums\WorkspaceRole;
use App\Models\User;
use App\Models\Workspace;

class WorkspacePolicy
{
    /** Any member can see the workspace and its content. */
    public function view(User $user, Workspace $workspace): bool
    {
        return $workspace->roleOf($user) !== null;
    }

    /** Guests are read-only; everyone else can create and edit content. */
    public function contribute(User $user, Workspace $workspace): bool
    {
        $role = $workspace->roleOf($user);

        return $role !== null && $role !== WorkspaceRole::Guest;
    }

    /** Owners and admins can moderate (e.g. delete other people's comments). */
    public function manage(User $user, Workspace $workspace): bool
    {
        return in_array($workspace->roleOf($user), [WorkspaceRole::Owner, WorkspaceRole::Admin], true);
    }
}
