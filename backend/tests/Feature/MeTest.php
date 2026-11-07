<?php

use App\Models\User;

it('requires authentication', function () {
    $this->getJson('/api/v1/me')->assertUnauthorized();
});

it('is not available to an account with an unconfirmed email', function () {
    $user = User::factory()->unverified()->create();

    $this->actingAs($user)->getJson('/api/v1/me')->assertForbidden();
});

it('returns the current user with default preferences', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->getJson('/api/v1/me')
        ->assertOk()
        ->assertJsonPath('data.preferences', User::DEFAULT_PREFERENCES);
});

it('updates only the preferences that are sent', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->patchJson('/api/v1/me/preferences', ['theme' => 'dark'])
        ->assertOk()
        ->assertJsonPath('data.preferences.theme', 'dark')
        ->assertJsonPath('data.preferences.confetti', true);

    $this->actingAs($user)->patchJson('/api/v1/me/preferences', ['confetti' => false])
        ->assertOk()
        ->assertJsonPath('data.preferences.theme', 'dark')
        ->assertJsonPath('data.preferences.confetti', false);
});

it('rejects an unknown theme', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->patchJson('/api/v1/me/preferences', ['theme' => 'neon'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('theme');
});
