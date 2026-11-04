<?php

namespace App\Http\Requests\Concerns;

use App\Models\Project;
use App\Models\Task;
use App\Models\Workspace;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Exists;

/**
 * Finds the workspace a request acts on (from the route) and builds rules that
 * only accept ids belonging to that workspace.
 */
trait ResolvesWorkspace
{
    protected function workspace(): Workspace
    {
        $route = $this->route();

        return match (true) {
            $route->parameter('workspace') instanceof Workspace => $route->parameter('workspace'),
            $route->parameter('task') instanceof Task => $route->parameter('task')->workspace,
            $route->parameter('project') instanceof Project => $route->parameter('project')->workspace,
        };
    }

    protected function projectInWorkspace(): Exists
    {
        return Rule::exists('projects', 'id')->where('workspace_id', $this->workspace()->id);
    }

    protected function statusInWorkspace(): Exists
    {
        return Rule::exists('task_statuses', 'id')->where('workspace_id', $this->workspace()->id);
    }

    protected function memberOfWorkspace(): Exists
    {
        return Rule::exists('user_workspace', 'user_id')->where('workspace_id', $this->workspace()->id);
    }
}
