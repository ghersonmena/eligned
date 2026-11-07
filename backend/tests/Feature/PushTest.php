<?php

use App\Models\Task;
use App\Notifications\PushTest;
use App\Notifications\TaskAlert;
use Illuminate\Support\Facades\Notification;
use NotificationChannels\WebPush\WebPushChannel;

$subscription = [
    'endpoint' => 'https://push.example.test/send/abc123',
    'keys' => ['p256dh' => 'BPublicKeyOfTheBrowser', 'auth' => 'secret-auth'],
    'content_encoding' => 'aes128gcm',
];

it('saves and removes the push subscription of a device', function () use ($subscription) {
    [$user] = memberWithWorkspace();
    $this->actingAs($user)->postJson('/api/v1/push-subscriptions', $subscription)->assertNoContent();
    $this->postJson('/api/v1/push-subscriptions', $subscription)->assertNoContent(); // same device again
    expect($user->pushSubscriptions()->count())->toBe(1);

    $this->postJson('/api/v1/push-subscriptions', [...$subscription, 'endpoint' => 'http://inseguro.test'])->assertJsonValidationErrors('endpoint');

    $this->postJson('/api/v1/push-subscriptions/delete', ['endpoint' => $subscription['endpoint']])->assertNoContent();
    expect($user->pushSubscriptions()->count())->toBe(0);
});

it('pushes alerts only to people with a subscribed device', function () use ($subscription) {
    [$user, $workspace] = memberWithWorkspace();
    $task = Task::factory()->for($workspace)->create();
    $alert = TaskAlert::for('reminder', $task, 'Vence hoy');

    expect($alert->via($user))->not->toContain(WebPushChannel::class);

    $this->actingAs($user)->postJson('/api/v1/push-subscriptions', $subscription);
    expect($alert->via($user->fresh()))->toContain(WebPushChannel::class)
        ->and($alert->toWebPush($user)->toArray())->toMatchArray(['title' => $task->title, 'body' => 'Vence hoy', 'data' => ['url' => "/tareas/{$task->id}"]]);
});

it('sends a test push to the person\'s devices', function () use ($subscription) {
    Notification::fake();
    [$user] = memberWithWorkspace();
    $this->actingAs($user)->postJson('/api/v1/push-subscriptions/test')->assertStatus(422);

    $this->postJson('/api/v1/push-subscriptions', $subscription);
    $this->postJson('/api/v1/push-subscriptions/test')->assertNoContent();
    Notification::assertSentTo($user, PushTest::class);
});

it('publishes the public push key', function () {
    config(['webpush.vapid.public_key' => 'BPublicVapid']);
    $this->getJson('/api/v1/config')->assertJsonPath('push.public_key', 'BPublicVapid');
});
