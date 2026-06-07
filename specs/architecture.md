# Arquitectura

## Vista general

```
                       ┌──────────────────────┐
                       │  football-data.org   │
                       │  (competition WC)    │
                       └──────────┬───────────┘
                                  │ 1x día (cron)
                                  ▼
   ┌──────────────────────────────────────────────────────┐
   │                  Next.js 16 (Vercel)                 │
   │                                                      │
   │  ┌──────────────┐   ┌──────────────┐  ┌───────────┐ │
   │  │  Pages /     │   │ Server       │  │ Vercel    │ │
   │  │  RSC         │◀─▶│ Actions      │  │ Cron API  │ │
   │  └──────┬───────┘   └──────┬───────┘  └─────┬─────┘ │
   │         │                  │                │        │
   │         └──────────────────┼────────────────┘        │
   │                            ▼                          │
   └──────────────────────┬──────────────────────────────┘
                          │ Drizzle ORM
                          ▼
                ┌─────────────────────┐
                │  Supabase Postgres  │
                │  + Supabase Auth    │
                └─────────────────────┘
```

## Capas

### Cliente (browser)

- React Server Components por defecto.
- Client Components solo donde hace falta interactividad (forms de
  pronóstico, selector de fecha en admin).
- Sin estado global cliente. El servidor es la fuente de verdad.

### Server (Next.js en Vercel)

- **Pages / RSC**: traen data via Drizzle, renderizan HTML.
- **Server Actions**: mutaciones (guardar pronóstico, nickname,
  ajuste de puntos, etc.). Validan input con Zod y reglas de
  autorización antes de tocar la DB.
- **Route Handlers** en `app/api/cron/*` para que Vercel Cron dispare
  los syncs. Protegidos por header `Authorization: Bearer $CRON_SECRET`.

### Datos (Supabase)

- Postgres normal. Drizzle maneja schema y queries.
- Supabase Auth para magic link. La tabla `users` espeja `auth.users`
  vía trigger o link manual (ver data-model).
- **No usamos Row Level Security en v1.** El acceso se valida en
  Server Actions con el `userId` del JWT de Supabase Auth. Cuando
  crezca el proyecto vale la pena migrar a RLS.

### Externos

- **football-data.org** — único proveedor de fixtures/resultados.
  Token en env var `FOOTBALL_DATA_TOKEN`. Competition code: `WC`.

## Flujos clave

### Registro

1. Usuario ingresa email en `/login`.
2. Server Action llama `supabase.auth.signInWithOtp({ email })`.
3. Supabase envía magic link.
4. Click → Next route handler de callback intercambia el código por
   sesión.
5. Si el usuario es nuevo (no existe en tabla `users`), redirige a
   `/onboarding` para elegir nickname.
6. Onboarding inserta row en `users` con el `id` = `auth.users.id`.

### Cargar pronóstico

1. Usuario ve `/` con los partidos de la fecha activa.
2. Form por partido (Server Action `submitPrediction(matchId, home,
away, penaltyWinner?)`).
3. Server Action:
   - autentica → obtiene `userId`
   - lee `match` por `id`
   - rechaza si `now >= match.kickoff_at` (lock)
   - upsert en `predictions` (UNIQUE en `user_id + match_id`)
4. Revalida `/` y `/ranking`.

### Sync diario

- Vercel Cron dispara `GET /api/cron/sync` a las 5am UTC.
- Handler:
  1. Valida `Authorization` header.
  2. Llama football-data.org `competitions/WC/matches`.
  3. Para cada match: upsert por `external_id`. Detecta reprogramaciones
     comparando `utcDate` con `kickoff_at` previo.
  4. Si tiene resultado final, actualiza `home_score`, `away_score`,
     `penalty_winner`, `status='finished'`.

### Cálculo de ranking

- Query SQL con CTEs que:
  1. Junta `predictions` + `matches` finalizados.
  2. Aplica la función de scoring (replicada como SQL CASE o llamada
     desde TS — ver `scoring.md`).
  3. Suma puntos + cuenta exactos por usuario.
  4. Suma ajustes de `score_adjustments`.
  5. Joins con `users`, orden con tiebreakers.

## Decisiones técnicas y por qué

- **Drizzle vs Prisma**: Drizzle gana por bundle size, cero cold start
  problemático en serverless, y queries SQL transparentes (clave para
  el query de ranking).
- **Sin RLS**: simplifica para v1, grupo cerrado y validación en
  Server Actions. Migrable después.
- **Puntos no persistidos**: se calculan en la query del ranking.
  Resultado oficial cambia → ranking refleja sin migraciones de datos.
- **Una sola "fecha activa"**: derivada (mín `round_number` con algún
  match `scheduled`), con override opcional en `app_state` para que el
  admin force.
- **Tailwind v4 sin shadcn**: el sistema tiene su propia paleta YOY
  (dark theme única), no necesitamos componentes "neutros" de shadcn.
