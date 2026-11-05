<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

#[Fillable(['workspace_id', 'title', 'description', 'color', 'owner_id', 'start_date', 'due_date', 'closed_at', 'created_by'])]
class Goal extends Model
{
    protected function casts(): array
    {
        return ['start_date' => 'date', 'due_date' => 'date', 'closed_at' => 'datetime'];
    }

    /** 0–1: the average of its key results (0 without any). */
    public function progress(): float
    {
        $krs = $this->keyResults;

        return $krs->isEmpty() ? 0.0 : round($krs->avg(fn (KeyResult $kr) => $kr->progress()), 4);
    }

    /**
     * done: reached 100% · late: past its due date · at_risk: behind the time
     * already elapsed (by more than 10 points) · on_track: otherwise ·
     * no_dates: nothing to compare with.
     */
    public function health(?Carbon $today = null): string
    {
        $today ??= today();
        $progress = $this->progress();
        if ($progress >= 1) {
            return 'done';
        }
        if (! $this->due_date) {
            return 'no_dates';
        }
        if ($today->gt($this->due_date)) {
            return 'late';
        }
        $start = $this->start_date ?? $this->created_at?->copy()->startOfDay() ?? $today;
        $total = max(1, $start->diffInDays($this->due_date));
        $elapsed = min(1, max(0, $start->diffInDays($today) / $total));

        return $progress + 0.1 < $elapsed ? 'at_risk' : 'on_track';
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
    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    /**
     * @return HasMany<KeyResult, $this>
     */
    public function keyResults(): HasMany
    {
        return $this->hasMany(KeyResult::class)->orderBy('position')->orderBy('id');
    }
}
