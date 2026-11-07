<?php

use App\Events\WorkspaceChanged;
use App\Models\Task;
use App\Models\User;
use App\Support\LiveUpdates;
use Illuminate\Broadcasting\BroadcastManager;
use Illuminate\Support\Facades\Event;

it('announces once which tasks changed in a workspace', function () {
    [$user, $workspace] = memberWithWorkspace();
    $parent = Task::factory()->for($workspace)->create();
    $sub = Task::factory()->for($workspace)->create(['parent_id' => $parent->id]);
    app(LiveUpdates::class)->flush();
    Event::fake([WorkspaceChanged::class]);

    $this->actingAs($user)->patchJson("/api/v1/tasks/{$sub->id}", ['completed' => true])->assertOk();
    app(LiveUpdates::class)->flush();

    Event::assertDispatchedTimes(WorkspaceChanged::class, 1);
    Event::assertDispatched(WorkspaceChanged::class, fn (WorkspaceChanged $e) => $e->workspaceId === $workspace->id
        && collect($e->taskIds)->sort()->values()->all() === [$parent->id, $sub->id]);
});

it('only lets members listen to a workspace and people to their own channel', function () {
    [$user, $workspace] = memberWithWorkspace();
    $stranger = User::factory()->create();
    config([
        'broadcasting.default' => 'reverb',
        'broadcasting.connections.reverb.key' => 'test-key',
        'broadcasting.connections.reverb.secret' => 'test-secret',
        'broadcasting.connections.reverb.app_id' => '1',
    ]);
    // Channels were registered on the "null" broadcaster at boot.
    app(BroadcastManager::class)->purge();
    require base_path('routes/channels.php');

    $auth = fn (User $u, string $channel) => $this->actingAs($u)->postJson('/api/broadcasting/auth', ['socket_id' => '1234.5678', 'channel_name' => $channel]);

    $auth($user, "private-workspace.{$workspace->id}")->assertOk();
    $auth($stranger, "private-workspace.{$workspace->id}")->assertForbidden();
    $auth($user, "private-App.Models.User.{$user->id}")->assertOk();
    $auth($stranger, "private-App.Models.User.{$user->id}")->assertForbidden();
});
