<?php

namespace App\Http\Controllers;

use App\Models\Task;
use App\Models\TimeEntry;
use App\Models\Workspace;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

/**
 * Home "Actividad" card: what the signed-in person finished and logged today
 * and this week, and what is still pending. "Mine" = assigned to me, or with
 * nobody assigned (a personal task). Parents with subtasks count through them.
 * The app sends the start of the local day and week.
 */
class SummaryController extends Controller
{
    public function __invoke(Request $request, Workspace $workspace): JsonResponse
    {
        Gate::authorize('view', $workspace);
        $request->validate(['day_start' => ['required', 'date'], 'week_start' => ['required', 'date']]);
        $day = $request->date('day_start');
        $week = $request->date('week_start');
        $dayEnd = $day->copy()->addDay();
        $weekEnd = $week->copy()->addWeek();
        $userId = $request->user()->id;

        $mine = fn (): Builder => Task::query()
            ->where('workspace_id', $workspace->id)
            ->whereDoesntHave('subtasks')
            ->where(fn (Builder $q) => $q->whereHas('assignees', fn (Builder $a) => $a->whereKey($userId))
                ->orWhereDoesntHave('assignees'));

        $minutes = fn ($since) => (int) TimeEntry::where('workspace_id', $workspace->id)->where('user_id', $userId)
            ->whereNotNull('ended_at')->where('started_at', '>=', $since)->sum('minutes');

        return response()->json(['data' => [
            'done_today' => $mine()->where('completed_at', '>=', $day)->where('completed_at', '<', $dayEnd)->count(),
            'pending_today' => $mine()->whereNull('completed_at')->where('due_at', '<', $dayEnd)->count(),
            'done_week' => $mine()->where('completed_at', '>=', $week)->where('completed_at', '<', $weekEnd)->count(),
            'pending_week' => $mine()->whereNull('completed_at')->where('due_at', '<', $weekEnd)->count(),
            'overdue' => $mine()->whereNull('completed_at')->where('due_at', '<', now())->count(),
            'minutes_today' => $minutes($day),
            'minutes_week' => $minutes($week),
        ]]);
    }
}
