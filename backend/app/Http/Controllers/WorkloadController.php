<?php

namespace App\Http\Controllers;

use App\Models\Task;
use App\Models\TimeEntry;
use App\Models\Workspace;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

/**
 * How busy each person is: their open tasks (overdue / due in the next 7 days
 * / later or without date), what they finished and the time they logged since
 * `since` (the start of the viewer's week, sent by the app).
 */
class WorkloadController extends Controller
{
    public function __invoke(Request $request, Workspace $workspace): JsonResponse
    {
        Gate::authorize('view', $workspace);
        $request->validate(['since' => ['sometimes', 'date']]);
        $since = $request->date('since') ?? now()->startOfWeek();
        $now = now();
        $weekAhead = $now->copy()->addDays(7);

        $open = Task::query()
            ->where('tasks.workspace_id', $workspace->id)
            ->whereNull('completed_at')
            // A parent with subtasks is counted through them.
            ->whereDoesntHave('subtasks');

        $assigned = DB::table('task_user')
            ->joinSub($open->clone()->select('id', 'due_at'), 't', 't.id', '=', 'task_user.task_id')
            ->groupBy('task_user.user_id')
            ->selectRaw('task_user.user_id')
            ->selectRaw('count(*) as open')
            ->selectRaw('sum(case when t.due_at < ? then 1 else 0 end) as overdue', [$now])
            ->selectRaw('sum(case when t.due_at >= ? and t.due_at < ? then 1 else 0 end) as this_week', [$now, $weekAhead])
            ->get()->keyBy('user_id');

        $done = DB::table('task_user')
            ->join('tasks', 'tasks.id', '=', 'task_user.task_id')
            ->where('tasks.workspace_id', $workspace->id)
            ->where('tasks.completed_at', '>=', $since)
            ->groupBy('task_user.user_id')
            ->selectRaw('task_user.user_id, count(*) as done')
            ->pluck('done', 'user_id');

        $minutes = TimeEntry::where('workspace_id', $workspace->id)
            ->whereNotNull('ended_at')
            ->where('started_at', '>=', $since)
            ->groupBy('user_id')
            ->selectRaw('user_id, sum(minutes) as minutes')
            ->pluck('minutes', 'user_id');

        $people = $workspace->members()->orderBy('name')->get()->map(function ($user) use ($assigned, $done, $minutes) {
            $a = $assigned->get($user->id);

            return [
                'user' => ['id' => $user->id, 'name' => $user->name],
                'role' => $user->pivot->role,
                'open' => (int) ($a->open ?? 0),
                'overdue' => (int) ($a->overdue ?? 0),
                'this_week' => (int) ($a->this_week ?? 0),
                'done_since' => (int) ($done[$user->id] ?? 0),
                'minutes_since' => (int) ($minutes[$user->id] ?? 0),
            ];
        });

        return response()->json([
            'data' => $people->values(),
            'unassigned' => $open->clone()->whereDoesntHave('assignees')->count(),
        ]);
    }
}
