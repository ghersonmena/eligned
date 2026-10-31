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
    ])->assertCreated();

    Notification::assertSentTo(User::firstWhere('email', 'gherson@example.com'), VerifyEmail::class);
});

it('only confirms the email from the link and sends the user to log in', function () {
    $user = User::factory()->unverified()->create();

    $this->get(verificationUrl($user))->assertRedirect('/login?correo=verificado');

    expect($user->fresh()->hasVerifiedEmail())->toBeTrue();
    $this->assertGuest();
});

it('rejects a link with a wrong hash', function () {
    $user = User::factory()->unverified()->create();

    $this->get(verificationUrl($user, hash: sha1('otro@example.com')))->assertRedirect('/login?correo=enlace-invalido');

    expect($user->fresh()->hasVerifiedEmail())->toBeFalse();
});

it('rejects an expired link', function () {
    $user = User::factory()->unverified()->create();

    $this->get(verificationUrl($user, minutes: -1))->assertRedirect('/login?correo=enlace-invalido');

    expect($user->fresh()->hasVerifiedEmail())->toBeFalse();
});

it('resends the confirmation email without being signed in', function () {
    Notification::fake();
    $user = User::factory()->unverified()->create();

    $this->postJson('/api/v1/email/verification-notification', ['email' => $user->email])->assertAccepted();

    Notification::assertSentTo($user, VerifyEmail::class);
});

it('answers the same for verified or unknown emails without sending anything', function () {
    Notification::fake();
    $user = User::factory()->create();

    $this->postJson('/api/v1/email/verification-notification', ['email' => $user->email])->assertAccepted();
    $this->postJson('/api/v1/email/verification-notification', ['email' => 'nadie@example.com'])->assertAccepted();

    Notification::assertNothingSent();
});
