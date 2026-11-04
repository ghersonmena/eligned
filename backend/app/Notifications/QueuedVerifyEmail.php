<?php

namespace App\Notifications;

use App\Models\User;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\URL;

/**
 * "Confirm your email" message sent through the queue, so registering does not
 * wait for the mail server and failures are retried in the background.
 */
class QueuedVerifyEmail extends VerifyEmail implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    /** @var list<int> */
    public array $backoff = [10, 60];

    /**
     * The link is signed while handling the request, so it points to the host
     * the user is actually using (a LAN IP from a phone, a custom domain...)
     * instead of whatever APP_URL the queue worker sees.
     */
    public function __construct(public string $url) {}

    public static function for(User $user): self
    {
        return new self(URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes(config('auth.verification.expire', 60)),
            ['id' => $user->getKey(), 'hash' => sha1($user->getEmailForVerification())],
        ));
    }

    protected function verificationUrl($notifiable): string
    {
        return $this->url;
    }
}
