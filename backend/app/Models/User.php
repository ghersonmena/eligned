<?php

namespace App\Models;

use App\Enums\Theme;
use App\Notifications\QueuedVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Contracts\Translation\HasLocalePreference;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use NotificationChannels\WebPush\HasPushSubscriptions;

#[Fillable(['name', 'email', 'password', 'preferences'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable implements HasLocalePreference, MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, HasPushSubscriptions, Notifiable;

    /**
     * Default values for each user preference.
     *
     * @var array<string, mixed>
     */
    public const DEFAULT_PREFERENCES = [
        'theme' => Theme::System->value,
        'confetti' => true,
        // IANA zone, set by the app from the browser; used for all-day alerts and texts.
        'timezone' => 'America/Mexico_City',
        // "Vence pronto" for tasks with a time: minutes before (null = off).
        'due_notice_minutes' => 60,
        // All-day tasks: a heads-up that morning at this local time.
        'all_day_notice' => true,
        'all_day_notice_time' => '09:00',
        // Live popups inside the app.
        'popups' => true,
        // Workspace the app opens (null: the first one, usually their personal space).
        'current_workspace_id' => null,
        // Home cards in order, each maybe hidden (null: the default layout).
        'home_layout' => null,
        // Interface language (es / en); null until the app sends the device's.
        'locale' => null,
        // "Notas rápidas" home card: a personal scratchpad.
        'home_note' => null,
        // Last app version whose "Esto es lo nuevo" screen they closed (null: none yet).
        'seen_version' => null,
    ];

    public const HOME_NOTE_MAX = 5000;

    public const LOCALES = ['es', 'en'];

    /** Cards the home page can show (see HomePage in the app). */
    public const HOME_CARDS = [
        'today', 'tracker', 'activity', 'goals', 'upcoming', 'projects', 'team',
        'quick', 'priority', 'rhythm', 'time', 'stale', 'comments', 'notes', 'agenda',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'preferences' => 'array',
        ];
    }

    /**
     * @return BelongsToMany<Workspace, $this>
     */
    public function workspaces(): BelongsToMany
    {
        return $this->belongsToMany(Workspace::class)
            ->using(WorkspaceMember::class)
            ->withPivot('role')
            ->withTimestamps();
    }

    public function sendEmailVerificationNotification(): void
    {
        $this->notify(QueuedVerifyEmail::for($this));
    }

    /**
     * Stored preferences merged over the defaults.
     *
     * @return array<string, mixed>
     */
    public function resolvedPreferences(): array
    {
        return array_merge(self::DEFAULT_PREFERENCES, $this->preferences ?? []);
    }

    /** Language for this person's emails, notifications and API messages. */
    public function preferredLocale(): string
    {
        $locale = $this->resolvedPreferences()['locale'];

        return in_array($locale, self::LOCALES, true) ? $locale : config('app.locale');
    }
}
