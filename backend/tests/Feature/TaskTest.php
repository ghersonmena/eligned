<?php

use App\Enums\WorkspaceRole;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;

it('creates a task in the first open column at the end of the list', function () {
    [$user, $workspace] = memberWithWorkspace();
    Task::factory()->for($workspace)->create(['position' => 4]);

    $response = $this->actingAs($user)->postJson("/api/v1/workspaces/{$workspace->id}/tasks", [
        'title' => 'Revisar impresora',
        'priority' => 1,
        'due_at' => '2026-11-02 10:00:00',
    ])->assertCreated();

    $response->assertJsonPath('data.title', 'Revisar impresora')
        ->assertJsonPath('data.priority', 1)
        ->assertJsonPath('data.completed', false)
        ->assertJsonPath('data.status_id', $workspace->statuses->first()->id)
        ->assertJsonPath('data.position', 5);
});

it('lists open top-level tasks by due date, with overdue ones first and no date last', function () {
    [$user, $workspace] = memberWithWorkspace();
    $later = Task::factory()->for($workspace)->create(['due_at' => now()->addDays(3)]);
    $noDate = Task::factory()->for($workspace)->create(['due_at' => null]);
    $overdue = Task::factory()->for($workspace)->create(['due_at' => now()->subDay()]);
    Task::factory()->for($workspace)->completed()->create();
    Task::factory()->for($workspace)->create(['parent_id' => $later->id]);

    $ids = $this->actingAs($user)->getJson("/api/v1/workspaces/{$workspace->id}/tasks")
        ->assertOk()
        ->json('data.*.id');

    expect($ids)->toBe([$overdue->id, $later->id, $noDate->id]);
});

it('filters by project, completion and assignee', function () {
    [$user, $workspace] = memberWithWorkspace();
    $project = Project::factory()->for($workspace)->create();
    $inProject = Task::factory()->for($workspace)->create(['project_id' => $project->id]);
    $mine = Task::factory()->for($workspace)->create();
    $mine->assignees()->attach($user);
    $done = Task::factory()->for($workspace)->completed()->create();

    $base = "/api/v1/workspaces/{$workspace->id}/tasks";
    $this->actingAs($user);

    expect($this->getJson("$base?project_id={$project->id}")->json('data.*.id'))->toBe([$inProject->id])
        ->and($this->getJson("$base?assignee=me")->json('data.*.id'))->toBe([$mine->id])
        ->and($this->getJson("$base?status=completed")->json('data.*.id'))->toBe([$done->id])
        ->and($this->getJson("$base?status=all")->json('data'))->toHaveCount(3);
});

it('completes a task, moving it to the done column, and reopens it', function () {
    [$user, $workspace] = memberWithWorkspace();
    $task = Task::factory()->for($workspace)->create();
    $done = $workspace->statuses->firstWhere('is_done', true);
    $open = $workspace->statuses->firstWhere('is_done', false);

    $this->actingAs($user)->patchJson("/api/v1/tasks/{$task->id}", ['completed' => true])
        ->assertOk()
        ->assertJsonPath('data.completed', true)
        ->assertJsonPath('data.status_id', $done->id);

    $this->patchJson("/api/v1/tasks/{$task->id}", ['completed' => false])
        ->assertOk()
        ->assertJsonPath('data.completed', false)
        ->assertJsonPath('data.status_id', $open->id);
});

it('marks a task completed when it is moved to the done column', function () {
    [$user, $workspace] = memberWithWorkspace();
    $task = Task::factory()->for($workspace)->create();

    $this->actingAs($user)->patchJson("/api/v1/tasks/{$task->id}", [
        'status_id' => $workspace->statuses->firstWhere('is_done', true)->id,
    ])->assertOk()->assertJsonPath('data.completed', true);
});

it('updates fields and assignees', function () {
    [$user, $workspace] = memberWithWorkspace();
    $teammate = User::factory()->create();
    $workspace->addMember($teammate, WorkspaceRole::Member);
    $project = Project::factory()->for($workspace)->create();
    $task = Task::factory()->for($workspace)->create();

    $this->actingAs($user)->patchJson("/api/v1/tasks/{$task->id}", [
        'title' => 'Nuevo título',
        'description' => 'Detalles',
        'project_id' => $project->id,
        'assignee_ids' => [$user->id, $teammate->id],
    ])->assertOk()
        ->assertJsonPath('data.title', 'Nuevo título')
        ->assertJsonPath('data.project.id', $project->id)
        ->assertJsonCount(2, 'data.assignees');
});

it('rejects ids from another workspace', function () {
    [$user, $workspace] = memberWithWorkspace();
    $foreignProject = Project::factory()->create();
    $stranger = User::factory()->create();
    $task = Task::factory()->for($workspace)->create();

    $this->actingAs($user)->patchJson("/api/v1/tasks/{$task->id}", [
        'project_id' => $foreignProject->id,
        'assignee_ids' => [$stranger->id],
    ])->assertUnprocessable()->assertJsonValidationErrors(['project_id', 'assignee_ids.0']);
});

