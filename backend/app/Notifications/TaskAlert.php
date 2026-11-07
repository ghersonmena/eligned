<?php

namespace App\Notifications;

use App\Models\Task;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;
use NotificationChannels\WebPush\WebPushChannel;
use NotificationChannels\WebPush\WebPushMessage;

/**
 * Everything the app tells a person about a task: a reminder, "vence pronto",
 * "te asignaron" or a new comment. Stored for the bell (database); later
 * channels (live popup, push) reuse the same payload.
 */
class TaskAlert extends Notification implements ShouldQueue
{
    use Queueable;

    public const KINDS = ['reminder', 'due_soon', 'assigned', 'commented'];

    public function __construct(
        public string $kind,
        public int $taskId,
        public string $title,
        public string $body,
    ) {}

    public static function for(string $kind, Task $task, string $body): self
    {
        return new self($kind, $task->id, $task->title, $body);
    }

    /**
     * Tells the people just assigned (not the one who did it).
     *
     * @param  array<int, int>  $userIds
     */
    public static function assigned(Task $task, array $userIds, ?User $by): void
    {
        User::whereKey($userIds)->get()
            ->reject(fn (User $u) => $by && $u->is($by))
            ->each(fn (User $u) => $u->notify(self::for('assigned', $task, ($by ? "{$by->name} te asignó esta tarea" : 'Te asignaron esta tarea'))));
    }

    /**
     * @return array<int, string>
     */
    public function via(User $notifiable): array
    {
        // database: the bell; broadcast: the live popup and badge;
        // web push: devices where the person turned push on (even with the app closed).
        return [
            'database',
            'broadcast',
            ...($notifiable->pushSubscriptions()->exists() ? [WebPushChannel::class] : []),
        ];
    }

    public function toWebPush(User $notifiable): WebPushMessage
    {
        return (new WebPushMessage)
            ->title($this->title)
            ->body($this->body)
            ->icon('/pwa-192x192.png')
            ->badge('/pwa-64x64.png')
            ->tag("task-{$this->taskId}-{$this->kind}")
            ->data(['url' => "/tareas/{$this->taskId}"])
            ->options(['TTL' => 3600 * 12]);
    }

    public function toBroadcast(User $notifiable): BroadcastMessage
    {
        return new BroadcastMessage($this->toArray($notifiable));
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(User $notifiable): array
    {
        return [
            'kind' => $this->kind,
            'task_id' => $this->taskId,
            'title' => $this->title,
            'body' => $this->body,
        ];
    }
}
