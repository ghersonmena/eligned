<?php

use App\Models\Project;
use App\Models\Task;
use App\Models\User;

it('creates a project', function () {
    [$user, $workspace] = memberWithWorkspace();

    $this->actingAs($user)->postJson("/api/v1/workspaces/{$workspace->id}/projects", [
        'name' => 'Migración Windows 11',
        'color' => 'teal',
    ])->assertCreated()->assertJsonPath('data.name', 'Migración Windows 11')->assertJsonPath('data.color', 'teal');
});

it('rejects an unknown color', function () {
    [$user, $workspace] = memberWithWorkspace();

    $this->actingAs($user)->postJson("/api/v1/workspaces/{$workspace->id}/projects", [
        'name' => 'X',
        'color' => 'neon',
    ])->assertUnprocessable()->assertJsonValidationErrors('color');
});

it('lists active projects with open and done task counts', function () {
    [$user, $workspace] = memberWithWorkspace();
    $project = Project::factory()->for($workspace)->create();
    Project::factory()->for($workspace)->create(['archived_at' => now()]);
    Task::factory()->for($workspace)->count(2)->create(['project_id' => $project->id]);
    Task::factory()->for($workspace)->completed()->create(['project_id' => $project->id]);

    $this->actingAs($user)->getJson("/api/v1/workspaces/{$workspace->id}/projects")
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.open_tasks_count', 2)
        ->assertJsonPath('data.0.done_tasks_count', 1);
});

it('archives and restores a project', function () {
    [$user, $workspace] = memberWithWorkspace();
    $project = Project::factory()->for($workspace)->create();

    $this->actingAs($user)->patchJson("/api/v1/projects/{$project->id}", ['archived' => true])
        ->assertOk()->assertJsonPath('data.archived', true);
    $this->patchJson("/api/v1/projects/{$project->id}", ['archived' => false])
        ->assertOk()->assertJsonPath('data.archived', false);
});

it('keeps the tasks when a project is deleted', function () {
    [$user, $workspace] = memberWithWorkspace();
    $project = Project::factory()->for($workspace)->create();
    $task = Task::factory()->for($workspace)->create(['project_id' => $project->id]);

    $this->actingAs($user)->deleteJson("/api/v1/projects/{$project->id}")->assertNoContent();

    expect($task->fresh()->project_id)->toBeNull();
});

it('hides projects from people outside the workspace', function () {
    [, $workspace] = memberWithWorkspace();
    $project = Project::factory()->for($workspace)->create();

    $this->actingAs(User::factory()->create());
    $this->getJson("/api/v1/workspaces/{$workspace->id}/projects")->assertForbidden();
    $this->patchJson("/api/v1/projects/{$project->id}", ['name' => 'x'])->assertForbidden();
});
