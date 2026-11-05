# Arquitectura técnica

> Estado: propuesta inicial (30 oct 2026). Nombre y logo de la app: pendientes.
> Bocetos de diseño (estilo "C2 · Cálida + mosaico"): https://claude.ai/artifact/1Lt1EYuqPfXKTqtASAHyTh

## 1. Objetivos que guían las decisiones

- **PWA primero**: usable en escritorio y celular desde el navegador, instalable, con notificaciones push.
- **App móvil después** con la misma base de código del frontend (Capacitor).
- **Auto-hospedable**: cualquiera puede montarla en su servidor con Docker; también habrá una instancia en la nube propia.
- **Open source** con posibilidad futura de un modelo de negocio (equipos en la nube).
- **Mantenible por una persona** con experiencia fuerte en PHP.
- **Integraciones como complementos** (la primera: GLPI), sin acoplar el núcleo a ellas.

## 2. Stack

| Capa | Tecnología | Por qué |
|---|---|---|
| Backend / API | **PHP 8.4+ con Laravel** (última versión estable) | El lenguaje que mejor conoces; Laravel trae colas, tareas programadas, notificaciones, autenticación y websockets oficiales. |
| Base de datos | **PostgreSQL** | Robusta, gratuita, buen soporte de JSON (preferencias, diseño del dashboard) y búsqueda de texto. |
| Caché y colas | **Redis** | Colas de trabajos (recordatorios, correos, push) y caché. |
| Tiempo real | **Laravel Reverb** | Servidor websockets oficial y auto-hospedable: actividad del equipo y notificaciones en vivo sin servicios de pago. |
| Autenticación | **Laravel Sanctum** | Sesión por cookie para la PWA y tokens para la app móvil. |
| Notificaciones push | **Web Push (VAPID)**, `laravel-notification-channels/webpush` | Funciona en la PWA sin Firebase. En móvil nativo se suma FCM/APNs vía Capacitor. |
| Documentación de la API | **Scramble** (OpenAPI generado desde Laravel) | Contrato de API siempre actualizado. |
| Frontend | **React + TypeScript + Vite** | Tipado estricto, ecosistema grande, compatible con Capacitor. |
| PWA | **vite-plugin-pwa** (Workbox) | Manifest, service worker, instalación y caché. |
| Datos en el cliente | **TanStack Query** | Caché, reintentos y actualizaciones optimistas (marcar tarea al instante). |
| Estado de interfaz | **Zustand** | Tema, filtros, panel abierto; simple y liviano. |
| Rutas | **React Router** | Estándar. |
| Tipos de la API | **openapi-typescript** | Genera los tipos TS desde el OpenAPI del backend; si cambia la API, TypeScript avisa. |
| Arrastrar y soltar | **dnd-kit** | Kanban y, más adelante, ordenar las tarjetas del inicio. |
| Gráficas | **Recharts** | Anillos de actividad, barras de carga del equipo. |
| Confeti | **canvas-confetti** | Respeta `prefers-reduced-motion` con `disableForReducedMotion`. |
| Idiomas | **i18next** | Español primero; inglés para la comunidad open source. |
| Móvil (fase final) | **Capacitor** | Empaqueta el mismo frontend como app Android/iOS. |

Calendario y Gantt: se construyen sobre componentes propios con el estilo de los bocetos. Si se necesita más potencia se evalúan librerías con licencia MIT (p. ej. FullCalendar estándar o Frappe Gantt) antes de agregarlas.

## 3. Estructura del repositorio (monorepo)

```
todo_smart/
├── backend/            # Laravel (API REST /api/v1, colas, scheduler, Reverb)
├── frontend/           # React + TS + Vite (PWA; luego Capacitor)
├── docker/             # Dockerfiles y configuración de nginx/php
├── docs/               # Arquitectura, guía de auto-hospedaje, decisiones
├── docker-compose.yml  # Desarrollo local
└── README.md
```

## 4. Contenedores (Docker Compose)

| Servicio | Función |
|---|---|
| `nginx` | Sirve el frontend compilado y redirige `/api` al backend. HTTPS en producción (obligatorio para PWA y push). |
| `app` | PHP-FPM con Laravel. |
| `queue` | Worker de colas (recordatorios, correos, push). |
| `scheduler` | `schedule:work`: revisa recordatorios y vencimientos cada minuto. |
| `reverb` | Websockets (puerto interno 8081, expuesto por nginx en `/app`). |
| `postgres` | Base de datos. |
| `redis` | Colas y caché. |
| `vite` | Solo en desarrollo, para recarga en caliente del frontend. |

En tu máquina no hace falta instalar extensiones de PHP para PostgreSQL: todo corre dentro de Docker.

## 5. Modelo de datos (primera versión)

Desde el día uno todo pertenece a un **espacio de trabajo** (`workspace`). Así la misma base sirve para:
- una instalación personal (un solo espacio),
- un equipo,
- la nube con muchas organizaciones separadas.

