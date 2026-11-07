<?php

use App\Enums\WorkspaceRole;
use App\Models\Task;
use App\Models\TimeEntry;
use App\Models\User;
use App\Models\WorkspaceInvitation;
use App\Notifications\WorkspaceInvitationMail;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Support\Facades\Notification;

it('invites by email, and the invited person joins with that role', function () {
    Notification::fake();
    [$owner, $workspace] = memberWithWorkspace();

    $response = $this->actingAs($owner)->postJson("/api/v1/workspaces/{$workspace->id}/invitations", [
        'email' => 'Ana@Correo.mx',
        'role' => 'member',
    ])->assertCreated()->assertJsonPath('data.email', 'ana@correo.mx');

    $link = $response->json('data.link');
    expect($link)->toContain('/invitacion/');
    $token = basename($link);
    Notification::assertSentTo(new AnonymousNotifiable, WorkspaceInvitationMail::class, fn ($n, $c, $notifiable) => $notifiable->routes['mail'] === 'ana@correo.mx' && $n->url === $link);

    // The token is not stored as is.
    expect(WorkspaceInvitation::first()->token_hash)->not->toBe($token);

    // Public page data.
    auth()->forgetGuards();
    $this->getJson("/api/v1/invitations/{$token}")
        ->assertOk()
        ->assertJsonPath('data.workspace', $workspace->name)
        ->assertJsonPath('data.role', 'member');

    // Someone else can't use it.
    $other = User::factory()->create(['email' => 'otro@correo.mx']);
    $this->actingAs($other)->postJson("/api/v1/invitations/{$token}/accept")->assertForbidden();

    $ana = User::factory()->create(['email' => 'ana@correo.mx']);
    $this->actingAs($ana)->postJson("/api/v1/invitations/{$token}/accept")
        ->assertOk()
        ->assertJsonPath('data.workspace_id', $workspace->id);
    expect($workspace->roleOf($ana))->toBe(WorkspaceRole::Member)
        ->and($ana->fresh()->resolvedPreferences()['current_workspace_id'])->toBe($workspace->id);

    $this->postJson("/api/v1/invitations/{$token}/accept")->assertStatus(422);
    $this->getJson('/api/v1/me')->assertJsonCount(1, 'data.workspaces');
});

it('can create the link without sending an email, and renew or revoke it', function () {
    Notification::fake();
    [$owner, $workspace] = memberWithWorkspace();
    $this->actingAs($owner);

    $first = $this->postJson("/api/v1/workspaces/{$workspace->id}/invitations", ['email' => 'luis@correo.mx', 'role' => 'guest', 'send_email' => false]);
    Notification::assertNothingSent();
    $id = $first->json('data.id');

    $this->getJson("/api/v1/workspaces/{$workspace->id}/invitations")
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.link', null);

    $renewed = $this->postJson("/api/v1/invitations/{$id}/renew", ['send_email' => false])->json('data.link');
    expect($renewed)->not->toBe($first->json('data.link'));
    $this->getJson('/api/v1/invitations/'.basename($first->json('data.link')))->assertNotFound();

    $this->deleteJson("/api/v1/invitations/{$id}")->assertNoContent();
    $this->getJson('/api/v1/invitations/'.basename($renewed))->assertNotFound();
});

it('rejects expired invitations and people already in the workspace', function () {
    Notification::fake();
    [$owner, $workspace] = memberWithWorkspace();
    $this->actingAs($owner);

    $this->postJson("/api/v1/workspaces/{$workspace->id}/invitations", ['email' => $owner->email, 'role' => 'member'])
        ->assertJsonValidationErrors('email');

    $link = $this->postJson("/api/v1/workspaces/{$workspace->id}/invitations", ['email' => 'tarde@correo.mx', 'role' => 'member'])->json('data.link');
    $this->travel(WorkspaceInvitation::DAYS_VALID + 1)->days();
    $late = User::factory()->create(['email' => 'tarde@correo.mx']);
    $this->actingAs($late)->postJson('/api/v1/invitations/'.basename($link).'/accept')->assertStatus(422);
});

