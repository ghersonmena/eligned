<?php

use App\Enums\WorkspaceRole;
use App\Models\CommentAttachment;
use App\Models\Task;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

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

it('attaches files to a comment and serves them only to the workspace', function () {
    Storage::fake('local');
    [$user, $workspace] = memberWithWorkspace();
    $task = Task::factory()->for($workspace)->create();

    $response = $this->actingAs($user)->post("/api/v1/tasks/{$task->id}/comments", [
        'body' => '',
        'attachments' => [
            UploadedFile::fake()->createWithContent('foto.png', base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=')),
            UploadedFile::fake()->create('reporte.pdf', 120, 'application/pdf'),
        ],
    ], ['Accept' => 'application/json']);

    $response->assertCreated()
        ->assertJsonCount(2, 'data.attachments')
        ->assertJsonPath('data.attachments.0.name', 'foto.png')
        ->assertJsonPath('data.attachments.0.is_image', true)
        ->assertJsonPath('data.attachments.1.is_image', false);
    expect($task->activities()->where('event', 'commented')->value('changes'))->toBe(['excerpt' => '📎 2 archivos']);

    $image = $response->json('data.attachments.0');
    $pdf = $response->json('data.attachments.1');
    $this->get($image['url'])->assertOk()->assertHeader('Content-Type', 'image/png');
    expect($this->get($pdf['url'])->headers->get('Content-Disposition'))->toStartWith('attachment');
    $this->getJson("/api/v1/tasks/{$task->id}")->assertJsonCount(2, 'data.comments.0.attachments');

    $stranger = User::factory()->create();
    $this->actingAs($stranger)->get($image['url'])->assertForbidden();

    // Deleting the comment removes its files.
    $path = CommentAttachment::find($image['id'])->path;
    Storage::disk('local')->assertExists($path);
    $this->actingAs($user)->deleteJson('/api/v1/comments/'.$response->json('data.id'))->assertNoContent();
    Storage::disk('local')->assertMissing($path);
});

it('rejects risky file types and empty comments', function () {
    Storage::fake('local');
    [$user, $workspace] = memberWithWorkspace();
    $task = Task::factory()->for($workspace)->create();
    $this->actingAs($user);

    $this->post("/api/v1/tasks/{$task->id}/comments", [
        'attachments' => [UploadedFile::fake()->create('pagina.html', 1, 'text/html')],
    ], ['Accept' => 'application/json'])->assertJsonValidationErrors('attachments.0');

    $this->postJson("/api/v1/tasks/{$task->id}/comments", ['body' => ''])->assertJsonValidationErrors('body');
});
