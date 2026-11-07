<?php

namespace App\Http\Resources;

use App\Models\WorkspaceInvitation;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin WorkspaceInvitation
 */
class InvitationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $path = $this->path();

        return [
            'id' => $this->id,
            'email' => $this->email,
            'role' => $this->role,
            'inviter' => $this->inviter ? ['id' => $this->inviter->id, 'name' => $this->inviter->name] : null,
            'expires_at' => $this->expires_at,
            'expired' => $this->isExpired(),
            // Only right after creating or renewing it (the token isn't stored).
            'link' => $path ? $request->getSchemeAndHttpHost().$path : null,
            'created_at' => $this->created_at,
        ];
    }
}
