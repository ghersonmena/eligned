<?php

namespace App\Actions;

use App\Enums\WorkspaceRole;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Auth\Events\Registered;
use Illuminate\Support\Facades\DB;

class RegisterUser
{
    /**
     * Create the user together with their personal workspace.
     *
     * @param  array{name: string, email: string, password: string}  $data
     */
    public function handle(array $data): User
    {
        $user = DB::transaction(function () use ($data) {
            $user = User::create($data);

            $workspace = Workspace::create([
                'name' => 'Espacio de '.$user->name,
                'owner_id' => $user->id,
                'personal' => true,
            ]);

            $workspace->addMember($user, WorkspaceRole::Owner);

            return $user;
        });

        // Sends the "confirm your email" message.
        event(new Registered($user));

        return $user;
    }
}
