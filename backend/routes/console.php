<?php

use App\Actions\SendTaskAlerts;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('alerts:send', function (SendTaskAlerts $alerts) {
    $sent = $alerts->handle();
    if ($sent) {
        $this->info("{$sent} avisos enviados.");
    }
})->purpose('Envía recordatorios y avisos de tareas por vencer');

Schedule::command('alerts:send')->everyMinute()->withoutOverlapping();
