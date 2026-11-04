<?php

namespace Database\Factories;

use App\Models\Task;
use App\Models\Workspace;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Task>
 */
class TaskFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'workspace_id' => Workspace::factory(),
            'status_id' => fn (array $attributes) => Workspace::find($attributes['workspace_id'])
                ->statuses()->where('is_done', false)->value('id'),
            'title' => fake()->sentence(4),
            'priority' => Task::PRIORITY_MEDIUM,
        ];
    }

    public function completed(): static
    {
        return $this->state([
            // Lazy, so it runs after the workspace is resolved (e.g. ->for($workspace)).
            'status_id' => fn (array $attributes) => Workspace::find($attributes['workspace_id'])
                ->statuses()->where('is_done', true)->value('id'),
            'completed_at' => now(),
        ]);
    }
}