it('lets admins manage members and guests, but only the owner touches admins', function () {
    Notification::fake();
    [$owner, $workspace] = memberWithWorkspace();
    $admin = User::factory()->create();
    $member = User::factory()->create();
    $workspace->addMember($admin, WorkspaceRole::Admin);
    $workspace->addMember($member, WorkspaceRole::Member);

    $this->actingAs($member)->patchJson("/api/v1/workspaces/{$workspace->id}/members/{$admin->id}", ['role' => 'guest'])->assertForbidden();
    $this->actingAs($member)->postJson("/api/v1/workspaces/{$workspace->id}/invitations", ['email' => 'x@y.mx', 'role' => 'member'])->assertForbidden();

    $this->actingAs($admin)->patchJson("/api/v1/workspaces/{$workspace->id}/members/{$member->id}", ['role' => 'guest'])
        ->assertOk()->assertJsonPath('data.role', 'guest');
    $this->actingAs($admin)->patchJson("/api/v1/workspaces/{$workspace->id}/members/{$member->id}", ['role' => 'admin'])->assertForbidden();
    $this->actingAs($admin)->patchJson("/api/v1/workspaces/{$workspace->id}/members/{$owner->id}", ['role' => 'member'])->assertStatus(422);
    $this->actingAs($admin)->postJson("/api/v1/workspaces/{$workspace->id}/invitations", ['email' => 'x@y.mx', 'role' => 'admin'])->assertForbidden();

    $this->actingAs($owner)->patchJson("/api/v1/workspaces/{$workspace->id}/members/{$admin->id}", ['role' => 'member'])->assertOk();
    $this->actingAs($owner)->patchJson("/api/v1/workspaces/{$workspace->id}", ['name' => 'Soporte TI'])->assertJsonPath('data.name', 'Soporte TI');
});

it('removes a member: unassigns their tasks and stops their timers there', function () {
    [$owner, $workspace] = memberWithWorkspace();
    $member = User::factory()->create();
    $workspace->addMember($member, WorkspaceRole::Member);
    $task = Task::factory()->for($workspace)->create();
    $task->assignees()->attach($member);
    $this->actingAs($member)->postJson("/api/v1/tasks/{$task->id}/timer")->assertCreated();

    $this->actingAs($owner)->deleteJson("/api/v1/workspaces/{$workspace->id}/members/{$member->id}")->assertNoContent();

    expect($workspace->roleOf($member))->toBeNull()
        ->and($task->assignees()->count())->toBe(0)
        ->and(TimeEntry::running()->count())->toBe(0);
    $this->actingAs($member)->getJson("/api/v1/tasks/{$task->id}")->assertForbidden();
    $this->actingAs($owner)->deleteJson("/api/v1/workspaces/{$workspace->id}/members/{$owner->id}")->assertStatus(422);
});

it('lets a member leave, and remembers the workspace the app opens', function () {
    [, $workspace] = memberWithWorkspace();
    [$member, $personal] = memberWithWorkspace();
    $workspace->addMember($member, WorkspaceRole::Member);
    $this->actingAs($member);

    $this->patchJson('/api/v1/me/preferences', ['current_workspace_id' => $workspace->id])
        ->assertJsonPath('data.preferences.current_workspace_id', $workspace->id);
    $stranger = memberWithWorkspace()[1];
    $this->patchJson('/api/v1/me/preferences', ['current_workspace_id' => $stranger->id])->assertJsonValidationErrors('current_workspace_id');

    $this->deleteJson("/api/v1/workspaces/{$workspace->id}/members/{$member->id}")->assertNoContent();
    $this->getJson('/api/v1/me')->assertJsonCount(1, 'data.workspaces')->assertJsonPath('data.workspaces.0.id', $personal->id);
});
