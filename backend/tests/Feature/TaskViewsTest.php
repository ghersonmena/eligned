<?php

use App\Enums\WorkspaceRole;
use App\Models\Task;
use App\Models\User;

/* ---------- Kanban: move ---------- */

it('moves a card to another column at the given place and renumbers the column', function () {
    [$user, $workspace] = memberWithWorkspace();
    [$todo, $doing] = $workspace->statuses->take(2)->values()->all();
    $a = Task::factory()->for($workspace)->create(['status_id' => $doing->id, 'board_position' => 10]);
    $b = Task::factory()->for($workspace)->create(['status_id' => $doing->id, 'board_position' => 20]);
    $card = Task::factory()->for($workspace)->create(['status_id' => $todo->id]);

    $this->actingAs($user)->postJson("/api/v1/tasks/{$card->id}/move", ['status_id' => $doing->id, 'position' => 1])
        ->assertOk()
        ->assertJsonPath('data.status_id', $doing->id)
        ->assertJsonPath('data.board_position', 1);

    $order = Task::where('status_id', $doing->id)->orderBy('board_position')->pluck('id')->all();
    expect($order)->toBe([$a->id, $card->id, $b->id])
        ->and(Task::where('status_id', $doing->id)->orderBy('board_position')->pluck('board_position')->all())->toBe([0, 1, 2]);
});

