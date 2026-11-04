<?php

use App\Enums\WorkspaceRole;
use App\Models\Task;
use App\Models\User;

/* ---------- Kanban: move ---------- */

it('moves a card to another column at the given place and renumbers the column', function () {
    [$user, $workspace] = memberWithWorkspace();
    [$todo, $doing] = $workspace->statuses->take(2)->values()->all();
    $a = Task::factory()->for($workspace)->create(['status_id' => $doing->id, 'position' => 10]);
    $b = Task::factory()->for($workspace)->create(['status_id' => $doing->id, 'position' => 20]);
    $card = Task::factory()->for($workspace)->create(['status_id' => $todo->id]);

    $this->actingAs($user)->postJson("/api/v1/tasks/{$card->id}/move", ['status_id' => $doing->id, 'position' => 1])
        ->assertOk()
        ->assertJsonPath('data.status_id', $doing->id)
        ->assertJsonPath('data.position', 1);

    $order = Task::where('status_id', $doing->id)->orderBy('position')->pluck('id')->all();
    expect($order)->toBe([$a->id, $card->id, $b->id])
        ->and(Task::where('status_id', $doing->id)->orderBy('position')->pluck('position')->all())->toBe([0, 1, 2]);
});

it('reorders inside the same column', function () {
    [$user, $workspace] = memberWithWorkspace();
    $status = $workspace->statuses->first();
    $tasks = collect(range(0, 2))->map(fn ($i) => Task::factory()->for($workspace)->create(['status_id' => $status->id, 'position' => $i]));

    $this->actingAs($user)->postJson("/api/v1/tasks/{$tasks[2]->id}/move", ['status_id' => $status->id, 'position' => 0])->assertOk();

    expect(Task::where('status_id', $status->id)->orderBy('position')->pluck('id')->all())
        ->toBe([$tasks[2]->id, $tasks[0]->id, $tasks[1]->id]);
});

it('completes a task dropped in the done column and reopens it when taken out', function () {
    [$user, $workspace] = memberWithWorkspace();
    $done = $workspace->statuses->firstWhere('is_done', true);
    $todo = $workspace->statuses->first();
    $task = Task::factory()->for($workspace)->create();

    $this->actingAs($user)->postJson("/api/v1/tasks/{$task->id}/move", ['status_id' => $done->id, 'position' => 0])
        ->assertJsonPath('data.completed', true);
    $this->postJson("/api/v1/tasks/{$task->id}/move", ['status_id' => $todo->id, 'position' => 0])
        ->assertJsonPath('data.completed', false);
});

it('rejects moving subtasks, other workspaces\' columns and guests', function () {
    [$user, $workspace] = memberWithWorkspace();
    [, $other] = memberWithWorkspace();
    $parent = Task::factory()->for($workspace)->create();
    $sub = Task::factory()->for($workspace)->create(['parent_id' => $parent->id]);
    $status = $workspace->statuses->first();

    $this->actingAs($user)->postJson("/api/v1/tasks/{$sub->id}/move", ['status_id' => $status->id, 'position' => 0])->assertStatus(422);
    $this->postJson("/api/v1/tasks/{$parent->id}/move", ['status_id' => $other->statuses->first()->id, 'position' => 0])
        ->assertJsonValidationErrors('status_id');

    $guest = User::factory()->create();
    $workspace->addMember($guest, WorkspaceRole::Guest);
    $this->actingAs($guest)->postJson("/api/v1/tasks/{$parent->id}/move", ['status_id' => $status->id, 'position' => 0])->assertForbidden();
});

/* ---------- Lists for the views ---------- */

it('sorts by board position and hides tasks completed before done_since', function () {
    [$user, $workspace] = memberWithWorkspace();
    $second = Task::factory()->for($workspace)->create(['position' => 2]);
    $first = Task::factory()->for($workspace)->create(['position' => 1]);
    $recent = Task::factory()->for($workspace)->completed()->create(['position' => 3, 'completed_at' => now()->subDay()]);
    Task::factory()->for($workspace)->completed()->create(['position' => 4, 'completed_at' => now()->subMonth()]);

    $since = now()->subWeek()->toIso8601String();
    $ids = $this->actingAs($user)
        ->getJson("/api/v1/workspaces/{$workspace->id}/tasks?status=all&sort=position&done_since=".urlencode($since))
        ->assertOk()
        ->json('data.*.id');

    expect($ids)->toBe([$first->id, $second->id, $recent->id]);
});

it('returns tasks whose start..due span touches a date range', function () {
    [$user, $workspace] = memberWithWorkspace();
    $dueInside = Task::factory()->for($workspace)->create(['start_at' => null, 'due_at' => '2026-11-10 12:00:00']);
    $spanning = Task::factory()->for($workspace)->create(['start_at' => '2026-10-20', 'due_at' => '2026-12-05']);
    $startOnly = Task::factory()->for($workspace)->create(['start_at' => '2026-11-02', 'due_at' => null]);
    Task::factory()->for($workspace)->create(['start_at' => null, 'due_at' => '2026-10-01']);
    Task::factory()->for($workspace)->create(['start_at' => null, 'due_at' => null]);

    $ids = $this->actingAs($user)
        ->getJson("/api/v1/workspaces/{$workspace->id}/tasks?status=all&from=2026-11-01&to=2026-11-30T23:59:59")
        ->assertOk()
        ->json('data.*.id');

    expect($ids)->toEqualCanonicalizing([$dueInside->id, $spanning->id, $startOnly->id]);
});

it('validates the list filters', function () {
    [$user, $workspace] = memberWithWorkspace();

    $this->actingAs($user)->getJson("/api/v1/workspaces/{$workspace->id}/tasks?from=2026-11-10&to=2026-11-01")
        ->assertJsonValidationErrors('to');
    $this->getJson("/api/v1/workspaces/{$workspace->id}/tasks?sort=nope")->assertJsonValidationErrors('sort');
});

/* ---------- Start date ---------- */

it('does not let a task start after it is due, also on partial updates', function () {
    [$user, $workspace] = memberWithWorkspace();
    $this->actingAs($user);

    $this->postJson("/api/v1/workspaces/{$workspace->id}/tasks", [
        'title' => 'x', 'start_at' => '2026-11-10', 'due_at' => '2026-11-05',
    ])->assertJsonValidationErrors('start_at');

    $task = Task::factory()->for($workspace)->create(['start_at' => '2026-11-01', 'due_at' => '2026-11-05']);
    $this->patchJson("/api/v1/tasks/{$task->id}", ['start_at' => '2026-11-09'])->assertJsonValidationErrors('start_at');
    $this->patchJson("/api/v1/tasks/{$task->id}", ['start_at' => '2026-11-03'])->assertOk();
    $this->patchJson("/api/v1/tasks/{$task->id}", ['start_at' => '2026-11-08', 'due_at' => '2026-11-12'])->assertOk();
});
