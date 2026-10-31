<?php

use App\Models\User;
use App\Notifications\QueuedVerifyEmail;
use Illuminate\Contracts\Queue\ShouldQueue;
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

    Notification::assertSentTo(User::firstWhere('email', 'gherson@example.com'), QueuedVerifyEmail::class);
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

    Notification::assertSentTo($user, QueuedVerifyEmail::class);
});

it('answers the same for verified or unknown emails without sending anything', function () {
    Notification::fake();
    $user = User::factory()->create();

    $this->postJson('/api/v1/email/verification-notification', ['email' => $user->email])->assertAccepted();
    $this->postJson('/api/v1/email/verification-notification', ['email' => 'nadie@example.com'])->assertAccepted();

    Notification::assertNothingSent();
});

it('sends the confirmation email through the queue', function () {
    Notification::fake();
    $user = User::factory()->unverified()->create();

    $user->sendEmailVerificationNotification();

    Notification::assertSentTo($user, QueuedVerifyEmail::class, function (QueuedVerifyEmail $notification) {
        return $notification instanceof ShouldQueue;
    });
});

it('signs the link for the host the user registered from', function () {
    Notification::fake();

    $this->withServerVariables(['HTTP_HOST' => '192.168.1.50:8090'])
        ->withHeaders(['Referer' => 'http://192.168.1.50:8090/registro'])
        ->postJson('http://192.168.1.50:8090/api/v1/auth/register', [
            'name' => 'Desde el teléfono',
            'email' => 'tel@example.com',
            'password' => 'secret-password',
            'password_confirmation' => 'secret-password',
        ])->assertCreated();

    Notification::assertSentTo(User::firstWhere('email', 'tel@example.com'), QueuedVerifyEmail::class,
        fn (QueuedVerifyEmail $notification) => str_starts_with($notification->url, 'http://192.168.1.50:8090/api/v1/email/verify/'));
});
