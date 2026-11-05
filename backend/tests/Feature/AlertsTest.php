<?php

use App\Actions\SendTaskAlerts;
use App\Enums\WorkspaceRole;
use App\Models\Task;
use App\Models\User;
use Illuminate\Support\Carbon;

function alertsFor(User $user): array
{
    return $user->fresh()->notifications()->oldest()->get()->map(fn ($n) => $n->data['kind'].': '.$n->data['body'])->all();
}

beforeEach(function () {
    $this->travelTo(Carbon::parse('2026-11-05 15:00:00', 'UTC')); // 09:00 en Ciudad de México
});

it('sends a reminder at its moment, once, and skips finished tasks', function () {
    [$user, $workspace] = memberWithWorkspace();
    $task = Task::factory()->for($workspace)->create(['due_at' => now()->addHours(3), 'created_by' => $user->id]);
    $done = Task::factory()->for($workspace)->completed()->create(['created_by' => $user->id]);
    $this->actingAs($user);

    $this->postJson("/api/v1/tasks/{$task->id}/reminders", ['remind_at' => now()->addMinutes(10)->toIso8601String()])->assertCreated();
    $this->postJson("/api/v1/tasks/{$done->id}/reminders", ['remind_at' => now()->addMinutes(10)->toIso8601String()])->assertCreated();

    $alerts = app(SendTaskAlerts::class);
    expect($alerts->handle())->toBe(0);
    $this->travel(10)->minutes();
    expect($alerts->handle())->toBe(1)
        ->and($alerts->handle())->toBe(0)
        ->and(alertsFor($user))->toBe(['reminder: Vence hoy a las 12:00']);
});

it('moves "before the due date" reminders with the due date', function () {
    [$user, $workspace] = memberWithWorkspace();
    $task = Task::factory()->for($workspace)->create(['due_at' => now()->addHours(2)]);
    $this->actingAs($user);

    $this->postJson("/api/v1/tasks/{$task->id}/reminders", ['offset_minutes' => 30])
        ->assertCreated()
        ->assertJsonPath('data.remind_at', now()->addMinutes(90)->toJSON());

    $this->patchJson("/api/v1/tasks/{$task->id}", ['due_at' => now()->addDay()->toIso8601String()])->assertOk();
    expect($task->reminders()->first()->remind_at->toJSON())->toBe(now()->addDay()->subMinutes(30)->toJSON());

    $none = Task::factory()->for($workspace)->create();
    $this->postJson("/api/v1/tasks/{$none->id}/reminders", ['offset_minutes' => 30])->assertJsonValidationErrors('offset_minutes');
});

it('warns about tasks due soon by each person\'s preferences', function () {
    [$user, $workspace] = memberWithWorkspace();
    $timed = Task::factory()->for($workspace)->create(['title' => 'Llamada', 'due_at' => now()->addMinutes(90), 'created_by' => $user->id]);
    // All-day today: 23:59 Mexico City.
    Task::factory()->for($workspace)->create(['title' => 'Informe', 'due_at' => Carbon::parse('2026-11-05 23:59', 'America/Mexico_City')->utc(), 'created_by' => $user->id]);
    Task::factory()->for($workspace)->create(['title' => 'Viejo', 'due_at' => now()->subDays(3), 'created_by' => $user->id]);

    $alerts = app(SendTaskAlerts::class);
    expect($alerts->handle())->toBe(1); // the all-day one, at 09:00 local
    $this->travel(30)->minutes(); // 60 min before the call
    expect($alerts->handle())->toBe(1)->and($alerts->handle())->toBe(0);

    expect(alertsFor($user))->toEqualCanonicalizing(['due_soon: Vence hoy', 'due_soon: Vence hoy a las 10:30']);

    // A new due date gets its own alert.
    $timed->update(['due_at' => now()->addMinutes(30)]);
    expect($alerts->handle())->toBe(1);
});

it('respects turning the alerts off', function () {
    [$user, $workspace] = memberWithWorkspace();
    $user->update(['preferences' => ['due_notice_minutes' => null, 'all_day_notice' => false]]);
    Task::factory()->for($workspace)->create(['due_at' => now()->addMinutes(5), 'created_by' => $user->id]);
    Task::factory()->for($workspace)->create(['due_at' => Carbon::parse('2026-11-05 23:59', 'America/Mexico_City')->utc(), 'created_by' => $user->id]);

    expect(app(SendTaskAlerts::class)->handle())->toBe(0);
});

it('tells people when they are assigned or someone comments, and lists the bell', function () {
    [$owner, $workspace] = memberWithWorkspace();
    $mate = User::factory()->create();
    $workspace->addMember($mate, WorkspaceRole::Member);
    $task = Task::factory()->for($workspace)->create(['created_by' => $owner->id]);

    $this->actingAs($owner)->patchJson("/api/v1/tasks/{$task->id}", ['assignee_ids' => [$owner->id, $mate->id]])->assertOk();
    $this->actingAs($mate)->postJson("/api/v1/tasks/{$task->id}/comments", ['body' => 'Ya quedó'])->assertCreated();

    expect(alertsFor($mate))->toBe(["assigned: {$owner->name} te asignó esta tarea"])
        ->and(alertsFor($owner))->toBe(["commented: {$mate->name}: Ya quedó"]);

    $bell = $this->actingAs($owner)->getJson('/api/v1/notifications')->assertOk()->assertJsonPath('unread_count', 1);
    $id = $bell->json('data.0.id');
    expect($bell->json('data.0.task_id'))->toBe($task->id);
    $this->postJson("/api/v1/notifications/{$id}/read")->assertNoContent();
    $this->getJson('/api/v1/notifications')->assertJsonPath('unread_count', 0);
    $this->actingAs($mate)->postJson("/api/v1/notifications/{$id}/read")->assertNotFound();
});

it('validates the notification preferences', function () {
    [$user] = memberWithWorkspace();
    $this->actingAs($user)->patchJson('/api/v1/me/preferences', ['timezone' => 'Marte/Base', 'due_notice_minutes' => 7])
        ->assertJsonValidationErrors(['timezone', 'due_notice_minutes']);
    $this->patchJson('/api/v1/me/preferences', ['timezone' => 'Europe/Madrid', 'due_notice_minutes' => null, 'all_day_notice_time' => '08:30'])
        ->assertOk()
        ->assertJsonPath('data.preferences.timezone', 'Europe/Madrid')
        ->assertJsonPath('data.preferences.due_notice_minutes', null);
});