```
users ──< user_workspace >── workspaces            (rol: owner | admin | member | guest)
workspaces ──< projects ──< tasks
workspaces ──< task_statuses                        (columnas del Kanban configurables)
tasks ──< tasks (parent_id)                         (subtareas)
tasks >──< users        (task_assignees)
tasks >──< labels       (task_label)
tasks ──< comments      (con menciones @)
comments ──< comment_attachments (archivos en el disco privado, storage/app/private/attachments)
tasks ──< attachments
tasks ──< time_entries  (registro de tiempo: inicio, fin, duración, usuario)
tasks ──< reminders     (fecha de disparo, canal, enviado)
workspaces ──< workspace_invitations   (correo, rol, hash del token, vence)
workspaces ──< goals ──< key_results  (número: inicial / meta / actual; o tareas de un proyecto)
activity_log            (quién hizo qué y cuándo; alimenta el feed y el historial)
notifications           (notificaciones dentro de la app; tabla estándar de Laravel)
push_subscriptions      (navegadores/dispositivos suscritos a push)
user_preferences        (tema claro/oscuro/sistema, confeti on/off, diseño del inicio en JSON)
external_links          (vínculos con sistemas externos; p. ej. ticket GLPI ↔ tarea)
```

Campos clave de `tasks`: `title`, `description`, `status_id`, `priority` (1–3), `due_at`, `start_at` (para Gantt), `estimate_minutes`, `position` (orden en listas y de las subtareas dentro de su tarea), `board_position` (orden en su columna del Kanban), `completed_at`, `parent_id`, `project_id`, `created_by`.

## 6. API

- REST JSON bajo `/api/v1`, documentada automáticamente (OpenAPI).
- Recursos: `workspaces`, `projects`, `tasks`, `tasks/{id}/subtasks`, `comments`, `time-entries`, `reminders`, `goals`, `key-results`, `members`, `invitations`, `notifications`, `preferences`, `push-subscriptions`.
- Vistas (fase 2):
  - `GET workspaces/{id}/tasks` acepta `with_subtasks=1` (las subtareas vienen también como filas propias, con `parent: {id, title}`; lo usan tablero y calendario), `sort=position` (orden del Kanban, por `board_position`), `done_since` (oculta las completadas antes de esa fecha) y `from` + `to` (tareas cuyo intervalo inicio–fecha límite toca ese rango; para calendario y cronograma).
  - `POST tasks/{id}/move` con `status_id` y `position` (índice en la columna): mueve la tarjeta (tarea sin subtareas o subtarea; una tarea con subtareas no es tarjeta y devuelve 422) y renumera `board_position` de la columna sin tocar el orden de las subtareas dentro de su tarea. Soltarla en una columna "hecho" la completa; si era la última subtarea abierta, también se completa la tarea principal.
  - Regla: `start_at` no puede ser posterior a `due_at`. Las fechas de inicio son de día completo (00:00 local); las fechas límite sin hora, 23:59 local.
  - Regla: una tarea con subtareas fechadas toma sus fechas de ellas: inicio = la fecha más temprana de sus subtareas, límite = la más tardía. Se recalcula al crear, editar o borrar una subtarea; si se editan las fechas de la tarea principal, se vuelven a calcular. Sin subtareas fechadas, la tarea conserva sus propias fechas.
- Equipo y metas (fase 4):
  - Equipo: `PATCH workspaces/{id}` (nombre), `PATCH|DELETE workspaces/{id}/members/{user}` (rol, quitar o salir), `GET|POST workspaces/{id}/invitations`, `POST invitations/{id}/renew`, `DELETE invitations/{id}`. Público: `GET invitations/{token}`; con sesión: `POST invitations/{token}/accept` (solo con la cuenta del correo invitado). El token se guarda con hash y vence en 14 días; el correo es opcional (se puede compartir el enlace). El dueño nombra administradores; los administradores gestionan miembros e invitados; los invitados solo leen.
  - Espacio actual: preferencia `current_workspace_id` (selector en el menú de la cuenta).
  - `GET workspaces/{id}/workload?since=` (carga por persona) y `GET workspaces/{id}/summary?day_start=&week_start=` (mi día y semana, tarjeta Actividad).
  - Metas: `GET|POST workspaces/{id}/goals` (`?closed=1` para las cerradas), `GET|PATCH|DELETE goals/{id}`, `POST goals/{id}/key-results`, `PATCH|DELETE key-results/{id}`. Resultados clave numéricos o por tareas de un proyecto; la meta promedia su avance y calcula su estado (a tiempo, en riesgo, atrasada, lograda).
  - Inicio personalizable: preferencia `home_layout` (orden y tarjetas ocultas).
