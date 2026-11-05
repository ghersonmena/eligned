<?php

namespace App\Http\Controllers;

use App\Http\Resources\TimeEntryResource;
use App\Models\Activity;
use App\Models\Task;
use App\Models\TimeEntry;
use App\Support\LiveUpdates;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

/** Time tracking: running timers (several at once are allowed), plus entries added by hand. */
class TimeEntryController extends Controller
{
    /**
     * The signed-in user's running timers (oldest first) and the minutes they
     * logged since `since` (the start of their local day, sent by the app).
     */
    public function current(Request $request): JsonResponse
    {
        $request->validate(['since' => ['sometimes', 'date']]);
        $userId = $request->user()->id;
        $entries = TimeEntry::running()->where('user_id', $userId)->with('task.project')->oldest('started_at')->get();
        $since = $request->date('since') ?? now()->startOfDay();

        return response()->json([
            'data' => TimeEntryResource::collection($entries),
            'today_minutes' => (int) TimeEntry::where('user_id', $userId)->whereNotNull('ended_at')->where('started_at', '>=', $since)->sum('minutes'),
        ]);
    }

    /**
     * Starts a timer on a task. Timers on other tasks keep running; starting
     * one that is already running returns it unchanged.
     */
    public function start(Request $request, Task $task): TimeEntryResource
    {
        Gate::authorize('update', $task);
        abort_if($task->isCompleted(), 422, 'La tarea ya está terminada.');

        $entry = DB::transaction(function () use ($request, $task) {
            $running = TimeEntry::running()->where('user_id', $request->user()->id)
                ->where('task_id', $task->id)->lockForUpdate()->first();

            return $running ?? TimeEntry::create([
                'workspace_id' => $task->workspace_id,
                'task_id' => $task->id,
                'user_id' => $request->user()->id,
                'started_at' => now(),
            ]);
        });

        app(LiveUpdates::class)->touch($task->workspace_id, $task->id);

        return new TimeEntryResource($entry->load('task.project'));
    }

    /** Stops the timer of one task (`task_id`), or every running timer when it is left out. */
    public function stop(Request $request): JsonResponse
    {
        $request->validate(['task_id' => ['sometimes', 'integer']]);
        $entries = TimeEntry::running()->where('user_id', $request->user()->id)
            ->when($request->filled('task_id'), fn ($q) => $q->where('task_id', $request->integer('task_id')))
            ->get();
        $entries->each->stop();

        return response()->json(['data' => TimeEntryResource::collection($entries->load('task.project'))]);
    }

    /** Entries of a task (newest first) and the total. */
    public function index(Task $task): JsonResponse
    {
        Gate::authorize('view', $task);

        $entries = $task->timeEntries()->with('user:id,name')->latest('started_at')->limit(200)->get();

        return response()->json([
            'data' => TimeEntryResource::collection($entries),
            'total_minutes' => (int) $task->timeEntries()->whereNotNull('ended_at')->sum('minutes'),
        ]);
    }

    /** Time worked without the timer ("1 h 30 min yesterday"). */
    public function store(Request $request, Task $task): TimeEntryResource
    {
        Gate::authorize('update', $task);
        $data = $request->validate([
            'started_at' => ['required', 'date', 'before_or_equal:now'],
            'minutes' => ['required', 'integer', 'min:1', 'max:1440'],
            'note' => ['nullable', 'string', 'max:255'],
        ]);

        $started = $request->date('started_at');
        $entry = TimeEntry::create([
            'workspace_id' => $task->workspace_id,
            'task_id' => $task->id,
            'user_id' => $request->user()->id,
            'started_at' => $started,
            'ended_at' => $started->copy()->addMinutes($data['minutes']),
            'minutes' => $data['minutes'],
            'note' => $data['note'] ?? null,
        ]);
        Activity::record($task, 'time_logged', ['minutes' => $entry->minutes]);

        return new TimeEntryResource($entry->load('user:id,name'));
    }

    public function destroy(Request $request, TimeEntry $timeEntry): Response
    {
        abort_unless($timeEntry->user_id === $request->user()->id, 403);
        $timeEntry->delete();

        return response()->noContent();
    }
}
