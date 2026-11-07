<?php

namespace App\Http\Requests\Concerns;

use App\Models\Project;
use App\Models\Task;
use App\Models\Workspace;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Exists;
use Illuminate\Validation\Validator;

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

    /**
     * After-validation hook: a task can't start after it is due. Values not sent
     * in the request (partial updates) are taken from the task being edited.
     *
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [function (Validator $validator) {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }
            $task = $this->route('task');
            $current = $task instanceof Task && $this->isMethod('PATCH') ? $task : null;

            $start = $this->exists('start_at') ? $this->input('start_at') : $current?->start_at;
            $due = $this->exists('due_at') ? $this->input('due_at') : $current?->due_at;

            if ($start && $due && Carbon::parse($start)->greaterThan(Carbon::parse($due))) {
                $validator->errors()->add('start_at', __('La fecha de inicio no puede ser posterior a la fecha límite.'));
            }
        }];
    }
}
