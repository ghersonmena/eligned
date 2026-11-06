<?php

use App\Enums\WorkspaceRole;
use App\Models\Task;
use App\Models\TimeEntry;
use App\Models\User;

it('sums each person\'s open, overdue, this week, finished and logged time', function () {
    [$owner, $workspace] = memberWithWorkspace();
    $ana = User::factory()->create(['name' => 'Ana']);
    $workspace->addMember($ana, WorkspaceRole::Member);
    $this->travelTo(now()->setTime(12, 0));

    $make = function (array $attrs, ?User $who) use ($workspace) {
        $task = Task::factory()->for($workspace)->create($attrs);
        if ($who) {
            $task->assignees()->attach($who);
        }

        return $task;
    };
    $make(['due_at' => now()->subDay()], $ana);                 // overdue
    $make(['due_at' => now()->addDays(2)], $ana);               // this week
    $make(['due_at' => null], $ana);                            // later / no date
    $make(['due_at' => now()->addDay(), 'completed_at' => now()->subHour()], $ana); // done
    $make(['due_at' => now()->addDay()], null);                 // nobody
    // A parent with subtasks counts through its subtasks only.
    $parent = $make([], $ana);
    $make(['parent_id' => $parent->id, 'due_at' => now()->addDays(3)], $ana);

    TimeEntry::create(['workspace_id' => $workspace->id, 'task_id' => $parent->id, 'user_id' => $ana->id,
        'started_at' => now()->subHours(2), 'ended_at' => now()->subHour(), 'minutes' => 60]);

    $since = now()->startOfWeek()->toIso8601String();
    $response = $this->actingAs($owner)->getJson("/api/v1/workspaces/{$workspace->id}/workload?since=".urlencode($since))->assertOk();

    // People come sorted by name and the owner's is random: find Ana's row.
    $row = collect($response->json('data'))->firstWhere('user.id', $ana->id);
    expect($row)->toMatchArray([
        'user' => ['id' => $ana->id, 'name' => 'Ana'],
        'open' => 4,
        'overdue' => 1,
        'this_week' => 2,
        'done_since' => 1,
        'minutes_since' => 60,
    ]);
    expect($response->json('unassigned'))->toBe(1);

    $this->actingAs(User::factory()->create())->getJson("/api/v1/workspaces/{$workspace->id}/workload")->assertForbidden();
});
