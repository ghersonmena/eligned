<?php

use App\Enums\WorkspaceRole;
use App\Models\Task;
use App\Models\User;

it('adds a comment and shows it in the task detail', function () {
    [$user, $workspace] = memberWithWorkspace();
    $task = Task::factory()->for($workspace)->create();

    $this->actingAs($user)->postJson("/api/v1/tasks/{$task->id}/comments", ['body' => 'Ya respaldé los perfiles'])
        ->assertCreated()
        ->assertJsonPath('data.author.id', $user->id)
        ->assertJsonPath('data.can_delete', true);

    $this->getJson("/api/v1/tasks/{$task->id}")
        ->assertJsonPath('data.comments.0.body', 'Ya respaldé los perfiles')
        ->assertJsonPath('data.comments_count', 1);
});

it('lets authors and admins delete comments, but not other members', function () {
    [$owner, $workspace] = memberWithWorkspace();
    $author = User::factory()->create();
    $other = User::factory()->create();
    $workspace->addMember($author, WorkspaceRole::Member);
    $workspace->addMember($other, WorkspaceRole::Member);
    $task = Task::factory()->for($workspace)->create();

    $first = $this->actingAs($author)->postJson("/api/v1/tasks/{$task->id}/comments", ['body' => 'uno'])->json('data.id');
    $second = $this->postJson("/api/v1/tasks/{$task->id}/comments", ['body' => 'dos'])->json('data.id');

    $this->actingAs($other)->deleteJson("/api/v1/comments/{$first}")->assertForbidden();
    $this->actingAs($author)->deleteJson("/api/v1/comments/{$first}")->assertNoContent();
    $this->actingAs($owner)->deleteJson("/api/v1/comments/{$second}")->assertNoContent();
});

it('does not let guests comment', function () {
    [, $workspace] = memberWithWorkspace();
    $guest = User::factory()->create();
    $workspace->addMember($guest, WorkspaceRole::Guest);
    $task = Task::factory()->for($workspace)->create();

    $this->actingAs($guest)->postJson("/api/v1/tasks/{$task->id}/comments", ['body' => 'hola'])->assertForbidden();
});
