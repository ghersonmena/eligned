<?php

namespace App\Notifications;

use App\Models\WorkspaceInvitation;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/** "X te invitó a su espacio": sent to an email address that may not have an account yet. */
class WorkspaceInvitationMail extends Notification implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    /** The link is built while handling the request, with the host the inviter is using. */
    public function __construct(public string $workspaceName, public string $inviterName, public string $url) {}

    public static function for(WorkspaceInvitation $invitation, string $url): self
    {
        return new self($invitation->workspace->name, $invitation->inviter->name ?? 'Alguien', $url);
    }

    /**
     * @return list<string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject("{$this->inviterName} te invitó a \"{$this->workspaceName}\"")
            ->greeting('¡Hola!')
            ->line("{$this->inviterName} te invitó a colaborar en el espacio \"{$this->workspaceName}\".")
            ->action('Ver invitación', $this->url)
            ->line('La invitación vence en '.WorkspaceInvitation::DAYS_VALID.' días. Si no esperabas este correo, puedes ignorarlo.');
    }
}
