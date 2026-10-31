<?php

namespace App\Policies;

use App\Models\Comment;
use App\Models\User;

class CommentPolicy
{
    public function __construct(private WorkspacePolicy $workspaces) {}

    /** Authors can delete their own comments; owners and admins any comment. */
    public function delete(User $user, Comment $comment): bool
    {
        return $comment->user_id === $user->id
            || $this->workspaces->manage($user, $comment->task->workspace);
    }
}
