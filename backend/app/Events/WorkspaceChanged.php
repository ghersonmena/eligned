<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;

/**
 * "Tasks of this workspace changed": open screens refetch what they show.
 * Carries ids only; the data itself always comes from the API.
 */
class WorkspaceChanged implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets;

    /**
     * @param  array<int, int>  $taskIds
     */
    public function __construct(public int $workspaceId, public array $taskIds) {}

    public function broadcastOn(): PrivateChannel
    {
        return new PrivateChannel("workspace.{$this->workspaceId}");
    }

    public function broadcastAs(): string
    {
        return 'changed';
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return ['task_ids' => $this->taskIds];
    }
}
