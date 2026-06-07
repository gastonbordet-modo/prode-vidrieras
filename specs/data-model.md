# Data model

Schema en Drizzle (`db/schema.ts`). Estos types son la fuente de verdad;
los listados acá son la **vista lógica**.

## Tablas

### `users`

Espeja `auth.users` de Supabase. Una row por usuario que completó
onboarding.

| columna      | tipo          | notas                                              |
| ------------ | ------------- | -------------------------------------------------- |
| `id`         | `uuid` PK     | = `auth.users.id`                                  |
| `email`      | `text` UNIQUE | desde Supabase Auth                                |
| `nickname`   | `text` UNIQUE | público, requerido, 3-20 chars, `^[a-zA-Z0-9_-]+$` |
| `role`       | `text`        | `'user'` (default) \| `'admin'`                    |
| `created_at` | `timestamptz` | 3er desempate del ranking                          |

### `matches`

Una row por partido del Mundial. Source-of-truth = football-data.org.

| columna                 | tipo            | notas                                                                  |
| ----------------------- | --------------- | ---------------------------------------------------------------------- |
| `id`                    | `serial` PK     | id interno                                                             |
| `external_id`           | `int` UNIQUE    | id en football-data.org                                                |
| `round_number`          | `int`           | 1..N, 1-3 grupos, 4=octavos, 5=cuartos, 6=semi, 7=tercer, 8=final      |
| `round_name`            | `text`          | "Fase de grupos - Fecha 1", "Octavos", etc.                            |
| `is_knockout`           | `boolean`       | true a partir de octavos                                               |
| `home_team`             | `text`          | nombre corto, ej. "Argentina"                                          |
| `away_team`             | `text`          |                                                                        |
| `kickoff_at`            | `timestamptz`   | horario oficial; sirve para el lock de pronóstico                      |
| `home_score`            | `int` nullable  | null hasta `status='finished'`                                         |
| `away_score`            | `int` nullable  |                                                                        |
| `penalty_winner`        | `text` nullable | nombre del equipo que ganó por penales, solo si `is_knockout` + empate |
| `status`                | `text`          | `'scheduled' \| 'live' \| 'finished' \| 'postponed'`                   |
| `original_round_number` | `int` nullable  | si fue reprogramado, la ronda original (ver regla del reglamento)      |
| `updated_at`            | `timestamptz`   | tocado por el sync                                                     |

### `predictions`

Una row por (usuario, partido).

| columna          | tipo             | notas                                                    |
| ---------------- | ---------------- | -------------------------------------------------------- |
| `id`             | `serial` PK      |                                                          |
| `user_id`        | `uuid` FK→users  |                                                          |
| `match_id`       | `int` FK→matches |                                                          |
| `home_score`     | `int`            | >=0                                                      |
| `away_score`     | `int`            | >=0                                                      |
| `penalty_winner` | `text` nullable  | solo seteable si match `is_knockout` y predict es empate |
| `updated_at`     | `timestamptz`    |                                                          |
| **UNIQUE**       |                  | `(user_id, match_id)`                                    |

### `score_adjustments`

Ajustes manuales del admin. Suman/restan al total computado.

| columna      | tipo            | notas              |
| ------------ | --------------- | ------------------ |
| `id`         | `serial` PK     |                    |
| `user_id`    | `uuid` FK→users | target del ajuste  |
| `points`     | `int`           | puede ser negativo |
| `reason`     | `text`          | requerido, libre   |
| `created_by` | `uuid` FK→users | admin que lo hizo  |
| `created_at` | `timestamptz`   |                    |

### `app_state`

Key-value para configuración runtime. Una sola row con `key='active_round_override'`
opcionalmente.

| columna      | tipo          | notas                         |
| ------------ | ------------- | ----------------------------- |
| `key`        | `text` PK     | ej. `'active_round_override'` |
| `value`      | `text`        |                               |
| `updated_at` | `timestamptz` |                               |

## Índices

- `predictions(match_id)` — para consultas de ranking por partido.
- `predictions(user_id)` — para el "mis pronósticos".
- `matches(round_number)` — para listar fecha activa.
- `matches(kickoff_at)` — para derivar fecha activa por proximidad.

## Relaciones

```
users 1──N predictions N──1 matches
users 1──N score_adjustments
users 1──N score_adjustments (como created_by)
```

## Reglas de integridad

- `predictions.penalty_winner` solo puede setearse si:
  - el match referenciado tiene `is_knockout = true`
  - `home_score = away_score` en la predicción
  - (validado en Server Action, no constraint SQL)
- `matches.penalty_winner` solo se setea si:
  - `is_knockout = true`
  - `home_score = away_score`
- Eliminar un `user` debe cascadear sus `predictions` y `score_adjustments`.
  Su mail vuelve a estar libre para re-registro.

## Fecha activa: cómo se deriva

Función en `lib/active-round.ts`:

```
1. Si app_state.active_round_override existe → devolver ese valor.
2. Si no, devolver el min(round_number) de matches con
   status IN ('scheduled', 'live').
3. Si todos están finished → devolver el último round_number (torneo
   terminado, mostramos modo "post-mortem").
```

## Migraciones

Generadas con `drizzle-kit generate` y aplicadas con `drizzle-kit migrate`.
Viven en `db/migrations/`. Se commitean al repo.
