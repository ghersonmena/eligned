<?php

namespace App\Providers;

use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        VerifyEmail::toMailUsing(function (object $notifiable, string $url) {
            return (new MailMessage)
                ->subject('Confirma tu correo')
                ->greeting('¡Hola, '.$notifiable->name.'!')
                ->line('Gracias por crear tu cuenta. Confirma que este correo es tuyo para empezar a usar la app.')
                ->action('Confirmar mi correo', $url)
                ->line('El enlace vence en '.config('auth.verification.expire', 60).' minutos.')
                ->line('Si no creaste esta cuenta, ignora este mensaje.');
        });
    }
}
