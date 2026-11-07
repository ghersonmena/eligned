<?php

namespace App\Http\Controllers;

use App\Notifications\PushTest;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/** Devices (browsers) where the signed-in person wants push notifications. */
class PushSubscriptionController extends Controller
{
    public function store(Request $request): Response
    {
        $data = $request->validate([
            'endpoint' => ['required', 'url:https', 'max:500'],
            'keys.p256dh' => ['required', 'string', 'max:255'],
            'keys.auth' => ['required', 'string', 'max:255'],
            'content_encoding' => ['sometimes', 'in:aesgcm,aes128gcm'],
        ]);

        $request->user()->updatePushSubscription(
            $data['endpoint'],
            $data['keys']['p256dh'],
            $data['keys']['auth'],
            $data['content_encoding'] ?? 'aes128gcm',
        );

        return response()->noContent();
    }

    public function destroy(Request $request): Response
    {
        $request->validate(['endpoint' => ['required', 'string']]);
        $request->user()->deletePushSubscription($request->input('endpoint'));

        return response()->noContent();
    }

    public function test(Request $request): Response
    {
        abort_unless($request->user()->pushSubscriptions()->exists(), 422, 'Activa las notificaciones en este dispositivo primero.');
        $request->user()->notify(new PushTest);

        return response()->noContent();
    }
}