- Tiempo y avisos (fase 3):
  - `GET tasks/{id}/activity`: historial de la tarea (quién hizo qué y cuándo). Lo escribe un observador del modelo `Task` y, aparte, comentarios, asignaciones, subtareas y tiempo. Cada cambio de campo guarda `[antes, después]`; los cambios automáticos (por subtareas) llevan `reason: subtasks`.
  - Tiempo: `POST tasks/{id}/timer` inicia el cronómetro de esa tarea (puede haber varios corriendo a la vez; repetirlo no abre otro), `POST timer/stop` (con `task_id` detiene solo ese, sin él todos), `GET timer?since=` (cronómetros activos y minutos de hoy), `GET|POST tasks/{id}/time-entries` (registros y tiempo a mano), `DELETE time-entries/{id}` (solo su autor). Completar una tarea detiene su cronómetro. Las tareas traen `tracked_minutes`.
  - Comentarios: `POST tasks/{id}/comments` acepta texto y/o hasta 5 archivos de 10 MB (`attachments[]`, multipart: imágenes, PDF, Office, texto, ZIP). `GET attachments/{id}` los sirve solo a miembros del espacio (imágenes en línea, lo demás como descarga). Borrar el comentario borra sus archivos.
  - Notificaciones: `GET notifications` (últimas 50 + `unread_count`), `POST notifications/{id}/read`, `POST notifications/read-all`. Tipos: `reminder`, `due_soon`, `assigned`, `commented`.
  - Recordatorios: `GET|POST tasks/{id}/reminders` con `remind_at` (momento fijo) u `offset_minutes` (antes del vencimiento; se mueve si cambia la fecha límite), `DELETE reminders/{id}`.
  - Avisos automáticos (`alerts:send`, cada minuto): recordatorios vencidos y "vence pronto" según las preferencias de cada persona (`due_notice_minutes` para tareas con hora; `all_day_notice` + `all_day_notice_time` para las de todo el día, en su `timezone`). Cada aviso automático sale una vez por fecha límite (`task_alerts`).
  - Push: `POST push-subscriptions`, `POST push-subscriptions/delete`, `POST push-subscriptions/test`. Claves VAPID con `php artisan webpush:vapid`. `GET config` (público) entrega la clave de websockets y la clave pública de push.
- Permisos con **Policies** de Laravel por espacio de trabajo y rol.
- Tiempo real (Reverb, a través de nginx en `/app`; autorización en `POST /api/broadcasting/auth`):
  - Canal `private-workspace.{id}`, evento `changed` con `task_ids`: se emite una vez al final de cada petición que cambió tareas (sin incluir a la pestaña que hizo el cambio, vía `X-Socket-ID`); las pantallas abiertas vuelven a pedir sus datos.
  - Canal `private-App.Models.User.{id}`: cada notificación nueva (campana y aviso emergente).

## 7. Notificaciones y recordatorios

1. El `scheduler` revisa cada minuto los recordatorios y vencimientos pendientes.
2. Encola un trabajo por recordatorio en Redis.
3. El `queue` envía por los canales que el usuario tenga activos: dentro de la app (base de datos + Reverb, que muestra la ventana emergente), push (Web Push) y correo (resumen diario).

## 8. PWA y uso sin conexión

- **Fase 1**: la app se puede instalar, carga sin red y muestra los datos que ya tenía en caché.
- **Fase posterior**: crear y editar tareas sin conexión, con una cola de cambios que se sincroniza al volver la red.

## 9. Integración con GLPI (complemento, fase posterior)

- Módulo aparte dentro del backend (`app/Integrations/Glpi`), apagado por defecto.
- Se configura por espacio de trabajo con URL, `app_token` y `user_token` de la API REST de GLPI.
- Primeros casos: importar tickets como tareas, y crear proyectos o tareas en GLPI desde la app.
- La relación se guarda en `external_links`. La app nunca depende de GLPI para funcionar.

## 10. Calidad

- Backend: **Pest** (pruebas), **Larastan** (análisis estático), **Pint** (formato).
- Frontend: **Vitest** + Testing Library, **ESLint**, **Prettier**, TypeScript en modo estricto.
- Pruebas de punta a punta con **Playwright** (más adelante).
- CI con GitHub Actions: linters y pruebas en cada push.

## 11. Licencia (por decidir)

- **AGPL-3.0**: si alguien ofrece la app como servicio en la nube, debe publicar sus cambios. Protege un futuro modelo de negocio en la nube. Es la recomendada.
- **MIT**: máxima libertad de uso, incluido que otros la vendan cerrada.

## 12. Hoja de ruta

| Fase | Contenido |
|---|---|
| 0 · Base | Monorepo, Docker, Laravel + React funcionando, autenticación, CI, tema claro/oscuro/sistema. |
| 1 · Núcleo | Espacios, proyectos, tareas (lista), detalle, subtareas, comentarios, prioridades, confeti al completar. |
| 2 · Vistas | Kanban (arrastrar y soltar), calendario, cronograma (Gantt). |
| 3 · Tiempo y avisos | Registro de tiempo, recordatorios, notificaciones dentro de la app, push y emergentes, tiempo real. |
| 4 · Equipo y metas | Invitaciones y roles, carga del equipo, metas con resultados clave, dashboard e inicio personalizable. |
| 5 · Publicación | PWA sin conexión, inglés, guía de auto-hospedaje, primera versión open source. |
| 6 · Móvil | App Android/iOS con Capacitor y push nativo. |
| 7 · Complementos | Integración con GLPI. |
