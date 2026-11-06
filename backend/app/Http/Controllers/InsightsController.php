<?php

namespace App\Http\Controllers;

use App\Models\Comment;
use App\Models\Task;
use App\Models\TimeEntry;
use App\Models\Workspace;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

/**
 * Extra home cards, all about the signed-in person ("mine" = assigned to me,
 * or with nobody assigned, as in SummaryController):
 *
 * - completed: when each of my tasks was finished since `since`. The app
 *   groups them by its local day (no time zone guessing here).
 * - time_by_project: my logged minutes since `week_start`, per project.
 * - stale: my open tasks with no change, comment or logged time in STALE_DAYS days.
 * - comments: the latest comments other people left on my tasks.
 */
class InsightsController extends Controller
{
    public const STALE_DAYS = 14;

    private const MAX_DAYS = 31;

    public function __invoke(Request $request, Workspace $workspace): JsonResponse
    {
        Gate::authorize('view', $workspace);
        $request->validate([
            'since' => ['required', 'date', 'after:-'.(self::MAX_DAYS + 1).' days'],
            'week_start' => ['required', 'date'],
        ]);
        $userId = $request->user()->id;

        $mine = fn (): Builder => Task::query()
            ->where('workspace_id', $workspace->id)
            ->where(fn (Builder $q) => $q->whereHas('assignees', fn (Builder $a) => $a->whereKey($userId))
                ->orWhereDoesntHave('assignees'));

        $completed = $mine()->whereDoesntHave('subtasks')
            ->where('completed_at', '>=', $request->date('since'))
            ->orderBy('completed_at')
            ->pluck('completed_at')
            ->map(fn ($at) => $at->toIso8601String());

        $time = TimeEntry::query()
            ->where('time_entries.workspace_id', $workspace->id)
            ->where('time_entries.user_id', $userId)
            ->whereNotNull('time_entries.ended_at')
            ->where('time_entries.started_at', '>=', $request->date('week_start'))
            ->join('tasks', 'tasks.id', '=', 'time_entries.task_id')
            // Subtasks count for their parent's project.
            ->leftJoin('tasks as parents', 'parents.id', '=', 'tasks.parent_id')
            ->leftJoin('projects', 'projects.id', '=', DB::raw('coalesce(tasks.project_id, parents.project_id)'))
            ->groupBy('projects.id', 'projects.name', 'projects.color')
            ->selectRaw('projects.id as id, projects.name as name, projects.color as color, sum(time_entries.minutes) as minutes')
            ->orderByDesc('minutes')
            ->get()
            ->map(fn ($r) => [
                'project' => $r->id ? ['id' => (int) $r->id, 'name' => $r->name, 'color' => $r->color] : null,
                'minutes' => (int) $r->minutes,
            ]);

        $cutoff = now()->subDays(self::STALE_DAYS);
        // Comments and logged time leave an activity entry without touching the task.
        $staleQuery = $mine()->whereNull('completed_at')->whereNull('parent_id')
            ->where('updated_at', '<', $cutoff)
            ->whereDoesntHave('activities', fn (Builder $a) => $a->where('created_at', '>=', $cutoff));
        $stale = (clone $staleQuery)->with('project:id,name,color')->oldest('updated_at')->limit(6)
            ->get(['id', 'title', 'project_id', 'due_at', 'updated_at'])
            ->map(fn (Task $t) => [
                'id' => $t->id,
                'title' => $t->title,
                'project' => $t->project?->only(['id', 'name', 'color']),
                'due_at' => $t->due_at?->toIso8601String(),
                'updated_at' => $t->updated_at->toIso8601String(),
            ]);

        $comments = Comment::query()
            ->where('user_id', '!=', $userId)
            ->whereHas('task', fn (Builder $t) => $t->where('workspace_id', $workspace->id)
                ->where(fn (Builder $q) => $q->whereHas('assignees', fn (Builder $a) => $a->whereKey($userId))
                    ->orWhere('created_by', $userId)))
            ->with(['user:id,name', 'task:id,title'])
            ->withCount('attachments')
            ->latest()->latest('id')->limit(5)
            ->get()
            ->map(fn (Comment $c) => [
                'id' => $c->id,
                'excerpt' => $c->excerpt(140),
                'author' => $c->user?->only(['id', 'name']),
                'task' => $c->task->only(['id', 'title']),
                'created_at' => $c->created_at->toIso8601String(),
            ]);

        return response()->json(['data' => [
            'completed' => $completed,
            'time_by_project' => $time,
            'stale' => $stale,
            'stale_count' => $staleQuery->count(),
            'stale_days' => self::STALE_DAYS,
            'comments' => $comments,
        ]]);
    }
}
