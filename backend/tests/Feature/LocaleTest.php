<?php

use App\Actions\SendTaskAlerts;
use App\Enums\WorkspaceRole;
use App\Models\Task;
use App\Models\User;
use App\Notifications\WorkspaceInvitationMail;
use App\Support\Locale;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Support\Facades\Notification;

function speaks(User $user, string $locale): User
{
    $user->update(['preferences' => [...($user->preferences ?? []), 'locale' => $locale]]);

    return $user;
}

it('answers in the language of the browser before signing in', function () {
    $user = User::factory()->unverified()->create(['password' => 'secreto-123']);
    $login = ['email' => $user->email, 'password' => 'secreto-123'];

    $this->postJson('/api/v1/auth/login', $login, ['Accept-Language' => 'en-US,en;q=0.9'])
        ->assertForbidden()->assertJsonPath('message', 'Confirm your email before signing in.');
    $this->postJson('/api/v1/auth/login', $login, ['Accept-Language' => 'es-MX'])
        ->assertJsonPath('message', 'Confirma tu correo antes de iniciar sesión.');
});

it('answers in the language the person chose', function () {
    [$me, $workspace] = memberWithWorkspace();
    speaks($me, 'en');
    $task = Task::factory()->for($workspace)->create();

    $this->actingAs($me)->postJson("/api/v1/tasks/{$task->id}/comments", [], ['Accept-Language' => 'es'])
        ->assertJsonValidationErrors(['body' => 'Write a comment or attach a file.']);
});

it('writes each notification in its recipient\'s language', function () {
    [$owner, $workspace] = memberWithWorkspace();
    $mate = speaks(User::factory()->create(), 'en');
    $workspace->addMember($mate, WorkspaceRole::Member);
    $task = Task::factory()->for($workspace)->create();

    $this->actingAs($owner)->patchJson("/api/v1/tasks/{$task->id}", ['assignee_ids' => [$owner->id, $mate->id]])->assertOk();

    expect($mate->fresh()->notifications()->first()->data['body'])->toBe("{$owner->name} assigned you this task");
});

it('says when a task is due in English', function () {
    $user = speaks(User::factory()->create(), 'en');
    $now = now('UTC')->setDate(2026, 11, 6)->setTime(15, 0);
    $task = new Task(['due_at' => $now->copy()->addDay()->setTime(16, 0)]);
    $alerts = app(SendTaskAlerts::class);

    expect(Locale::run('en', fn () => $alerts->dueText($task, $user, $now)))->toStartWith('Due tomorrow at')
        ->and($alerts->dueText($task, $user, $now))->toStartWith('Vence mañana a las');
});

it('sends the invitation in the invited person\'s language, or the inviter\'s', function () {
    Notification::fake();
    [$owner, $workspace] = memberWithWorkspace();
    speaks($owner, 'en');
    speaks(User::factory()->create(['email' => 'ana@correo.mx']), 'es');

    $this->actingAs($owner)->postJson("/api/v1/workspaces/{$workspace->id}/invitations", ['email' => 'ana@correo.mx', 'role' => 'member'])->assertCreated();
    $this->postJson("/api/v1/workspaces/{$workspace->id}/invitations", ['email' => 'nuevo@correo.mx', 'role' => 'member'])->assertCreated();

    Notification::assertSentTo(new AnonymousNotifiable, WorkspaceInvitationMail::class, fn ($n, $c, $to) => $to->routes['mail'] === 'ana@correo.mx' && $n->locale === 'es');
    Notification::assertSentTo(new AnonymousNotifiable, WorkspaceInvitationMail::class, fn ($n, $c, $to) => $to->routes['mail'] === 'nuevo@correo.mx' && $n->locale === 'en');
});
