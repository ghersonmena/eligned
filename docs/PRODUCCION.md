# Producción

eLigned corre en un servidor Linux con Docker, detrás de un túnel de Cloudflare: Cloudflare pone el HTTPS y llega al servidor por `127.0.0.1:8095`. No hace falta abrir puertos en el router.

| | |
|---|---|
| Dirección | <https://eligned.passme.dpdns.org> |
| Carpeta en el servidor | `~/Development/eligned` |
| Configuración y secretos | `~/Development/eligned/backend/.env` (solo lo lee tu usuario; nunca va a git) |
| Respaldos | `~/Development/eligned-respaldos` (diario a las 3:30, se guardan 14 días) |
| Túnel de Cloudflare | Public Hostname `eligned.passme.dpdns.org` → `HTTP` · `localhost:8095` |

## Qué corre

`docker-compose.prod.yml`, siempre a través de `scripts/prod`, que le pasa `backend/.env`:

- `web`: nginx con el frontend ya compilado (PWA). Envía `/api` a Laravel y `/app` a Reverb. Es el único publicado, y solo en `127.0.0.1`.
- `app`, `queue`, `scheduler`, `reverb`: la misma imagen de PHP con el código adentro.
- `postgres`, `redis`: solo accesibles dentro de Docker.
- Volúmenes: `eligned_postgres-data` (la base), `eligned_storage` (adjuntos y logs), `eligned_redis-data`.

## Actualizar a la última versión

```bash
cd ~/Development/eligned
scripts/deploy        # git pull, compila, reinicia y corre las migraciones
```

## Comandos útiles

```bash
scripts/prod ps                       # estado de los contenedores
scripts/prod logs -f app queue        # ver lo que pasa
scripts/prod exec app php artisan about
scripts/prod restart                  # tras cambiar backend/.env
scripts/backup                        # respaldo manual
```

## Restaurar un respaldo

```bash
cd ~/Development/eligned
scripts/backup                        # primero, respaldo de lo que hay ahora
scripts/prod stop app queue scheduler reverb
gunzip -c ~/Development/eligned-respaldos/eligned_FECHA.sql.gz \
  | scripts/prod exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d postgres -c "drop database \"$POSTGRES_DB\" with (force)" -c "create database \"$POSTGRES_DB\"" && psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -q'
scripts/prod start app queue scheduler reverb
scripts/prod exec -T app tar -C storage/app -xzf - < ~/Development/eligned-respaldos/archivos_FECHA.tar.gz
```

## Instalar en un servidor nuevo

1. `git clone https://github.com/ghersonmena/eligned.git ~/Development/eligned`
2. Crear `backend/.env` a partir de `backend/.env.example`, con `chmod 600`. Valores de producción: `APP_ENV=production`, `APP_DEBUG=false`, `APP_URL=https://<dominio>`, `SANCTUM_STATEFUL_DOMAINS=<dominio>`, `SESSION_SECURE_COOKIE=true`, `DB_HOST=postgres`, `REDIS_HOST=redis`, `REVERB_HOST=reverb`, y contraseñas y claves nuevas (`APP_KEY`, `DB_PASSWORD`, `REVERB_APP_*`).
3. `scripts/prod up -d --build` y luego `scripts/prod exec app php artisan migrate --force`.
4. En Cloudflare, apuntar el dominio a `HTTP` · `localhost:8095`.
5. Programar el respaldo con `crontab -e`: `30 3 * * * $HOME/Development/eligned/scripts/backup >> $HOME/Development/eligned-respaldos/respaldo.log 2>&1`
