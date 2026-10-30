<?php

use App\Models\User;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\URL;

function verificationUrl(User $user, ?string $hash = null, int $minutes = 60): string
{
    return URL::temporarySignedRoute('verification.verify', now()->addMinutes($minutes), [
        'id' => $user->id,
        'hash' => $hash ?? sha1($user->email),
    ]);
}

it('sends the confirmation email when registering', function () {
    Notification::fake();

    $this->withHeaders(['Referer' => 'http://localhost'])->postJson('/api/v1/auth/register', [
        'name' => 'Gherson',
        'email' => 'gherson@example.com',
        'password' => 'secret-password',
        'password_confirmation' => 'secret-password',
    ])->assertCreated()->assertJsonPath('data.email_verified', false);

    Notification::assertSentTo(User::firstWhere('email', 'gherson@example.com'), VerifyEmail::class);
});

it('verifies the email from the link, even without a session', function () {
    $user = User::factory()->unverified()->create();

    $this->get(verificationUrl($user))->assertRedirect('/?correo=verificado');

    expect($user->fresh()->hasVerifiedEmail())->toBeTrue();
});

it('rejects a link with a wrong hash', function () {
    $user = User::factory()->unverified()->create();

    $this->get(verificationUrl($user, hash: sha1('otro@example.com')))->assertRedirect('/?correo=enlace-invalido');

    expect($user->fresh()->hasVerifiedEmail())->toBeFalse();
});

it('rejects an expired link', function () {
    $user = User::factory()->unverified()->create();

    $this->get(verificationUrl($user, minutes: -1))->assertRedirect('/?correo=enlace-invalido');

    expect($user->fresh()->hasVerifiedEmail())->toBeFalse();
});

it('resends the confirmation email', function () {
    Notification::fake();
    $user = User::factory()->unverified()->create();

    $this->actingAs($user)->postJson('/api/v1/email/verification-notification')->assertAccepted();

    Notification::assertSentTo($user, VerifyEmail::class);
});

it('does not resend when the email is already verified', function () {
    Notification::fake();
    $user = User::factory()->create();

    $this->actingAs($user)->postJson('/api/v1/email/verification-notification')->assertNoContent();

    Notification::assertNothingSent();
});
