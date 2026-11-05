<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Notifications\DatabaseNotification;

/** The bell: the signed-in user's notifications. */
class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'data' => $user->notifications()->latest()->limit(50)->get()->map(fn (DatabaseNotification $n) => self::present($n)),
            'unread_count' => $user->unreadNotifications()->count(),
        ]);
    }

    public function read(Request $request, string $id): Response
    {
        $request->user()->notifications()->whereKey($id)->firstOrFail()->markAsRead();

        return response()->noContent();
    }

    public function readAll(Request $request): Response
    {
        $request->user()->unreadNotifications()->update(['read_at' => now()]);

        return response()->noContent();
    }

    /**
     * @return array<string, mixed>
     */
    public static function present(DatabaseNotification $n): array
    {
        return [
            'id' => $n->id,
            ...$n->data,
            'read_at' => $n->read_at,
            'created_at' => $n->created_at,
        ];
    }
}
