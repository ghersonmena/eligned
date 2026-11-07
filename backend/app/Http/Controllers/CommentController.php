<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreCommentRequest;
use App\Http\Resources\CommentResource;
use App\Models\Activity;
use App\Models\Comment;
use App\Models\CommentAttachment;
use App\Models\Task;
use App\Models\User;
use App\Notifications\TaskAlert;
use App\Support\Locale;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class CommentController extends Controller
{
    public function store(StoreCommentRequest $request, Task $task): CommentResource
    {
        // Guests can read but not comment.
        Gate::authorize('update', $task);

        $comment = DB::transaction(function () use ($request, $task) {
            $comment = $task->comments()->create([
                'user_id' => $request->user()->id,
                'body' => trim((string) $request->validated('body')),
            ]);

            foreach ($request->file('attachments', []) as $file) {
                $comment->attachments()->create([
                    'path' => $file->store("attachments/{$task->workspace_id}/{$task->id}", 'local'),
                    'name' => mb_substr($file->getClientOriginalName(), 0, 255),
                    'mime' => $file->getMimeType() ?? 'application/octet-stream',
                    'size' => $file->getSize(),
                ]);
            }

            return $comment;
        });

        Activity::record($task, 'commented', ['excerpt' => $comment->excerpt(80)]);

        // Everyone involved hears about it, except the author.
        $author = $request->user();
        $task->assignees->concat([$task->creator])->filter()->unique('id')
            ->reject(fn (User $u) => $u->is($author))
            ->each(fn (User $u) => $u->notify(TaskAlert::for(
                'commented',
                $task,
                Locale::run($u->preferredLocale(), fn () => "{$author->name}: ".$comment->excerpt(120)),
            )));

        return new CommentResource($comment->load(['user', 'attachments']));
    }

    /** Serves a file: images inline, everything else as a download. */
    public function attachment(CommentAttachment $attachment): StreamedResponse
    {
        Gate::authorize('view', $attachment->comment->task);
        abort_unless(Storage::disk('local')->exists($attachment->path), 404);

        return Storage::disk('local')->response($attachment->path, $attachment->name, [
            'Content-Type' => $attachment->isImage() ? $attachment->mime : 'application/octet-stream',
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'private, max-age=86400',
        ], $attachment->isImage() ? 'inline' : 'attachment');
    }

    public function destroy(Comment $comment): Response
    {
        Gate::authorize('delete', $comment);

        $comment->delete();

        return response()->noContent();
    }
}
