<?php

use App\Enums\WorkspaceRole;
use App\Models\Task;
use App\Models\TimeEntry;
use App\Models\User;

it('summarizes my day and week, counting my tasks and personal ones', function () {
    [$me, $workspace] = memberWithWorkspace();
    $other = User::factory()->create();
    $workspace->addMember($other, WorkspaceRole::Member);
    $this->travelTo(now()->startOfWeek()->addDays(2)->setTime(12, 0)); // Wednesday noon

    $task = fn (array $a, ?User $who = null) => tap(Task::factory()->for($workspace)->create($a), fn ($t) => $who && $t->assignees()->attach($who));
    $task(['completed_at' => now()->subHour()], $me);            // done today (mine)
    $task(['completed_at' => now()->subHour()]);                 // done today (personal)
    $task(['completed_at' => now()->subHour()], $other);         // someone else's: ignored
    $task(['completed_at' => now()->subDays(2)], $me);           // done this week
    $task(['due_at' => now()->subDay()], $me);                   // overdue → pending today and week
    $task(['due_at' => now()->addHours(6)], $me);                // due later today
    $task(['due_at' => now()->addDays(3)], $me);                 // this week
    $task(['due_at' => now()->addDays(10)], $me);                // later
    TimeEntry::create(['workspace_id' => $workspace->id, 'task_id' => Task::first()->id, 'user_id' => $me->id,
        'started_at' => now()->subHours(3), 'ended_at' => now()->subHours(2), 'minutes' => 45]);

    $this->actingAs($me)->getJson("/api/v1/workspaces/{$workspace->id}/summary?".http_build_query([
        'day_start' => now()->startOfDay()->toIso8601String(),
        'week_start' => now()->startOfWeek()->toIso8601String(),
    ]))->assertOk()->assertExactJson(['data' => [
        'done_today' => 2,
        'pending_today' => 2,
        'done_week' => 3,
        'pending_week' => 3,
        'overdue' => 1,
        'minutes_today' => 45,
        'minutes_week' => 45,
    ]]);
});

it('saves the home layout and rejects unknown cards', function () {
    [$me] = memberWithWorkspace();
    $layout = [['id' => 'goals', 'hidden' => false], ['id' => 'today', 'hidden' => false], ['id' => 'tracker', 'hidden' => true]];
    $this->actingAs($me)->patchJson('/api/v1/me/preferences', ['home_layout' => $layout])
        ->assertJsonPath('data.preferences.home_layout', $layout);
    $this->patchJson('/api/v1/me/preferences', ['home_layout' => [['id' => 'nope', 'hidden' => false]]])->assertJsonValidationErrors('home_layout.0.id');
    $this->patchJson('/api/v1/me/preferences', ['home_layout' => null])->assertJsonPath('data.preferences.home_layout', null);
});
