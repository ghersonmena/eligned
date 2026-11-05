<?php

use App\Models\Task;
use App\Models\User;

it('runs one timer at a time and adds up the minutes', function () {
    [$user, $workspace] = memberWithWorkspace();
    $a = Task::factory()->for($workspace)->create();
    $b = Task::factory()->for($workspace)->create();
    $this->actingAs($user);

    $this->travelTo(now()->setTime(9, 0));
    $this->postJson("/api/v1/tasks/{$a->id}/timer")->assertCreated()->assertJsonPath('data.running', true);
    $this->getJson('/api/v1/timer')->assertJsonPath('data.task.title', $a->title);

    // Starting another one stops the first.
    $this->travel(25)->minutes();
    $this->postJson("/api/v1/tasks/{$b->id}/timer")->assertCreated();
    $this->getJson("/api/v1/tasks/{$a->id}/time-entries")->assertJsonPath('total_minutes', 25);

    $this->travel(10)->minutes();
    $this->postJson('/api/v1/timer/stop')->assertJsonPath('data.minutes', 10);
    $this->getJson('/api/v1/timer?since='.urlencode(now()->startOfDay()->toIso8601String()))
        ->assertJsonPath('data', null)
        ->assertJsonPath('today_minutes', 35);

    $this->getJson("/api/v1/tasks/{$a->id}")->assertJsonPath('data.tracked_minutes', 25);
    expect($a->activities()->where('event', 'time_logged')->value('changes'))->toBe(['minutes' => 25]);
});

it('stops the timer when the task is finished', function () {
    [$user, $workspace] = memberWithWorkspace();
    $task = Task::factory()->for($workspace)->create();
    $this->actingAs($user)->postJson("/api/v1/tasks/{$task->id}/timer");

    $this->travel(40)->minutes();
    $this->patchJson("/api/v1/tasks/{$task->id}", ['completed' => true])->assertOk();

    $this->getJson('/api/v1/timer')->assertJsonPath('data', null);
    $this->getJson("/api/v1/tasks/{$task->id}/time-entries")->assertJsonPath('total_minutes', 40);
    $this->postJson("/api/v1/tasks/{$task->id}/timer")->assertStatus(422);
});

it('adds time by hand and only lets its author delete it', function () {
    [$user, $workspace] = memberWithWorkspace();
    $task = Task::factory()->for($workspace)->create();
    $this->actingAs($user);

    $id = $this->postJson("/api/v1/tasks/{$task->id}/time-entries", [
        'started_at' => now()->subDay()->toIso8601String(), 'minutes' => 90, 'note' => 'Revisión con el proveedor',
    ])->assertCreated()->json('data.id');
    $this->postJson("/api/v1/tasks/{$task->id}/time-entries", ['started_at' => now()->addDay()->toIso8601String(), 'minutes' => 5])
        ->assertJsonValidationErrors('started_at');

    $this->actingAs(User::factory()->create())->deleteJson("/api/v1/time-entries/{$id}")->assertForbidden();
    $this->actingAs($user)->deleteJson("/api/v1/time-entries/{$id}")->assertNoContent();
});
