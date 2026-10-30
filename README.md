# Todo Smart

> Nombre provisional. Aplicación de tareas para personas y equipos: lista, Kanban, calendario, cronograma (Gantt),
> recordatorios, registro de tiempo, metas y notificaciones. PWA para escritorio y celular; app móvil más adelante.

- Arquitectura y hoja de ruta: [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md)
- Licencia: [GNU AGPL-3.0](LICENSE)

## Estado

**Fase 0 · Base**: monorepo, Docker, API con inicio de sesión, PWA con tema claro / oscuro / sistema.

## Requisitos

- Docker con Docker Compose
- Para trabajar fuera de Docker (opcional): PHP 8.5 + Composer y Node 22

## Arranque en desarrollo

```sh
cp backend/.env.example backend/.env            # solo la primera vez
docker compose run --rm app composer install    # solo la primera vez
docker compose run --rm app php artisan key:generate
docker compose up -d
docker compose exec app php artisan migrate
```

Abre **<http://localhost:8090>** y crea tu cuenta.

| Servicio | Dirección |
| --- | --- |
| App (PWA + API vía nginx) | <http://localhost:8090> |
| API | <http://localhost:8090/api/v1> |
| Correos de prueba (Mailpit) | <http://localhost:8025> |
| PostgreSQL (para un cliente SQL) | `localhost:5433`, usuario y base `todo_smart`, contraseña `secret` |

Al registrarte llega un correo de confirmación: en desarrollo no sale a internet, lo ves en Mailpit.

**Desde el teléfono**: conéctalo a la misma red y abre `http://<IP-de-tu-PC>:8090` (la IP la ves con `hostname -I`).
Como es HTTP y no HTTPS, el navegador no permite instalarla como PWA ni recibir push; eso funciona en producción con HTTPS.

¿Puerto ocupado? Cambia `APP_PORT`, `DB_PORT` o `MAILPIT_PORT` en el entorno (y `APP_URL` / `SANCTUM_STATEFUL_DOMAINS` en `backend/.env`).

## Comandos útiles

```sh
# Backend
docker compose exec app ./vendor/bin/pest        # pruebas
docker compose exec app ./vendor/bin/pint        # formato
docker compose exec app php artisan migrate      # migraciones

# Frontend (dentro de frontend/)
npm test            # pruebas (Vitest)
npm run lint        # oxlint
npm run build       # tipos + build de producción con PWA
```

## Estructura

```text
backend/    API Laravel (PHP)
frontend/   PWA React + TypeScript (Vite)
docker/     Imágenes y configuración de nginx / PHP
docs/       Arquitectura y decisiones
```
