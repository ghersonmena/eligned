<?php

use App\Models\Task;
use App\Models\User;

it('runs several timers at once and adds up the minutes', function () {
    [$user, $workspace] = memberWithWorkspace();
    $a = Task::factory()->for($workspace)->create();
    $b = Task::factory()->for($workspace)->create();
    $this->actingAs($user);

    $this->travelTo(now()->setTime(9, 0));
    $this->postJson("/api/v1/tasks/{$a->id}/timer")->assertCreated()->assertJsonPath('data.running', true);
    $this->getJson('/api/v1/timer')->assertJsonCount(1, 'data')->assertJsonPath('data.0.task.title', $a->title);

    // Starting another one keeps the first running.
    $this->travel(25)->minutes();
    $this->postJson("/api/v1/tasks/{$b->id}/timer")->assertCreated();
    // Starting the same one again does not open a second entry.
    $this->postJson("/api/v1/tasks/{$a->id}/timer")->assertOk();
    $this->getJson('/api/v1/timer')->assertJsonCount(2, 'data')
        ->assertJsonPath('data.0.task_id', $a->id)
        ->assertJsonPath('data.1.task_id', $b->id);

    // Stops only b.
    $this->travel(10)->minutes();
    $this->postJson('/api/v1/timer/stop', ['task_id' => $b->id])
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.minutes', 10);
    $this->getJson('/api/v1/timer')->assertJsonCount(1, 'data')->assertJsonPath('data.0.task_id', $a->id);

    // Without task_id it stops everything.
    $this->postJson('/api/v1/timer/stop')->assertJsonPath('data.0.minutes', 35);
    $this->getJson('/api/v1/timer?since='.urlencode(now()->startOfDay()->toIso8601String()))
        ->assertJsonCount(0, 'data')
        ->assertJsonPath('today_minutes', 45);

    $this->getJson("/api/v1/tasks/{$a->id}")->assertJsonPath('data.tracked_minutes', 35);
    expect($a->activities()->where('event', 'time_logged')->value('changes'))->toBe(['minutes' => 35]);
});

it('stops the timer when the task is finished', function () {
    [$user, $workspace] = memberWithWorkspace();
    $task = Task::factory()->for($workspace)->create();
    $this->actingAs($user)->postJson("/api/v1/tasks/{$task->id}/timer");

    $this->travel(40)->minutes();
    $this->patchJson("/api/v1/tasks/{$task->id}", ['completed' => true])->assertOk();

    $this->getJson('/api/v1/timer')->assertJsonCount(0, 'data');
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
