<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

#[Fillable(['task_id', 'user_id', 'remind_at', 'offset_minutes', 'sent_at'])]
class Reminder extends Model
{
    protected function casts(): array
    {
        return ['remind_at' => 'datetime', 'sent_at' => 'datetime', 'offset_minutes' => 'integer'];
    }

    /** Re-aims a "before the due date" reminder after the due date moved. */
    public function followDueDate(?\DateTimeInterface $dueAt): void
    {
        if ($this->offset_minutes === null || $dueAt === null) {
            return;
        }
        $this->remind_at = Carbon::instance($dueAt)->subMinutes($this->offset_minutes);
        // Pending again when its new moment is still ahead.
        if ($this->remind_at->isFuture()) {
            $this->sent_at = null;
        }
        $this->save();
    }

    /**
     * @return BelongsTo<Task, $this>
     */
    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
