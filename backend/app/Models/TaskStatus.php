<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['workspace_id', 'name', 'color', 'position', 'is_done'])]
class TaskStatus extends Model
{
    /** Columns every new workspace starts with. */
    public const DEFAULTS = [
        ['name' => 'Por hacer', 'color' => 'slate', 'is_done' => false],
        ['name' => 'En progreso', 'color' => 'blue', 'is_done' => false],
        ['name' => 'En revisión', 'color' => 'amber', 'is_done' => false],
        ['name' => 'Hecho', 'color' => 'green', 'is_done' => true],
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_done' => 'boolean',
        ];
    }

    /**
     * @return BelongsTo<Workspace, $this>
     */
    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }
}