it('adds subtasks that inherit the project and counts them on the parent', function () {
    [$user, $workspace] = memberWithWorkspace();
    $project = Project::factory()->for($workspace)->create();
    $task = Task::factory()->for($workspace)->create(['project_id' => $project->id]);

    $this->actingAs($user)->postJson("/api/v1/tasks/{$task->id}/subtasks", ['title' => 'Paso 1'])
        ->assertCreated()
        ->assertJsonPath('data.parent_id', $task->id)
        ->assertJsonPath('data.project_id', $project->id);
    $second = $this->postJson("/api/v1/tasks/{$task->id}/subtasks", ['title' => 'Paso 2'])->json('data.id');
    $this->patchJson("/api/v1/tasks/{$second}", ['completed' => true])->assertOk();

    $this->getJson("/api/v1/tasks/{$task->id}")
        ->assertOk()
        ->assertJsonCount(2, 'data.subtasks')
        ->assertJsonPath('data.subtasks_count', 2)
        ->assertJsonPath('data.subtasks_done_count', 1);
});

it('does not allow subtasks of subtasks', function () {
    [$user, $workspace] = memberWithWorkspace();
    $parent = Task::factory()->for($workspace)->create();
    $child = Task::factory()->for($workspace)->create(['parent_id' => $parent->id]);

    $this->actingAs($user)->postJson("/api/v1/tasks/{$child->id}/subtasks", ['title' => 'Nieto'])
        ->assertUnprocessable();
});

it('deletes a task with its subtasks', function () {
    [$user, $workspace] = memberWithWorkspace();
    $task = Task::factory()->for($workspace)->create();
    Task::factory()->for($workspace)->create(['parent_id' => $task->id]);

    $this->actingAs($user)->deleteJson("/api/v1/tasks/{$task->id}")->assertNoContent();

    expect(Task::count())->toBe(0);
});

it('hides tasks from people outside the workspace', function () {
    [, $workspace] = memberWithWorkspace();
    $task = Task::factory()->for($workspace)->create();
    $outsider = User::factory()->create();

    $this->actingAs($outsider);
    $this->getJson("/api/v1/workspaces/{$workspace->id}/tasks")->assertForbidden();
    $this->getJson("/api/v1/tasks/{$task->id}")->assertForbidden();
    $this->patchJson("/api/v1/tasks/{$task->id}", ['title' => 'x'])->assertForbidden();
});

it('lets guests read but not change tasks', function () {
    [, $workspace] = memberWithWorkspace();
    $guest = User::factory()->create();
    $workspace->addMember($guest, WorkspaceRole::Guest);
    $task = Task::factory()->for($workspace)->create();

    $this->actingAs($guest);
    $this->getJson("/api/v1/tasks/{$task->id}")->assertOk();
    $this->postJson("/api/v1/workspaces/{$workspace->id}/tasks", ['title' => 'x'])->assertForbidden();
    $this->patchJson("/api/v1/tasks/{$task->id}", ['completed' => true])->assertForbidden();
});

it('completes the parent automatically when every subtask is done', function () {
    [$user, $workspace] = memberWithWorkspace();
    $parent = Task::factory()->for($workspace)->create();
    $first = Task::factory()->for($workspace)->create(['parent_id' => $parent->id]);
    $second = Task::factory()->for($workspace)->create(['parent_id' => $parent->id]);

    $this->actingAs($user)->patchJson("/api/v1/tasks/{$first->id}", ['completed' => true])->assertOk();
    expect($parent->fresh()->isCompleted())->toBeFalse();

    $this->patchJson("/api/v1/tasks/{$second->id}", ['completed' => true])->assertOk();
    expect($parent->fresh()->isCompleted())->toBeTrue()
        ->and($parent->fresh()->status->is_done)->toBeTrue();
});

it('reopens the parent when a subtask is reopened or a new one is added', function () {
    [$user, $workspace] = memberWithWorkspace();
    $parent = Task::factory()->for($workspace)->completed()->create();
    $subtask = Task::factory()->for($workspace)->completed()->create(['parent_id' => $parent->id]);

    $this->actingAs($user)->patchJson("/api/v1/tasks/{$subtask->id}", ['completed' => false])->assertOk();
    expect($parent->fresh()->isCompleted())->toBeFalse();

    $this->patchJson("/api/v1/tasks/{$subtask->id}", ['completed' => true])->assertOk();
    expect($parent->fresh()->isCompleted())->toBeTrue();

    $this->postJson("/api/v1/tasks/{$parent->id}/subtasks", ['title' => 'Un paso más'])->assertCreated();
    expect($parent->fresh()->isCompleted())->toBeFalse();
});

it('completes the parent when its last open subtask is deleted', function () {
    [$user, $workspace] = memberWithWorkspace();
    $parent = Task::factory()->for($workspace)->create();
    Task::factory()->for($workspace)->completed()->create(['parent_id' => $parent->id]);
    $open = Task::factory()->for($workspace)->create(['parent_id' => $parent->id]);

    $this->actingAs($user)->deleteJson("/api/v1/tasks/{$open->id}")->assertNoContent();

    expect($parent->fresh()->isCompleted())->toBeTrue();
});

it('includes subtasks in the task list so they can be expanded', function () {
    [$user, $workspace] = memberWithWorkspace();
    $parent = Task::factory()->for($workspace)->create();
    Task::factory()->for($workspace)->create(['parent_id' => $parent->id, 'title' => 'Paso 1']);

    $this->actingAs($user)->getJson("/api/v1/workspaces/{$workspace->id}/tasks")
        ->assertOk()
        ->assertJsonPath('data.0.subtasks.0.title', 'Paso 1');
});
