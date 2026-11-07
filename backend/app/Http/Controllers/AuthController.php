<?php

namespace App\Http\Controllers;

use App\Actions\RegisterUser;
use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Creates the account but does not sign in: the user has to confirm the
     * email first and then log in.
     */
    public function register(RegisterRequest $request, RegisterUser $registerUser): JsonResponse
    {
        $user = $registerUser->handle($request->validated());

        return response()->json([
            'message' => __('Cuenta creada. Revisa tu correo para confirmarla.'),
            'email' => $user->email,
        ], 201);
    }

    public function login(LoginRequest $request): UserResource|JsonResponse
    {
        $user = User::firstWhere('email', $request->string('email')->lower()->value());

        if (! $user || ! Hash::check($request->string('password')->value(), $user->password)) {
            throw ValidationException::withMessages([
                'email' => __('auth.failed'),
            ]);
        }

        if (! $user->hasVerifiedEmail()) {
            return response()->json([
                'message' => __('Confirma tu correo antes de iniciar sesión.'),
                'code' => 'email_unverified',
            ], 403);
        }

        Auth::guard('web')->login($user, $request->boolean('remember'));
        $request->session()->regenerate();

        return new UserResource($user->load('workspaces'));
    }

    public function logout(Request $request): Response
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->noContent();
    }
}
