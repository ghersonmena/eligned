<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CommentController;
use App\Http\Controllers\EmailVerificationController;
use App\Http\Controllers\MeController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\PushSubscriptionController;
use App\Http\Controllers\ReminderController;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\TeamController;
use App\Http\Controllers\TimeEntryController;
use App\Http\Controllers\WorkspaceController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    // Public settings the app needs before signing in (the websocket key is public by design).
    Route::get('config', fn () => response()->json([
        'realtime' => config('broadcasting.default') === 'reverb'
            ? ['key' => config('broadcasting.connections.reverb.key')]
            : null,
        'push' => config('webpush.vapid.public_key')
            ? ['public_key' => config('webpush.vapid.public_key')]
            : null,
    ]));

    Route::prefix('auth')->group(function () {
        Route::post('register', [AuthController::class, 'register'])->middleware('throttle:10,1');
        Route::post('login', [AuthController::class, 'login'])->middleware('throttle:6,1');
        Route::post('logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');
    });

    // The invitation page greets people before they sign in or create an account.
    Route::get('invitations/{token}', [TeamController::class, 'showInvitation'])->middleware('throttle:30,1');

    Route::get('email/verify/{id}/{hash}', [EmailVerificationController::class, 'verify'])
        ->middleware('throttle:6,1')
        ->name('verification.verify');
    Route::post('email/verification-notification', [EmailVerificationController::class, 'resend'])
        ->middleware('throttle:3,1');

    // Only verified users can sign in, but "verified" also guards the API itself.
    Route::middleware(['auth:sanctum', 'verified'])->group(function () {
        Route::get('me', [MeController::class, 'show']);
        Route::patch('me/preferences', [MeController::class, 'updatePreferences']);

        Route::post('invitations/{token}/accept', [TeamController::class, 'accept'])->middleware('throttle:10,1');
        Route::post('invitations/{invitation}/renew', [TeamController::class, 'renew']);
        Route::delete('invitations/{invitation}', [TeamController::class, 'revoke']);

        Route::prefix('workspaces/{workspace}')->group(function () {
            Route::patch('/', [TeamController::class, 'rename']);
            Route::patch('members/{user}', [TeamController::class, 'updateRole']);
            Route::delete('members/{user}', [TeamController::class, 'removeMember']);
            Route::get('invitations', [TeamController::class, 'invitations']);
            Route::post('invitations', [TeamController::class, 'invite']);
            Route::get('statuses', [WorkspaceController::class, 'statuses']);
            Route::get('members', [WorkspaceController::class, 'members']);
            Route::get('projects', [ProjectController::class, 'index']);
            Route::post('projects', [ProjectController::class, 'store']);
            Route::get('tasks', [TaskController::class, 'index']);
            Route::post('tasks', [TaskController::class, 'store']);
        });

        Route::get('projects/{project}', [ProjectController::class, 'show']);
        Route::patch('projects/{project}', [ProjectController::class, 'update']);
        Route::delete('projects/{project}', [ProjectController::class, 'destroy']);

        Route::get('tasks/{task}', [TaskController::class, 'show']);
        Route::patch('tasks/{task}', [TaskController::class, 'update']);
        Route::delete('tasks/{task}', [TaskController::class, 'destroy']);
        Route::post('tasks/{task}/move', [TaskController::class, 'move']);
        Route::get('tasks/{task}/activity', [TaskController::class, 'activity']);
        Route::post('tasks/{task}/subtasks', [TaskController::class, 'storeSubtask']);
        Route::post('tasks/{task}/comments', [CommentController::class, 'store']);
        Route::delete('comments/{comment}', [CommentController::class, 'destroy']);
        Route::get('attachments/{attachment}', [CommentController::class, 'attachment']);

        Route::get('notifications', [NotificationController::class, 'index']);
        Route::post('notifications/read-all', [NotificationController::class, 'readAll']);
        Route::post('notifications/{id}/read', [NotificationController::class, 'read']);

        Route::post('push-subscriptions', [PushSubscriptionController::class, 'store']);
        Route::post('push-subscriptions/delete', [PushSubscriptionController::class, 'destroy']);
        Route::post('push-subscriptions/test', [PushSubscriptionController::class, 'test']);

        Route::get('tasks/{task}/reminders', [ReminderController::class, 'index']);
        Route::post('tasks/{task}/reminders', [ReminderController::class, 'store']);
        Route::delete('reminders/{reminder}', [ReminderController::class, 'destroy']);

        Route::get('timer', [TimeEntryController::class, 'current']);
        Route::post('timer/stop', [TimeEntryController::class, 'stop']);
        Route::post('tasks/{task}/timer', [TimeEntryController::class, 'start']);
        Route::get('tasks/{task}/time-entries', [TimeEntryController::class, 'index']);
        Route::post('tasks/{task}/time-entries', [TimeEntryController::class, 'store']);
        Route::delete('time-entries/{timeEntry}', [TimeEntryController::class, 'destroy']);
    });
});
