<?php

namespace App\Http\Controllers;

use App\Models\Reminder;
use App\Models\Task;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

/** A person's own reminders on a task. */
class ReminderController extends Controller
{
    public function index(Request $request, Task $task): JsonResponse
    {
        Gate::authorize('view', $task);

        return response()->json([
            'data' => $task->reminders()->where('user_id', $request->user()->id)->orderBy('remind_at')->get()->map(self::present(...)),
        ]);
    }

    /** Either `remind_at` (a moment) or `offset_minutes` (before the due date). */
    public function store(Request $request, Task $task): JsonResponse
    {
        Gate::authorize('view', $task);
        $data = $request->validate([
            'remind_at' => ['required_without:offset_minutes', 'nullable', 'date', 'after:now'],
            'offset_minutes' => ['required_without:remind_at', 'nullable', 'integer', 'min:0', 'max:20160'],
        ]);

        if (isset($data['offset_minutes'])) {
            if (! $task->due_at) {
                throw ValidationException::withMessages(['offset_minutes' => 'La tarea no tiene fecha límite.']);
            }
            $at = $task->due_at->copy()->subMinutes($data['offset_minutes']);
        } else {
            $at = $request->date('remind_at');
        }

        $reminder = $task->reminders()->create([
            'user_id' => $request->user()->id,
            'remind_at' => $at,
            'offset_minutes' => $data['offset_minutes'] ?? null,
            // Already in the past ("1 day before" when it's due in an hour): nothing to send.
            'sent_at' => $at->isPast() ? now() : null,
        ]);

        return response()->json(['data' => self::present($reminder)], 201);
    }

    public function destroy(Request $request, Reminder $reminder): Response
    {
        abort_unless($reminder->user_id === $request->user()->id, 403);
        $reminder->delete();

        return response()->noContent();
    }

    /**
     * @return array<string, mixed>
     */
    private static function present(Reminder $r): array
    {
        return [
            'id' => $r->id,
            'remind_at' => $r->remind_at,
            'offset_minutes' => $r->offset_minutes,
            'sent' => $r->sent_at !== null,
        ];
    }
}
