<?php

use App\Models\Task;
use App\Models\User;

it('keeps the history of a task with who did what', function () {
    [$user, $workspace] = memberWithWorkspace();
    $this->actingAs($user);
    $doing = $workspace->statuses->get(1);

    $id = $this->postJson("/api/v1/workspaces/{$workspace->id}/tasks", ['title' => 'Informe'])->json('data.id');
    $this->patchJson("/api/v1/tasks/{$id}", ['title' => 'Informe mensual', 'status_id' => $doing->id, 'due_at' => '2026-11-20T23:59:00Z'])->assertOk();
    $this->patchJson("/api/v1/tasks/{$id}", ['completed' => true])->assertOk();
    $this->postJson("/api/v1/tasks/{$id}/comments", ['body' => 'Listo, enviado'])->assertCreated();

    $rows = $this->getJson("/api/v1/tasks/{$id}/activity")->assertOk()->json('data');

    expect(array_column($rows, 'event'))->toBe(['commented', 'updated', 'updated', 'created'])
        ->and($rows[0]['changes']['excerpt'])->toBe('Listo, enviado')
        ->and($rows[1]['changes']['status_id'])->toBe([$doing->name, 'Hecho'])
        ->and($rows[1]['changes']['completed_at'][0])->toBeNull()
        ->and($rows[2]['changes']['title'])->toBe(['Informe', 'Informe mensual'])
        ->and($rows[2]['changes']['status_id'])->toBe(['Por hacer', $doing->name])
        ->and($rows[3]['user']['name'])->toBe($user->name);
});

it('notes when a parent was completed by its subtasks and who changed assignees', function () {
    [$user, $workspace] = memberWithWorkspace();
    $this->actingAs($user);
    $parent = Task::factory()->for($workspace)->create();

    $sub = $this->postJson("/api/v1/tasks/{$parent->id}/subtasks", ['title' => 'Paso 1'])->json('data.id');
    $this->patchJson("/api/v1/tasks/{$sub}", ['completed' => true]);
    $this->patchJson("/api/v1/tasks/{$parent->id}", ['assignee_ids' => [$user->id]]);

    $rows = collect($this->getJson("/api/v1/tasks/{$parent->id}/activity")->json('data'));
    expect($rows->pluck('event')->all())->toBe(['assigned', 'updated', 'subtask_added', 'created'])
        ->and($rows[0]['changes'])->toBe(['added' => [$user->name], 'removed' => []])
        ->and($rows[1]['changes']['reason'])->toBe('subtasks')
        ->and($rows[2]['changes']['subtask'])->toBe('Paso 1');
});

it('hides the history from people outside the workspace', function () {
    [, $workspace] = memberWithWorkspace();
    $task = Task::factory()->for($workspace)->create();

    $this->actingAs(User::factory()->create())->getJson("/api/v1/tasks/{$task->id}/activity")->assertForbidden();
});
