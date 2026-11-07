#!/bin/sh
# Caches config, routes and events from the mounted .env, then runs the command
# (php-fpm, the queue worker, the scheduler or Reverb).
set -e
php artisan config:cache --quiet
php artisan route:cache --quiet
php artisan event:cache --quiet
exec docker-php-entrypoint "$@"
