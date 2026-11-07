<?php

namespace App\Models;

use App\Enums\WorkspaceRole;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

#[Fillable(['workspace_id', 'email', 'role', 'token_hash', 'invited_by', 'expires_at', 'accepted_at'])]
class WorkspaceInvitation extends Model
{
    public const DAYS_VALID = 14;

    /** Token of the link, only known right after creating or renewing it. */
    public ?string $plainToken = null;

    protected function casts(): array
    {
        return ['role' => WorkspaceRole::class, 'expires_at' => 'datetime', 'accepted_at' => 'datetime'];
    }

    /** New random token (and expiry); the link shows it once. */
    public function refreshToken(): static
    {
        $this->plainToken = Str::random(48);
        $this->token_hash = hash('sha256', $this->plainToken);
        $this->expires_at = now()->addDays(self::DAYS_VALID);

        return $this;
    }

    public static function findByToken(string $token): ?self
    {
        return self::firstWhere('token_hash', hash('sha256', $token));
    }

    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }

    /** Path of the page that accepts it (the app's host is added by whoever builds the link). */
    public function path(): ?string
    {
        return $this->plainToken ? '/invitacion/'.$this->plainToken : null;
    }

    /**
     * @param  Builder<WorkspaceInvitation>  $query
     */
    public function scopePending(Builder $query): void
    {
        $query->whereNull('accepted_at');
    }

    /**
     * @return BelongsTo<Workspace, $this>
     */
    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function inviter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'invited_by');
    }
}
