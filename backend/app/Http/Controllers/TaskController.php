<?php

namespace App\Http\Controllers;

use App\Actions\CreateTask;
use App\Http\Requests\StoreTaskRequest;
use App\Http\Requests\UpdateTaskRequest;
use App\Http\Resources\TaskResource;
use App\Models\Task;
use App\Models\Workspace;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class TaskController extends Controller
{
    /** Hard cap until the list gets pagination. */
    private const LIST_LIMIT = 500;

    /**
     * Top-level tasks of a workspace.
     *
     * Filters: project_id, status=open|completed|all (default open), assignee=me.
     */
    public function index(Request $request, Workspace $workspace): AnonymousResourceCollection
    {
        Gate::authorize('view', $workspace);

        $status = $request->query('status', 'open');

        $tasks = $workspace->tasks()
            ->whereNull('parent_id')
            ->when($request->filled('project_id'), fn (Builder $q) => $q->where('project_id', $request->integer('project_id')))
            ->when($status === 'open', fn (Builder $q) => $q->whereNull('completed_at'))
            ->when($status === 'completed', fn (Builder $q) => $q->whereNotNull('completed_at'))
            ->when($request->query('assignee') === 'me', fn (Builder $q) => $q->whereHas(
                'assignees', fn (Builder $a) => $a->whereKey($request->user()->id),
            ))
            // Subtasks come along so lists can expand them in place.
            ->with(['project', 'assignees', 'subtasks'])
            ->withCount($this->counts())
            ->when(
                $status === 'completed',
                fn (Builder $q) => $q->latest('completed_at'),
                fn (Builder $q) => $q->orderByRaw('due_at is null')->orderBy('due_at')->orderBy('priority')->orderBy('position'),
            )
            ->limit(self::LIST_LIMIT)
            ->get();

        return TaskResource::collection($tasks);
    }

    public function store(StoreTaskRequest $request, Workspace $workspace, CreateTask $createTask): TaskResource
    {
        Gate::authorize('contribute', $workspace);

        $task = $createTask->handle($workspace, $request->user(), $request->validated());

        return new TaskResource($task->load(['project', 'assignees'])->loadCount($this->counts()));
    }

    public function storeSubtask(StoreTaskRequest $request, Task $task, CreateTask $createTask): TaskResource
    {
        Gate::authorize('update', $task);
        abort_if($task->parent_id !== null, 422, 'Las subtareas no pueden tener subtareas.');

        $subtask = $createTask->handle($task->workspace, $request->user(), $request->validated(), $task);

        return new TaskResource($subtask->load('assignees'));
    }

    /** Full detail: subtasks, comments and assignees. */
    public function show(Task $task): TaskResource
    {
        Gate::authorize('view', $task);

        return new TaskResource($this->loadDetail($task));
    }

    public function update(UpdateTaskRequest $request, Task $task): TaskResource
    {
        Gate::authorize('update', $task);

        DB::transaction(function () use ($request, $task) {
            $data = $request->validated();

            $task->fill(collect($data)->except(['status_id', 'completed', 'assignee_ids'])->all());

            if (isset($data['status_id'])) {
                $task->moveToStatus($task->workspace->statuses->firstWhere('id', $data['status_id']));
            }
            if (array_key_exists('completed', $data)) {
                $task->setCompleted((bool) $data['completed']);
            }
            // Subtasks follow their parent's project.
            if ($task->isDirty('project_id') && $task->parent_id === null) {
                $task->subtasks()->update(['project_id' => $task->project_id]);
            }

            $completionChanged = $task->isDirty('completed_at');
            $task->save();

            if (array_key_exists('assignee_ids', $data)) {
                $task->assignees()->sync($data['assignee_ids']);
            }

            if ($completionChanged) {
                $task->syncParentCompletion();
            }
        });

        return new TaskResource($this->loadDetail($task->refresh()));
    }

    public function destroy(Task $task): Response
    {
        Gate::authorize('delete', $task);

        DB::transaction(function () use ($task) {
            $task->delete();
            // Deleting the last open subtask can complete the parent.
            $task->syncParentCompletion();
        });

        return response()->noContent();
    }

    /**
     * @return array<int|string, mixed>
     */
    private function counts(): array
    {
        return [
            'subtasks',
            'subtasks as done_subtasks_count' => fn (Builder $q) => $q->whereNotNull('completed_at'),
            'comments',
        ];
    }

    private function loadDetail(Task $task): Task
    {
        return $task->load(['project', 'assignees', 'subtasks.assignees', 'comments.user'])->loadCount($this->counts());
    }
}