it('reorders inside the same column', function () {
    [$user, $workspace] = memberWithWorkspace();
    $status = $workspace->statuses->first();
    $tasks = collect(range(0, 2))->map(fn ($i) => Task::factory()->for($workspace)->create(['status_id' => $status->id, 'board_position' => $i]));

    $this->actingAs($user)->postJson("/api/v1/tasks/{$tasks[2]->id}/move", ['status_id' => $status->id, 'position' => 0])->assertOk();

    expect(Task::where('status_id', $status->id)->orderBy('board_position')->pluck('id')->all())
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

it('moves subtasks as cards without changing their order inside the parent', function () {
    [$user, $workspace] = memberWithWorkspace();
    $done = $workspace->statuses->firstWhere('is_done', true);
    $doing = $workspace->statuses->get(1);
    $parent = Task::factory()->for($workspace)->create();
    $first = Task::factory()->for($workspace)->create(['parent_id' => $parent->id, 'position' => 1]);
    $second = Task::factory()->for($workspace)->create(['parent_id' => $parent->id, 'position' => 2]);

    $this->actingAs($user)->postJson("/api/v1/tasks/{$second->id}/move", ['status_id' => $doing->id, 'position' => 0])
        ->assertOk()
        ->assertJsonPath('data.status_id', $doing->id)
        ->assertJsonPath('data.parent.title', $parent->title);
    expect($parent->subtasks()->pluck('id')->all())->toBe([$first->id, $second->id]);

    // The parent itself is not a card: it only moves through its subtasks.
    $this->postJson("/api/v1/tasks/{$parent->id}/move", ['status_id' => $done->id, 'position' => 0])->assertStatus(422);
    expect($parent->fresh()->isCompleted())->toBeFalse();

    // Finishing every subtask on the board completes the parent.
    $this->postJson("/api/v1/tasks/{$first->id}/move", ['status_id' => $done->id, 'position' => 0]);
    $this->postJson("/api/v1/tasks/{$second->id}/move", ['status_id' => $done->id, 'position' => 0]);
    expect($parent->fresh()->isCompleted())->toBeTrue();
});

it('rejects moving to other workspaces\' columns and guests', function () {
    [$user, $workspace] = memberWithWorkspace();
    [, $other] = memberWithWorkspace();
    $parent = Task::factory()->for($workspace)->create();
    $status = $workspace->statuses->first();

    $this->actingAs($user);
    $this->postJson("/api/v1/tasks/{$parent->id}/move", ['status_id' => $other->statuses->first()->id, 'position' => 0])
        ->assertJsonValidationErrors('status_id');

    $guest = User::factory()->create();
    $workspace->addMember($guest, WorkspaceRole::Guest);
    $this->actingAs($guest)->postJson("/api/v1/tasks/{$parent->id}/move", ['status_id' => $status->id, 'position' => 0])->assertForbidden();
});

/* ---------- Lists for the views ---------- */

it('sorts by board position and hides tasks completed before done_since', function () {
    [$user, $workspace] = memberWithWorkspace();
    $second = Task::factory()->for($workspace)->create(['board_position' => 2]);
    $first = Task::factory()->for($workspace)->create(['board_position' => 1]);
    $recent = Task::factory()->for($workspace)->completed()->create(['board_position' => 3, 'completed_at' => now()->subDay()]);
    Task::factory()->for($workspace)->completed()->create(['board_position' => 4, 'completed_at' => now()->subMonth()]);

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

it('lists subtasks next to their parents with with_subtasks', function () {
    [$user, $workspace] = memberWithWorkspace();
    $parent = Task::factory()->for($workspace)->create(['title' => 'Mudanza']);
    $sub = Task::factory()->for($workspace)->create(['parent_id' => $parent->id]);

    $url = "/api/v1/workspaces/{$workspace->id}/tasks";
    expect($this->actingAs($user)->getJson($url)->json('data.*.id'))->toBe([$parent->id]);

    $rows = collect($this->getJson("{$url}?with_subtasks=1")->assertOk()->json('data'))->keyBy('id');
    expect($rows->keys()->sort()->values()->all())->toBe([$parent->id, $sub->id])
        ->and($rows[$sub->id]['parent'])->toBe(['id' => $parent->id, 'title' => 'Mudanza'])
        ->and($rows[$parent->id]['parent'])->toBeNull();
});

/* ---------- Parent dates follow their subtasks ---------- */

it('spans a parent from its first to its last subtask date', function () {
    [$user, $workspace] = memberWithWorkspace();
    $parent = Task::factory()->for($workspace)->create(['start_at' => '2026-12-20 00:00:00', 'due_at' => '2026-12-31 23:59:00']);
    $this->actingAs($user);

    $a = $this->postJson("/api/v1/tasks/{$parent->id}/subtasks", ['title' => 'A', 'start_at' => '2026-11-10T00:00:00Z', 'due_at' => '2026-11-12T23:59:00Z'])->json('data.id');
    $this->postJson("/api/v1/tasks/{$parent->id}/subtasks", ['title' => 'B', 'due_at' => '2026-11-20T23:59:00Z']);
    $this->postJson("/api/v1/tasks/{$parent->id}/subtasks", ['title' => 'Sin fecha']);

    $parent->refresh();
    expect($parent->start_at->toDateString())->toBe('2026-11-10')
        ->and($parent->due_at->toDateString())->toBe('2026-11-20');

    // Moving a subtask moves the span.
    $this->patchJson("/api/v1/tasks/{$a}", ['start_at' => '2026-11-05T00:00:00Z'])->assertOk();
    expect($parent->fresh()->start_at->toDateString())->toBe('2026-11-05');

    // The parent's own dates can't break away from its subtasks.
    $this->patchJson("/api/v1/tasks/{$parent->id}", ['start_at' => '2026-11-01T00:00:00Z'])
        ->assertOk()
        ->assertJsonPath('data.start_at', fn ($v) => str_starts_with($v, '2026-11-05'));

    // Deleting the last subtask shrinks it back.
    $this->deleteJson("/api/v1/tasks/{$a}")->assertNoContent();
    expect($parent->fresh()->start_at->toDateString())->toBe('2026-11-20');
});

it('keeps a parent\'s own dates while none of its subtasks has dates', function () {
    [$user, $workspace] = memberWithWorkspace();
    $parent = Task::factory()->for($workspace)->create(['start_at' => '2026-12-01 00:00:00', 'due_at' => '2026-12-05 23:59:00']);

    $this->actingAs($user)->postJson("/api/v1/tasks/{$parent->id}/subtasks", ['title' => 'Paso'])->assertCreated();
    $this->patchJson("/api/v1/tasks/{$parent->id}", ['due_at' => '2026-12-09T23:59:00Z'])->assertOk();

    expect($parent->fresh()->due_at->toDateString())->toBe('2026-12-09');
});

it('completes a task with subtasks only by closing its subtasks', function () {
    [$user, $workspace] = memberWithWorkspace();
    $done = $workspace->statuses->firstWhere('is_done', true);
    $doing = $workspace->statuses->get(1);
    $parent = Task::factory()->for($workspace)->create();
    $sub = Task::factory()->for($workspace)->create(['parent_id' => $parent->id]);
    $this->actingAs($user);

    $this->patchJson("/api/v1/tasks/{$parent->id}", ['completed' => true])->assertStatus(422);
    $this->patchJson("/api/v1/tasks/{$parent->id}", ['status_id' => $done->id])->assertStatus(422);
    // Moving it between open columns or editing it is fine.
    $this->patchJson("/api/v1/tasks/{$parent->id}", ['status_id' => $doing->id, 'title' => 'Otra'])->assertOk();
    expect($parent->fresh()->isCompleted())->toBeFalse();

    $this->patchJson("/api/v1/tasks/{$sub->id}", ['completed' => true])->assertOk();
    expect($parent->fresh()->isCompleted())->toBeTrue();
    $this->patchJson("/api/v1/tasks/{$parent->id}", ['completed' => false])->assertStatus(422);
});
