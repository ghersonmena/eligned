<?php

use App\Enums\WorkspaceRole;
use App\Models\Goal;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;

it('creates a goal with number and project-task key results and averages them', function () {
    [$user, $workspace] = memberWithWorkspace();
    $project = Project::factory()->for($workspace)->create();
    $parent = Task::factory()->for($workspace)->create(['project_id' => $project->id]);
    Task::factory()->for($workspace)->create(['parent_id' => $parent->id, 'project_id' => null, 'completed_at' => now()]);
    Task::factory()->for($workspace)->create(['parent_id' => $parent->id, 'project_id' => null]);
    Task::factory()->for($workspace)->create(['project_id' => $project->id, 'completed_at' => now()]);
    Task::factory()->for($workspace)->create(['project_id' => $project->id]);
    $this->actingAs($user);

    $goal = $this->postJson("/api/v1/workspaces/{$workspace->id}/goals", [
        'title' => 'Migrar la oficina',
        'owner_id' => $user->id,
        'start_date' => '2026-11-01',
        'due_date' => '2026-12-31',
    ])->assertCreated()->assertJsonPath('data.progress', 0)->json('data');

    $number = $this->postJson("/api/v1/goals/{$goal['id']}/key-results", [
        'title' => 'Equipos migrados', 'kind' => 'number', 'start_value' => 0, 'target_value' => 20, 'unit' => 'equipos',
    ])->assertCreated()->assertJsonPath('data.current_value', 0)->json('data');

    // Parent counted through its 2 subtasks: 2 done of 4.
    $this->postJson("/api/v1/goals/{$goal['id']}/key-results", ['title' => 'Tareas del proyecto', 'kind' => 'tasks', 'project_id' => $project->id])
        ->assertJsonPath('data.tasks', ['done' => 2, 'total' => 4])
        ->assertJsonPath('data.progress', 50);

    $this->patchJson("/api/v1/key-results/{$number['id']}", ['current_value' => 5])->assertJsonPath('data.progress', 25);

    $this->getJson("/api/v1/goals/{$goal['id']}")
        ->assertJsonPath('data.progress', 38) // (25 + 50) / 2
        ->assertJsonCount(2, 'data.key_results')
        ->assertJsonPath('data.owner.id', $user->id);
    $this->getJson("/api/v1/workspaces/{$workspace->id}/goals")->assertJsonCount(1, 'data');
});

it('tells whether a goal is on track, at risk, late or done', function () {
    [, $workspace] = memberWithWorkspace();
    $goal = Goal::create(['workspace_id' => $workspace->id, 'title' => 'X', 'start_date' => '2026-11-01', 'due_date' => '2026-11-11']);
    $kr = $goal->keyResults()->create(['title' => 'k', 'kind' => 'number', 'start_value' => 0, 'target_value' => 10, 'current_value' => 2]);

    // Half the time gone, 20% done.
    expect($goal->fresh()->health(now()->setDate(2026, 11, 6)))->toBe('at_risk');
    $kr->update(['current_value' => 5]);
    expect($goal->fresh()->health(now()->setDate(2026, 11, 6)))->toBe('on_track')
        ->and($goal->fresh()->health(now()->setDate(2026, 11, 20)))->toBe('late');
    $kr->update(['current_value' => 10]);
    expect($goal->fresh()->health(now()->setDate(2026, 11, 20)))->toBe('done');
});

it('validates key results, closes goals and keeps guests read-only', function () {
    [$user, $workspace] = memberWithWorkspace();
    $other = memberWithWorkspace()[1];
    $foreignProject = Project::factory()->for($other)->create();
    $this->actingAs($user);
    $goal = $this->postJson("/api/v1/workspaces/{$workspace->id}/goals", ['title' => 'Meta'])->json('data');

    $this->postJson("/api/v1/goals/{$goal['id']}/key-results", ['title' => 'k', 'kind' => 'tasks'])->assertJsonValidationErrors('project_id');
    $this->postJson("/api/v1/goals/{$goal['id']}/key-results", ['title' => 'k', 'kind' => 'tasks', 'project_id' => $foreignProject->id])->assertJsonValidationErrors('project_id');
    $this->postJson("/api/v1/workspaces/{$workspace->id}/goals", ['title' => 'Y', 'owner_id' => User::factory()->create()->id])->assertJsonValidationErrors('owner_id');

    $this->patchJson("/api/v1/goals/{$goal['id']}", ['closed' => true])->assertJsonPath('data.closed', true);
    $this->getJson("/api/v1/workspaces/{$workspace->id}/goals")->assertJsonCount(0, 'data');
    $this->getJson("/api/v1/workspaces/{$workspace->id}/goals?closed=1")->assertJsonCount(1, 'data');

    $guest = User::factory()->create();
    $workspace->addMember($guest, WorkspaceRole::Guest);
    $this->actingAs($guest)->getJson("/api/v1/goals/{$goal['id']}")->assertOk();
    $this->actingAs($guest)->patchJson("/api/v1/goals/{$goal['id']}", ['title' => 'no'])->assertForbidden();
    $this->actingAs(User::factory()->create())->getJson("/api/v1/goals/{$goal['id']}")->assertForbidden();
});
