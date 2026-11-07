<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Answers in the person's language: their saved choice, or (before signing in)
 * the browser's Accept-Language, which the app sets to the language on screen.
 */
class SetLocale
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = auth('sanctum')->user();
        app()->setLocale($user instanceof User
            ? $user->preferredLocale()
            : ($request->getPreferredLanguage(User::LOCALES) ?? config('app.locale')));

        return $next($request);
    }
}
