<?php

namespace App\Http\Controllers;

use App\Http\Resources\MemberResource;
use App\Http\Resources\TaskStatusResource;
use App\Models\Workspace;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class WorkspaceController extends Controller
{
    public function statuses(Workspace $workspace): AnonymousResourceCollection
    {
        Gate::authorize('view', $workspace);

        return TaskStatusResource::collection($workspace->statuses);
    }

    public function members(Workspace $workspace): AnonymousResourceCollection
    {
        Gate::authorize('view', $workspace);

        return MemberResource::collection($workspace->members()->orderBy('name')->get());
    }
}
