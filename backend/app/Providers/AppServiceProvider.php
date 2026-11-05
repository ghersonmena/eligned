<?php

namespace App\Providers;

use App\Support\LiveUpdates;
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
        $this->app->singleton(LiveUpdates::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Announce the changes of this request/command once it is done.
        $this->app->terminating(fn () => $this->app->make(LiveUpdates::class)->flush());

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
