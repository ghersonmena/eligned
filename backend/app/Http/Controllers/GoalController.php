<?php

namespace App\Http\Controllers;

use App\Http\Resources\GoalResource;
use App\Http\Resources\KeyResultResource;
use App\Models\Goal;
use App\Models\KeyResult;
use App\Models\Project;
use App\Models\Workspace;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

/** Goals ("metas") and their key results. Members edit them; guests only look. */
class GoalController extends Controller
{
    private const WITH = ['owner:id,name', 'keyResults.project:id,name,color'];

    public function index(Request $request, Workspace $workspace): AnonymousResourceCollection
    {
        Gate::authorize('view', $workspace);
        $closed = $request->boolean('closed');

        $goals = $workspace->goals()
            ->when($closed, fn ($q) => $q->whereNotNull('closed_at'), fn ($q) => $q->whereNull('closed_at'))
            ->with(self::WITH)
            ->orderByRaw('due_date is null, due_date')
            ->orderBy('id')
            ->get();

        return GoalResource::collection($goals);
    }

    public function store(Request $request, Workspace $workspace): GoalResource
    {
        Gate::authorize('contribute', $workspace);
        $data = $this->validateGoal($request, $workspace, creating: true);

        $goal = Goal::create($data + ['workspace_id' => $workspace->id, 'created_by' => $request->user()->id]);

        return new GoalResource($goal->load(self::WITH));
    }

    public function show(Goal $goal): GoalResource
    {
        Gate::authorize('view', $goal->workspace);

        return new GoalResource($goal->load(self::WITH));
    }

    public function update(Request $request, Goal $goal): GoalResource
    {
        Gate::authorize('contribute', $goal->workspace);
        $data = $this->validateGoal($request, $goal->workspace, creating: false);
        if (array_key_exists('closed', $data)) {
            $data['closed_at'] = $data['closed'] ? ($goal->closed_at ?? now()) : null;
            unset($data['closed']);
        }
        $goal->update($data);

        return new GoalResource($goal->load(self::WITH));
    }

    public function destroy(Goal $goal): Response
    {
        Gate::authorize('contribute', $goal->workspace);
        $goal->delete();

        return response()->noContent();
    }

    public function storeKeyResult(Request $request, Goal $goal): KeyResultResource
    {
        Gate::authorize('contribute', $goal->workspace);
        $data = $this->validateKeyResult($request, $goal, creating: true);
        $data['position'] = (int) $goal->keyResults()->max('position') + 1;

        return new KeyResultResource($goal->keyResults()->create($data)->load('project'));
    }

    public function updateKeyResult(Request $request, KeyResult $keyResult): KeyResultResource
    {
        Gate::authorize('contribute', $keyResult->goal->workspace);
        $keyResult->update($this->validateKeyResult($request, $keyResult->goal, creating: false, current: $keyResult));

        return new KeyResultResource($keyResult->load('project'));
    }

    public function destroyKeyResult(KeyResult $keyResult): Response
    {
        Gate::authorize('contribute', $keyResult->goal->workspace);
        $keyResult->delete();

        return response()->noContent();
    }

    /**
     * @return array<string, mixed>
     */
    private function validateGoal(Request $request, Workspace $workspace, bool $creating): array
    {
        return $request->validate([
            'title' => [$creating ? 'required' : 'sometimes', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'color' => ['sometimes', Rule::in(Project::COLORS)],
            'owner_id' => ['sometimes', 'nullable', 'integer', fn ($a, $v, $fail) => $v === null
                || $workspace->members()->whereKey($v)->exists() || $fail('Esa persona no es parte del espacio.')],
            'start_date' => ['sometimes', 'nullable', 'date'],
            'due_date' => ['sometimes', 'nullable', 'date', 'after_or_equal:start_date'],
            'closed' => ['sometimes', 'boolean'],
        ], ['due_date.after_or_equal' => 'La fecha límite no puede ser antes del inicio.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function validateKeyResult(Request $request, Goal $goal, bool $creating, ?KeyResult $current = null): array
    {
        $kind = $request->input('kind', $current->kind ?? 'number');
        $data = $request->validate([
            'title' => [$creating ? 'required' : 'sometimes', 'string', 'max:255'],
            'kind' => [$creating ? 'required' : 'sometimes', Rule::in(KeyResult::KINDS)],
            'start_value' => ['sometimes', 'numeric', 'between:-999999999,999999999'],
            'target_value' => ['sometimes', 'numeric', 'between:-999999999,999999999'],
            'current_value' => ['sometimes', 'numeric', 'between:-999999999,999999999'],
            'unit' => ['sometimes', 'nullable', 'string', 'max:30'],
            'project_id' => [
                Rule::requiredIf($kind === 'tasks' && ($creating || $request->has('kind'))),
                'nullable',
                'integer',
                Rule::exists('projects', 'id')->where('workspace_id', $goal->workspace_id),
            ],
        ], ['project_id.required' => 'Elige el proyecto cuyas tareas miden este resultado.']);

        // A new number result starts where it begins.
        if ($creating && $kind === 'number' && ! array_key_exists('current_value', $data)) {
            $data['current_value'] = $data['start_value'] ?? 0;
        }

        return $data;
    }
}
