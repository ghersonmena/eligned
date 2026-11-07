<?php

use App\Models\User;
use App\Models\Workspace;
use Illuminate\Support\Facades\Broadcast;

// Personal channel: notifications (popups) for one person.
Broadcast::channel('App.Models.User.{id}', fn (User $user, int $id) => $user->id === $id);

// Workspace channel: "something changed" so open screens refresh themselves.
Broadcast::channel('workspace.{workspace}', fn (User $user, Workspace $workspace) => $user->can('view', $workspace));
