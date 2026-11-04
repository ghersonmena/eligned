<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProjectRequest;
use App\Http\Resources\ProjectResource;
use App\Models\Project;
use App\Models\Workspace;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

class ProjectController extends Controller
{
    public function index(Request $request, Workspace $workspace): AnonymousResourceCollection
    {
        Gate::authorize('view', $workspace);

        $projects = $workspace->projects()
            ->when(! $request->boolean('archived'), fn (Builder $q) => $q->whereNull('archived_at'))
            ->withCount([
                'tasks as open_tasks_count' => fn (Builder $q) => $q->whereNull('parent_id')->whereNull('completed_at'),
                'tasks as done_tasks_count' => fn (Builder $q) => $q->whereNull('parent_id')->whereNotNull('completed_at'),
            ])
            ->orderBy('name')
            ->get();

        return ProjectResource::collection($projects);
    }

    public function store(ProjectRequest $request, Workspace $workspace): ProjectResource
    {
        Gate::authorize('contribute', $workspace);

        $project = $workspace->projects()->create([
            ...$request->safe()->except('archived'),
            'created_by' => $request->user()->id,
        ]);

        return new ProjectResource($project);
    }

    public function show(Project $project): ProjectResource
    {
        Gate::authorize('view', $project);

        return new ProjectResource($project);
    }

    public function update(ProjectRequest $request, Project $project): ProjectResource
    {
        Gate::authorize('update', $project);

        $project->fill($request->safe()->except('archived'));
        if ($request->has('archived')) {
            $project->archived_at = $request->boolean('archived') ? ($project->archived_at ?? now()) : null;
        }
        $project->save();

        return new ProjectResource($project);
    }

    /** Deleting a project keeps its tasks; they just lose the project. */
    public function destroy(Project $project): Response
    {
        Gate::authorize('delete', $project);

        $project->delete();

        return response()->noContent();
    }
}
