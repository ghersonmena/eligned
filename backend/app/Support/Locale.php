<?php

namespace App\Support;

use Closure;

/** Runs a piece of code in another language (e.g. the text of a notification, in its recipient's). */
class Locale
{
    /**
     * @template T
     *
     * @param  Closure(): T  $callback
     * @return T
     */
    public static function run(string $locale, Closure $callback): mixed
    {
        $original = app()->getLocale();
        app()->setLocale($locale);
        try {
            return $callback();
        } finally {
            app()->setLocale($original);
        }
    }
}
