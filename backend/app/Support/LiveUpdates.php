<?php

namespace App\Support;

use App\Events\WorkspaceChanged;

/**
 * Collects what changed during a request and announces it once at the end
 * (a single edit can touch a task, its parent and its history).
 */
class LiveUpdates
{
    /** @var array<int, array<int, true>> workspace id => task ids */
    private array $pending = [];

    public function touch(int $workspaceId, ?int $taskId = null): void
    {
        $this->pending[$workspaceId] ??= [];
        if ($taskId) {
            $this->pending[$workspaceId][$taskId] = true;
        }
    }

    public function flush(): void
    {
        $pending = $this->pending;
        $this->pending = [];
        foreach ($pending as $workspaceId => $taskIds) {
            // The tab that made the change already shows it.
            broadcast(new WorkspaceChanged($workspaceId, array_keys($taskIds)))->toOthers();
        }
    }
}
