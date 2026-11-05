<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreCommentRequest;
use App\Http\Resources\CommentResource;
use App\Models\Activity;
use App\Models\Comment;
use App\Models\Task;
use App\Models\User;
use App\Notifications\TaskAlert;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

class CommentController extends Controller
{
    public function store(StoreCommentRequest $request, Task $task): CommentResource
    {
        // Guests can read but not comment.
        Gate::authorize('update', $task);

        $comment = $task->comments()->create([
            'user_id' => $request->user()->id,
            'body' => $request->validated('body'),
        ]);

        Activity::record($task, 'commented', ['excerpt' => mb_strimwidth($comment->body, 0, 80, '…')]);

        // Everyone involved hears about it, except the author.
        $author = $request->user();
        $task->assignees->concat([$task->creator])->filter()->unique('id')
            ->reject(fn (User $u) => $u->is($author))
            ->each(fn (User $u) => $u->notify(TaskAlert::for('commented', $task, "{$author->name}: ".mb_strimwidth($comment->body, 0, 120, '…'))));

        return new CommentResource($comment->load('user'));
    }

    public function destroy(Comment $comment): Response
    {
        Gate::authorize('delete', $comment);

        $comment->delete();

        return response()->noContent();
    }
}
