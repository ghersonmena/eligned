<?php

namespace App\Actions;

use App\Models\Reminder;
use App\Models\Task;
use App\Models\User;
use App\Notifications\TaskAlert;
use App\Support\Locale;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Runs every minute (scheduler): sends due reminders and the automatic
 * "vence pronto" alert. Returns how many notifications went out.
 */
class SendTaskAlerts
{
    /** Overdue tasks older than this don't get a late "vence pronto". */
    private const GRACE_MINUTES = 60;

    public function handle(?Carbon $now = null): int
    {
        $now ??= now();

        return $this->reminders($now) + $this->dueSoon($now);
    }

    private function reminders(Carbon $now): int
    {
        $sent = 0;
        Reminder::query()
            ->whereNull('sent_at')
            ->where('remind_at', '<=', $now)
            ->with(['task', 'user'])
            ->orderBy('id')
            ->each(function (Reminder $reminder) use ($now, &$sent) {
                $reminder->update(['sent_at' => $now]);
                $task = $reminder->task;
                if ($task->isCompleted()) {
                    return;
                }
                $user = $reminder->user;
                $body = Locale::run($user->preferredLocale(), fn () => $this->dueText($task, $user, $now) ?? __('Recordatorio'));
                $user->notify(TaskAlert::for('reminder', $task, $body));
                $sent++;
            });

        return $sent;
    }

    private function dueSoon(Carbon $now): int
    {
        $sent = 0;
        Task::query()
            ->whereNull('completed_at')
            ->whereNotNull('due_at')
            ->whereBetween('due_at', [$now->copy()->subMinutes(self::GRACE_MINUTES), $now->copy()->addDays(2)])
            ->with(['assignees', 'creator'])
            ->orderBy('id')
            ->each(function (Task $task) use ($now, &$sent) {
                foreach ($this->recipients($task) as $user) {
                    $at = $this->dueNoticeAt($task, $user);
                    if ($at === null || $now->lt($at)) {
                        continue;
                    }
                    $fresh = DB::table('task_alerts')->insertOrIgnore([
                        'task_id' => $task->id,
                        'user_id' => $user->id,
                        'kind' => 'due_soon',
                        'due_at' => $task->due_at,
                        'created_at' => $now,
                    ]);
                    if ($fresh) {
                        $body = Locale::run($user->preferredLocale(), fn () => $this->dueText($task, $user, $now));
                        $user->notify(TaskAlert::for('due_soon', $task, $body));
                        $sent++;
                    }
                }
            });

        return $sent;
    }

    /**
     * When this person wants the "vence pronto" alert, or null when they
     * turned it off. All-day tasks (due 23:59 their time) are announced that
     * morning at their chosen hour.
     */
    public function dueNoticeAt(Task $task, User $user): ?Carbon
    {
        $prefs = $user->resolvedPreferences();
        $local = $task->due_at->copy()->setTimezone($prefs['timezone']);

        if ($local->format('H:i') === '23:59') {
            if (! $prefs['all_day_notice']) {
                return null;
            }
            [$h, $m] = array_map('intval', explode(':', $prefs['all_day_notice_time']));

            return $local->copy()->setTime($h, $m)->utc();
        }

        if ($prefs['due_notice_minutes'] === null) {
            return null;
        }

        return $task->due_at->copy()->subMinutes((int) $prefs['due_notice_minutes']);
    }

    /** "Vence hoy", "Vence a las 10:00", "Venció hace 20 min"… in the person's timezone. */
    public function dueText(Task $task, User $user, Carbon $now): ?string
    {
        if (! $task->due_at) {
            return null;
        }
        $tz = $user->resolvedPreferences()['timezone'];
        $due = $task->due_at->copy()->setTimezone($tz);
        $today = $now->copy()->setTimezone($tz);
        $allDay = $due->format('H:i') === '23:59';

        if ($task->due_at->lt($now)) {
            return __('Venció :when', ['when' => $due->locale(app()->getLocale())->diffForHumans($now, ['parts' => 1, 'syntax' => Carbon::DIFF_RELATIVE_TO_NOW])]);
        }
        $day = match (true) {
            $due->isSameDay($today) => __('hoy'),
            $due->isSameDay($today->copy()->addDay()) => __('mañana'),
            default => __('el :date', ['date' => $due->locale(app()->getLocale())->translatedFormat(__('l j \d\e F'))]),
        };

        return $allDay ? __('Vence :day', ['day' => $day]) : __('Vence :day a las :time', ['day' => $day, 'time' => $due->format('H:i')]);
    }

    /**
     * Assignees, or whoever created the task when nobody is assigned.
     *
     * @return iterable<User>
     */
    private function recipients(Task $task): iterable
    {
        if ($task->assignees->isNotEmpty()) {
            return $task->assignees;
        }

        return $task->creator ? [$task->creator] : [];
    }
}
