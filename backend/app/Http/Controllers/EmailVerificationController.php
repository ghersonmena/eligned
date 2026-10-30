<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class EmailVerificationController extends Controller
{
    /**
     * Link from the email. It works without a session (e.g. opened on another
     * device) and always lands back in the SPA with the result in the query.
     */
    public function verify(Request $request, int $id, string $hash): RedirectResponse
    {
        $user = User::find($id);

        if (! $request->hasValidSignature() || ! $user || ! hash_equals(sha1($user->getEmailForVerification()), $hash)) {
            return redirect('/?correo=enlace-invalido');
        }

        if (! $user->hasVerifiedEmail()) {
            $user->markEmailAsVerified();
            event(new Verified($user));
        }

        return redirect('/?correo=verificado');
    }

    public function resend(Request $request): Response
    {
        $user = $request->user();

        if ($user->hasVerifiedEmail()) {
            return response()->noContent();
        }

        $user->sendEmailVerificationNotification();

        return response()->noContent(202);
    }
}
