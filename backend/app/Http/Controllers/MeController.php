<?php

namespace App\Http\Controllers;

use App\Http\Requests\UpdatePreferencesRequest;
use App\Http\Resources\UserResource;
use Illuminate\Http\Request;

class MeController extends Controller
{
    public function show(Request $request): UserResource
    {
        return new UserResource($request->user()->load('workspaces'));
    }

    public function updatePreferences(UpdatePreferencesRequest $request): UserResource
    {
        $user = $request->user();

        $user->update([
            'preferences' => array_merge($user->preferences ?? [], $request->validated()),
        ]);

        return new UserResource($user->load('workspaces'));
    }
}
