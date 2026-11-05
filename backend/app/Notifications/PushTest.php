<?php

namespace App\Notifications;

use App\Models\User;
use Illuminate\Notifications\Notification;
use NotificationChannels\WebPush\WebPushChannel;
use NotificationChannels\WebPush\WebPushMessage;

/** "Probar notificación" in settings: a push to the person's devices only. */
class PushTest extends Notification
{
    /**
     * @return array<int, string>
     */
    public function via(User $notifiable): array
    {
        return [WebPushChannel::class];
    }

    public function toWebPush(User $notifiable): WebPushMessage
    {
        return (new WebPushMessage)
            ->title('¡Las notificaciones funcionan!')
            ->body('Así te avisaremos de recordatorios y tareas por vencer.')
            ->icon('/pwa-192x192.png')
            ->tag('push-test')
            ->data(['url' => '/ajustes']);
    }
}
