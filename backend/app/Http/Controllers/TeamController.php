<?php

namespace App\Http\Controllers;

use App\Enums\WorkspaceRole;
use App\Http\Resources\InvitationResource;
use App\Http\Resources\MemberResource;
use App\Http\Resources\WorkspaceResource;
use App\Models\Task;
use App\Models\TimeEntry;
use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceInvitation;
use App\Notifications\WorkspaceInvitationMail;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\Rule;

/**
 * People in a workspace: roles, removing members and invitations.
 *
 * Roles: owner (one, the creator) > admin (manages people) > member (edits
 * content) > guest (read only). Admins manage members and guests; only the
 * owner names or removes admins.
 */
class TeamController extends Controller
{
    public function rename(Request $request, Workspace $workspace): WorkspaceResource
    {
        Gate::authorize('manage', $workspace);
        $workspace->update($request->validate(['name' => ['required', 'string', 'max:120']]));

        return new WorkspaceResource($workspace);
    }

    public function updateRole(Request $request, Workspace $workspace, User $user): MemberResource
    {
        Gate::authorize('manage', $workspace);
        $data = $request->validate(['role' => ['required', Rule::in(['admin', 'member', 'guest'])]]);
        $actor = $workspace->roleOf($request->user());
        $current = $workspace->roleOf($user);

        abort_if($current === null, 404);
        abort_if($current === WorkspaceRole::Owner, 422, 'El rol del dueño no se puede cambiar.');
        abort_if(
            $actor !== WorkspaceRole::Owner && ($current === WorkspaceRole::Admin || $data['role'] === 'admin'),
            403,
            'Solo el dueño puede nombrar o cambiar administradores.',
        );

        $workspace->members()->updateExistingPivot($user->id, ['role' => $data['role']]);

        return new MemberResource($workspace->members()->whereKey($user->id)->first());
    }

    /** Removes someone (managers), or leaves the workspace (anyone but the owner). */
    public function removeMember(Request $request, Workspace $workspace, User $user): Response
    {
        $self = $request->user()->is($user);
        if (! $self) {
            Gate::authorize('manage', $workspace);
        }
        $current = $workspace->roleOf($user);
        abort_if($current === null, 404);
        abort_if($current === WorkspaceRole::Owner, 422, 'El dueño no puede salir ni ser quitado del espacio.');
        abort_if(
            ! $self && $current === WorkspaceRole::Admin && $workspace->roleOf($request->user()) !== WorkspaceRole::Owner,
            403,
            'Solo el dueño puede quitar administradores.',
        );

        DB::transaction(function () use ($workspace, $user) {
            // Their running timers here stop; they stop being responsible for its tasks.
            TimeEntry::running()->where('user_id', $user->id)->where('workspace_id', $workspace->id)->get()->each->stop();
            DB::table('task_user')
                ->where('user_id', $user->id)
                ->whereIn('task_id', Task::where('workspace_id', $workspace->id)->select('id'))
                ->delete();
            $workspace->members()->detach($user->id);
        });

        return response()->noContent();
    }

    public function invitations(Workspace $workspace): AnonymousResourceCollection
    {
        Gate::authorize('manage', $workspace);

        return InvitationResource::collection(
            $workspace->invitations()->pending()->with('inviter:id,name')->latest()->get()
        );
    }

    public function invite(Request $request, Workspace $workspace): JsonResponse
    {
        Gate::authorize('manage', $workspace);
        $data = $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'role' => ['required', Rule::in(['admin', 'member', 'guest'])],
            'send_email' => ['sometimes', 'boolean'],
        ]);
        $email = mb_strtolower(trim($data['email']));
        abort_if(
            $data['role'] === 'admin' && $workspace->roleOf($request->user()) !== WorkspaceRole::Owner,
            403,
            'Solo el dueño puede invitar administradores.',
        );
        if ($workspace->members()->where('email', $email)->exists()) {
            return response()->json(['message' => 'Esa persona ya es parte del espacio.', 'errors' => ['email' => ['Esa persona ya es parte del espacio.']]], 422);
        }

        $invitation = DB::transaction(function () use ($workspace, $email, $data, $request) {
            // A new invitation replaces an older pending one for the same address.
            $workspace->invitations()->pending()->where('email', $email)->delete();

            $invitation = new WorkspaceInvitation([
                'workspace_id' => $workspace->id,
                'email' => $email,
                'role' => $data['role'],
                'invited_by' => $request->user()->id,
            ]);
            $invitation->refreshToken()->save();

            return $invitation;
        });

        $this->sendIfAsked($request, $invitation);

        return (new InvitationResource($invitation->load('inviter:id,name', 'workspace')))->response()->setStatusCode(201);
    }

    /** New link (the old one stops working) and, if asked, a new email. */
    public function renew(Request $request, WorkspaceInvitation $invitation): InvitationResource
    {
        Gate::authorize('manage', $invitation->workspace);
        abort_if($invitation->accepted_at !== null, 422, 'Esa invitación ya fue aceptada.');
        $invitation->refreshToken()->save();
        $this->sendIfAsked($request, $invitation);

        return new InvitationResource($invitation->load('inviter:id,name'));
    }

    public function revoke(WorkspaceInvitation $invitation): Response
    {
        Gate::authorize('manage', $invitation->workspace);
        $invitation->delete();

        return response()->noContent();
    }

    /** Public: what the link is about, so the page can greet the person before they sign in. */
    public function showInvitation(string $token): JsonResponse
    {
        $invitation = WorkspaceInvitation::findByToken($token);
        abort_if(! $invitation, 404, 'Esta invitación no existe o fue cancelada.');

        return response()->json(['data' => [
            'workspace' => $invitation->workspace->name,
            'inviter' => $invitation->inviter?->name,
            'email' => $invitation->email,
            'role' => $invitation->role,
            'expired' => $invitation->isExpired(),
            'accepted' => $invitation->accepted_at !== null,
        ]]);
    }

    public function accept(Request $request, string $token): JsonResponse
    {
        $invitation = WorkspaceInvitation::findByToken($token);
        abort_if(! $invitation, 404, 'Esta invitación no existe o fue cancelada.');
        abort_if($invitation->accepted_at !== null, 422, 'Esta invitación ya se usó.');
        abort_if($invitation->isExpired(), 422, 'Esta invitación venció. Pide que te envíen una nueva.');

        $user = $request->user();
        abort_if(
            mb_strtolower($user->email) !== $invitation->email,
            403,
            "Esta invitación es para {$invitation->email}. Entra con esa cuenta para aceptarla.",
        );

        $workspace = $invitation->workspace;
        DB::transaction(function () use ($workspace, $user, $invitation) {
            if ($workspace->roleOf($user) === null) {
                $workspace->addMember($user, $invitation->role);
            }
            $invitation->update(['accepted_at' => now()]);
            // Opens the app on the workspace they just joined.
            $user->update(['preferences' => array_merge($user->preferences ?? [], ['current_workspace_id' => $workspace->id])]);
        });

        return response()->json(['data' => ['workspace_id' => $workspace->id]]);
    }

    private function sendIfAsked(Request $request, WorkspaceInvitation $invitation): void
    {
        if (! $request->boolean('send_email', true)) {
            return;
        }
        $url = $request->getSchemeAndHttpHost().$invitation->path();
        Notification::route('mail', $invitation->email)->notify(WorkspaceInvitationMail::for($invitation->load('workspace', 'inviter'), $url));
    }
}
