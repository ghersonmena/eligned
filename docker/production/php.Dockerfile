# Production PHP image: the code and its dependencies are baked in.
# Built from the repository root (see docker-compose.prod.yml).
FROM php:8.5-fpm-alpine

# Same user id as the server account, so the container can read the
# owner-only backend/.env that is mounted into it.
ARG UID=1000
ARG GID=1000

RUN apk add --no-cache icu-libs libpq libzip shadow \
    && apk add --no-cache --virtual .build-deps $PHPIZE_DEPS icu-dev libpq-dev libzip-dev linux-headers \
    && docker-php-ext-install -j"$(nproc)" bcmath intl pcntl pdo_pgsql zip \
    && pecl install redis \
    && docker-php-ext-enable redis \
    && apk del .build-deps \
    && usermod -u "$UID" www-data \
    && groupmod -g "$GID" www-data

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
COPY docker/php/php.ini /usr/local/etc/php/conf.d/zz-app.ini
COPY docker/production/opcache.ini /usr/local/etc/php/conf.d/zz-opcache.ini
COPY docker/production/php-entrypoint.sh /usr/local/bin/app-entrypoint

WORKDIR /var/www/html
ENV COMPOSER_ALLOW_SUPERUSER=1

# Dependencies first, so a code change doesn't reinstall them.
COPY backend/composer.json backend/composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --no-interaction --no-progress

COPY backend/ ./
RUN composer dump-autoload --optimize --no-dev --no-interaction \
    && chown -R www-data:www-data storage bootstrap/cache

USER www-data
ENTRYPOINT ["app-entrypoint"]
CMD ["php-fpm"]
