<?php

namespace App\Http\Controllers;

use App\Http\Requests\ResendVerificationRequest;
use App\Models\User;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class EmailVerificationController extends Controller
{
    /**
     * Link from the email. It only confirms the address — it never signs the
     * user in — and sends them to the login screen with the result.
     */
    public function verify(Request $request, int $id, string $hash): RedirectResponse
    {
        $user = User::find($id);

        if (! $request->hasValidSignature() || ! $user || ! hash_equals(sha1($user->getEmailForVerification()), $hash)) {
            return redirect('/login?correo=enlace-invalido');
        }

        if (! $user->hasVerifiedEmail()) {
            $user->markEmailAsVerified();
            event(new Verified($user));
        }

        return redirect('/login?correo=verificado');
    }

    /**
     * Public: the user is not signed in yet. Always answers the same way so it
     * can't be used to find out which emails have an account.
     */
    public function resend(ResendVerificationRequest $request): Response
    {
        $user = User::firstWhere('email', $request->string('email')->lower()->value());

        if ($user && ! $user->hasVerifiedEmail()) {
            $user->sendEmailVerificationNotification();
        }

        return response()->noContent(202);
    }
}
