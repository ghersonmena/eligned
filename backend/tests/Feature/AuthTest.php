<?php

use App\Enums\WorkspaceRole;
use App\Models\User;

beforeEach(function () {
    // Sanctum only starts a session for requests coming from a stateful domain.
    $this->withHeaders(['Referer' => 'http://localhost', 'Accept' => 'application/json']);
});

it('registers a user with a personal workspace and logs them in', function () {
    $response = $this->postJson('/api/v1/auth/register', [
        'name' => 'Gherson',
        'email' => 'gherson@example.com',
        'password' => 'secret-password',
        'password_confirmation' => 'secret-password',
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.email', 'gherson@example.com')
        ->assertJsonPath('data.preferences.theme', 'system')
        ->assertJsonPath('data.workspaces.0.personal', true)
        ->assertJsonPath('data.workspaces.0.role', WorkspaceRole::Owner->value);

    $this->assertAuthenticated();
});

it('rejects a registration with an email already in use', function () {
    User::factory()->create(['email' => 'taken@example.com']);

    $this->postJson('/api/v1/auth/register', [
        'name' => 'Otro',
        'email' => 'taken@example.com',
        'password' => 'secret-password',
        'password_confirmation' => 'secret-password',
    ])->assertUnprocessable()->assertJsonValidationErrors('email');
});

it('logs in with valid credentials', function () {
    $user = User::factory()->create(['password' => 'secret-password']);

    $this->postJson('/api/v1/auth/login', [
        'email' => $user->email,
        'password' => 'secret-password',
    ])->assertOk()->assertJsonPath('data.id', $user->id);

    $this->assertAuthenticatedAs($user);
});

it('logs in when the app is opened by LAN IP (e.g. from a phone)', function () {
    $user = User::factory()->create(['password' => 'secret-password']);

    $this->withServerVariables(['HTTP_HOST' => '192.168.1.50:8090'])
        ->withHeaders(['Referer' => 'http://192.168.1.50:8090/login'])
        ->postJson('http://192.168.1.50:8090/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'secret-password',
        ])->assertOk();

    $this->assertAuthenticatedAs($user);
});

it('rejects invalid credentials', function () {
    $user = User::factory()->create(['password' => 'secret-password']);

    $this->postJson('/api/v1/auth/login', [
        'email' => $user->email,
        'password' => 'wrong-password',
    ])->assertUnprocessable()->assertJsonValidationErrors('email');

    $this->assertGuest();
});

it('logs out', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->postJson('/api/v1/auth/logout')->assertNoContent();

    $this->assertGuest('web');
});
