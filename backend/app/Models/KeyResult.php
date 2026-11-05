<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['goal_id', 'title', 'kind', 'start_value', 'target_value', 'current_value', 'unit', 'project_id', 'position'])]
class KeyResult extends Model
{
    public const KINDS = ['number', 'tasks'];

    /** @var array{done: int, total: int}|null */
    private ?array $taskCounts = null;

    protected function casts(): array
    {
        return ['start_value' => 'float', 'target_value' => 'float', 'current_value' => 'float'];
    }

    /** 0–1. */
    public function progress(): float
    {
        if ($this->kind === 'tasks') {
            ['done' => $done, 'total' => $total] = $this->taskCounts();

            return $total === 0 ? 0.0 : $done / $total;
        }
        $span = $this->target_value - $this->start_value;
        if ($span == 0) {
            return $this->current_value >= $this->target_value ? 1.0 : 0.0;
        }

        return max(0.0, min(1.0, ($this->current_value - $this->start_value) / $span));
    }

    /**
     * Tasks of the linked project (subtasks included, a parent with subtasks
     * counted through them).
     *
     * @return array{done: int, total: int}
     */
    public function taskCounts(): array
    {
        if ($this->taskCounts !== null) {
            return $this->taskCounts;
        }
        if (! $this->project_id) {
            return $this->taskCounts = ['done' => 0, 'total' => 0];
        }
        $row = Task::query()
            ->where(fn ($q) => $q->where('project_id', $this->project_id)
                ->orWhereHas('parent', fn ($p) => $p->where('project_id', $this->project_id)))
            ->whereDoesntHave('subtasks')
            ->selectRaw('count(*) as total, count(completed_at) as done')
            ->first();

        return $this->taskCounts = ['done' => (int) $row->done, 'total' => (int) $row->total];
    }

    /**
     * @return BelongsTo<Goal, $this>
     */
    public function goal(): BelongsTo
    {
        return $this->belongsTo(Goal::class);
    }

    /**
     * @return BelongsTo<Project, $this>
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }
}
