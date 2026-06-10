# Feature 004 — Admin

## User story

Como admin quiero administrar usuarios, ajustar puntos manualmente y
disparar el sync de fixtures/resultados.

## Acceso

- Ruta `/admin/*` protegida: si `users.role !== 'admin'` → 404 (no
  redirect; queremos que no se note la existencia).
- `lib/auth.ts` exporta `requireAdmin()`: capa fina arriba de
  `requireUser()` que llama a `notFound()` si el role no es admin.
- El `layout.tsx` de `/admin` invoca `requireAdmin()` y todos los
  Server Actions de admin también — defensa en profundidad.

## Páginas

### `/admin/users`

- Tabla con todos los usuarios: nickname, email, role, alta,
  total de predicciones, total de puntos (calculado con
  `lib/user-stats.ts:computeUserStats`).
- Acciones:
  - **Borrar usuario** con confirmación `confirm()` nativo del
    browser (el grupo es de ~10 personas; modal sería over-engineering).
    Server Action `deleteUser(userId)`. Cascade en `predictions` y
    `score_adjustments` por FK con `onDelete: cascade`.
  - Link "Ajustar" → `/admin/users/[id]/adjust`.
- El admin no puede borrarse a sí mismo (botón disabled + guard en
  Server Action).

### `/admin/users/[id]/adjust`

- Form: `points` (int -100..100, distinto de 0), `reason` (text,
  required, 3..200 chars).
- Server Action `adjustPoints(userId, points, reason)`:
  - inserta row en `score_adjustments` con `created_by = admin.id`.
  - revalida `/admin/users`, `/admin/users/[id]/adjust` y `/`.
- Lista los ajustes previos del usuario (ordenados por fecha desc),
  con el nickname del admin que los aplicó y el total acumulado.
- El admin no puede ajustarse puntos a sí mismo (form disabled +
  guard en Server Action).

### `/admin/sync`

- Un solo botón "Sync ahora" (la implementación unifica fixtures y
  resultados en `syncFromApi()` — ver Fase 6).
- Server Action `triggerManualSync()` llama directamente a
  `syncFromApi()`; no hace fetch HTTP a `/api/cron/sync` porque el
  Bearer secret es server-side.
- Muestra última corrida: timestamp y counts (`total`, `created`,
  `updated`, `reprogrammed`). Persistencia en `app_state` con
  `key='last_sync'` y `value` JSON; la escritura está dentro de
  `syncFromApi()` para que el cron y el botón manual la compartan.

## Decisión: cómo se crea el primer admin

- Después del primer despliegue se loguea el primer usuario.
- Una migración manual (no commit) `UPDATE users SET role='admin' WHERE
  email = 'gaston.bordet@modo.com.ar'`.

## Edge cases

- Admin se borra a sí mismo → bloqueado client-side (disabled) y
  server-side (Server Action devuelve error).
- Admin se ajusta puntos a sí mismo → idem.
- Ajustar puntos a usuario inexistente → 404.
- `points === 0` → rechazado por Zod.
- `reason` con menos de 3 chars trim → rechazado por Zod.
- Disparar sync mientras hay otro corriendo → idempotente (upsert).
