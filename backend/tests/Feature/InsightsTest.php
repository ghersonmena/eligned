<?php

use App\Enums\WorkspaceRole;
use App\Models\Activity;
use App\Models\Comment;
use App\Models\Project;
use App\Models\Task;
use App\Models\TimeEntry;
use App\Models\User;

function insightsUrl(int $workspaceId): string
{
    return "/api/v1/workspaces/{$workspaceId}/insights?".http_build_query([
        'since' => now()->subDays(13)->startOfDay()->toIso8601String(),
        'week_start' => now()->startOfWeek()->toIso8601String(),
    ]);
}

it('lists when my tasks were finished and my time per project this week', function () {
    [$me, $workspace] = memberWithWorkspace();
    $other = User::factory()->create();
    $workspace->addMember($other, WorkspaceRole::Member);
    $this->travelTo(now()->startOfWeek()->addDays(2)->setTime(12, 0));

    $net = Project::factory()->for($workspace)->create(['name' => 'REDES', 'color' => 'blue']);
    $mineDone = Task::factory()->for($workspace)->create(['completed_at' => now()->subDay(), 'project_id' => $net->id]);
    $mineDone->assignees()->attach($me);
    Task::factory()->for($workspace)->create(['completed_at' => now()->subHours(2)]);           // personal: counts
    Task::factory()->for($workspace)->create(['completed_at' => now()->subDays(20)]);           // before `since`
    tap(Task::factory()->for($workspace)->create(['completed_at' => now()]), fn ($t) => $t->assignees()->attach($other));

    $parent = Task::factory()->for($workspace)->create(['project_id' => $net->id]);
    $sub = Task::factory()->for($workspace)->create(['parent_id' => $parent->id]);
    $loose = Task::factory()->for($workspace)->create();
    $log = fn (Task $t, int $min, $at = null) => TimeEntry::create(['workspace_id' => $workspace->id, 'task_id' => $t->id,
        'user_id' => $me->id, 'started_at' => $at ?? now()->subHours(3), 'ended_at' => now()->subHours(2), 'minutes' => $min]);
    $log($mineDone, 30);
    $log($sub, 15);                       // subtask → parent's project
    $log($loose, 20);                     // no project
    $log($loose, 99, now()->subWeeks(2)); // last week: ignored

    $data = $this->actingAs($me)->getJson(insightsUrl($workspace->id))->assertOk()->json('data');

    expect($data['completed'])->toHaveCount(2)
        ->and($data['time_by_project'])->toBe([
            ['project' => ['id' => $net->id, 'name' => 'REDES', 'color' => 'blue'], 'minutes' => 45],
            ['project' => null, 'minutes' => 20],
        ]);
});

it('finds my stale tasks and the latest comments others left on them', function () {
    [$me, $workspace] = memberWithWorkspace();
    $other = User::factory()->create(['name' => 'Ana Pérez']);
    $workspace->addMember($other, WorkspaceRole::Member);

    $old = now()->subDays(30);
    $stale = Task::factory()->for($workspace)->create(['title' => 'OLVIDADA', 'created_by' => $me->id]);
    $commented = Task::factory()->for($workspace)->create(['title' => 'CON COMENTARIO', 'created_by' => $me->id]);
    $fresh = Task::factory()->for($workspace)->create();
    Task::query()->whereIn('id', [$stale->id, $commented->id])->update(['updated_at' => $old]);
    Activity::query()->update(['created_at' => $old]);

    // A recent comment keeps a task alive even if the task row is old.
    $this->actingAs($other);
    Comment::create(['task_id' => $commented->id, 'user_id' => $other->id, 'body' => 'YA QUEDÓ EL CABLEADO']);
    Activity::record($commented, 'commented');
    Comment::create(['task_id' => $commented->id, 'user_id' => $me->id, 'body' => 'MÍO: NO SALE']);
    Comment::create(['task_id' => $fresh->id, 'user_id' => $other->id, 'body' => 'NO ES MÍA NI LA CREÉ']);

    $data = $this->actingAs($me)->getJson(insightsUrl($workspace->id))->assertOk()->json('data');

    expect(collect($data['stale'])->pluck('title')->all())->toBe(['OLVIDADA'])
        ->and($data['stale_count'])->toBe(1)
        ->and($data['comments'])->toHaveCount(1)
        ->and($data['comments'][0])->toMatchArray([
            'excerpt' => 'YA QUEDÓ EL CABLEADO',
            'author' => ['id' => $other->id, 'name' => 'Ana Pérez'],
            'task' => ['id' => $commented->id, 'title' => 'CON COMENTARIO'],
        ]);
});

it('rejects ranges longer than a month and outsiders', function () {
    [$me, $workspace] = memberWithWorkspace();
    $this->actingAs($me)->getJson("/api/v1/workspaces/{$workspace->id}/insights?since=".now()->subDays(60)->toIso8601String().'&week_start='.now()->toIso8601String())
        ->assertJsonValidationErrors('since');
    $this->actingAs(User::factory()->create())->getJson(insightsUrl($workspace->id))->assertForbidden();
});
