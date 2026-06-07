# Feature 004 — Admin

## User story

Como admin quiero administrar usuarios, ajustar puntos manualmente y
disparar los syncs.

## Acceso

- Ruta `/admin/*` protegida: si `users.role !== 'admin'` → 404 (no
  redirect; queremos que no se note la existencia).
- En layout se chequea el role server-side.

## Páginas

### `/admin/users`

- Tabla con todos los usuarios: nickname, email, role, created_at,
  total de predicciones, total de puntos.
- Acciones:
  - **Borrar usuario** (con confirmación double-click o modal).
    Server Action `deleteUser(userId)`. Cascade en `predictions` y
    `score_adjustments`.
  - Link a "ajustar puntos" → `/admin/users/[id]/adjust`.

### `/admin/users/[id]/adjust`

- Form: `points` (int, positivo o negativo), `reason` (text required).
- Server Action `adjustPoints(userId, points, reason)`:
  - inserta row en `score_adjustments` con `created_by = admin.id`.
  - revalida `/ranking`.
- Lista los ajustes previos del usuario para contexto.

### `/admin/sync`

- Dos botones:
  - "Sync fixtures" → llama route handler `/api/cron/sync-fixtures`
    con el header del cron secret.
  - "Sync resultados" → idem `/api/cron/sync-results`.
- Muestra el último timestamp de cada sync (lectura de `app_state` o
  log table — TBD).
- Output del último sync (cantidad de partidos creados/actualizados).

## Decisión: cómo se crea el primer admin

- Después del primer despliegue se loguea el primer usuario.
- Una migración manual (no commit) `UPDATE users SET role='admin' WHERE
email = 'gaston.bordet@modo.com.ar'`.

## Edge cases

- Admin se borra a sí mismo → bloquear en Server Action.
- Ajustar puntos a usuario inexistente → 404.
- Disparar sync mientras hay otro corriendo → idempotente (upsert).
