# Work breakdown

Plan de ejecución del MVP + progreso real.

## Estado actual (2026-06-10)

- **Production**: https://prode-vidrieras-reservas-m.vercel.app
- **GitHub**: https://github.com/gastonbordet-modo/prode-vidrieras
- **DB**: Supabase (linkeada vía Marketplace de Vercel; vars
  `POSTGRES_URL`, `NEXT_PUBLIC_SUPABASE_*` auto-inyectadas)
- **Cron**: `0 5 * * *` UTC en Vercel — `/api/cron/sync` (auth por
  `Authorization: Bearer ${CRON_SECRET}`)
- **Tests**: 76 verdes (`pnpm test`)
- **Mundial 2026**: 104 partidos cargados en `matches`; arrancó el **11/6**

### Pendientes operativos (no son código)

- [ ] Supabase → Authentication → URL Configuration: agregar
      `https://prode-vidrieras-reservas-m.vercel.app/auth/callback`
      al whitelist de Redirect URLs y setear Site URL.
- [ ] Una vez registrado el primer admin (Gastón), correr en
      Supabase SQL editor:
      `UPDATE users SET role='admin' WHERE email='gaston.bordet@modo.com.ar';`
- [ ] (Opcional) Custom domain en Vercel.
- [ ] Test E2E del registro con un email distinto al del admin.

### Próximo paso recomendado

**Fase 8 — Pulido pre-lanzamiento** (404 page, OG, etc.). El MVP está
feature-complete.

---

## Fase 0 — Setup ✅

- [x] Init pnpm, Next.js 16 (no 15), TS estricto, Tailwind v4, ESLint, Prettier
- [x] Configurar Tailwind con tokens del YOY (valores literales)
- [x] Fuente Hanken Grotesk via `next/font/google`
- [x] Configurar Drizzle + supabase-js + env.example
- [x] Configurar Vitest
- [x] Linkear proyecto a Vercel + Supabase Marketplace
- [x] Primer commit + push

## Fase 1 — Modelo y scoring (offline-testable) ✅

- [x] `db/schema.ts` con todas las tablas de `data-model.md`
- [x] Migración inicial generada y commiteada (`0000_tearful_cloak.sql`)
- [x] Migración 0001 agrega crests + group_name
- [x] `lib/scoring.ts` puro + `lib/scoring.test.ts` con los 14 casos
- [x] `lib/active-round.ts` + tests (8 casos)

## Fase 2 — Auth y onboarding (feature 001) ✅

- [x] `/login` con form de email + magic link
- [x] Server Action `requestMagicLink`
- [x] `/auth/callback` handler con `exchangeCodeForSession`
- [x] `/onboarding` con form de nickname
- [x] Server Action `setNickname` con validación Zod
- [x] `proxy.ts` (rename Next 16 de middleware) protege rutas

## Fase 3 — Predicciones (feature 002)

### 3a — Lectura ✅

- [x] `lib/active-round.ts` deriva la fecha activa
- [x] Home muestra partidos read-only con kickoff en zona AR (24h)
- [x] Escudos por equipo (crest URL de football-data)
- [x] Colores únicos por grupo (12 colores A..L) + backlight glow

### 3b — Form básico ✅

- [x] Server Action `submitPrediction` con lock por kickoff
- [x] `PredictionForm` con `useActionState`
- [x] **Iteración UX**: auto-save con debounce 1s, sin botón save,
      first-click + arranca en 1, auto-fill rival en 0, spinner
      overlay durante save, "✓ Guardado" cuando sincronizado.
- [x] NumberStepper custom con +/- (iconos lucide), sin spinners
      nativos del browser.

### 3c — Penales en eliminatorias ✅

- [x] Removido el lock de `knockout` en `lib/match-editable.ts`
- [x] `isPenaltyApplicable()` decide cuándo mostrar el picker (knockout
      + empate cargado en la predicción)
- [x] `lib/penalty-winner.ts` puro con `resolvePenaltyWinner()` +
      `deriveSideFromTeam()` (persistimos team name, no "home"/"away")
- [x] `submitPrediction` acepta `penaltyWinner` ("home"|"away"|null) y
      lo resuelve server-side
- [x] `PredictionForm` muestra dos botones cuando aplica + warning si
      no eligió + auto-save reactivo al cambio
- [x] Read-only de `MatchCard` muestra el ganador por penales si lo
      cargaste
- [x] `HistoryMatchCard` muestra el ganador por penales en la línea
      del pronóstico
- [x] 11 tests nuevos (4 de `isPenaltyApplicable`, 5+4 en `penalty-winner.test.ts`)

## Fase 4 — Ranking (feature 003) ✅

- [x] `/ranking` con tabs General / Por fecha / Evolución
- [x] `lib/ranking.ts` puro reusando `score()` (sin SQL — se descarta
      la dual-source TS/SQL de la spec original)
- [x] Tiebreaker: puntos desc → exactos desc → createdAt asc
- [x] Highlight de la fila del usuario logueado
- [x] Dropdown de fechas jugadas en `/ranking/fecha`
- [x] Gráfico de evolución acumulada con Recharts (`/ranking/evolucion`)
- [x] 13 tests nuevos en `lib/ranking.test.ts`
- [x] Link "Ranking" en header del home

## Fase 5 — Historial (feature 006) ✅

- [x] `/historial` con dropdown de fechas finalizadas
- [x] Reusa `getFinishedRounds` y `RoundSelect` (sin duplicar lógica)
- [x] `HistoryMatchCard` con predicción + resultado real + puntos
- [x] Chips de puntos diferenciados (Exacto / Ganador / parcial / 0)
- [x] Edge cases: match postponed, sin predicción, partido scheduled
- [x] `TeamDisplay` extraído de `MatchCard` para compartirlo
- [x] Link "Historial" en el header del home
- [x] Sin tests nuevos (UI sobre funciones puras ya testeadas)

## Fase 6 — Sync (feature 005) ✅

- [x] `lib/football-data.ts` cliente HTTP con Zod
- [x] Mapeos `mapMatch`, `deriveRound`, `mapStatus`, `derivePenaltyWinner`
- [x] `app/api/cron/sync/route.ts` con auth Bearer token
- [x] `vercel.json` con schedule diario `0 5 * * *`
- [x] Tests del mapeo (10 casos: REGULAR, EXTRA_TIME, PENALTY_SHOOTOUT,
      TBD, GROUP_STAGE, LAST_32 con formato 48 equipos, etc.)
- [x] Bulk upsert con `onConflictDoUpdate` (1 query, ~3s para 104 rows)

## Fase 7 — Admin (feature 004) ✅

- [x] `requireAdmin()` en `lib/auth.ts` con `notFound()` si no es admin
- [x] Layout `/admin/*` protegido + nav bar (Users / Sync / Volver)
- [x] `/admin/users` con tabla (nickname, email, role, alta, #pred, puntos)
      + borrar con confirm() nativo + cascade en FKs
- [x] `/admin/users/[id]/adjust` con form (Zod) + lista de ajustes previos
- [x] `/admin/sync` con botón "Sync ahora" + última corrida (timestamp +
      counts) leyendo de `app_state.last_sync`
- [x] `lib/user-stats.ts` (función pura) + 6 tests
- [x] `syncFromApi()` persiste `last_sync` en `app_state` (cron + manual
      lo comparten)
- [x] Link "Admin" en header del home sólo para `role='admin'`
- [x] Edge cases: admin no puede borrarse ni ajustarse a sí mismo
      (disabled + guard server-side)

## Fase 8 — Pulido pre-lanzamiento — pendiente

- [ ] Página 404 / error con estilo del tema
- [ ] Meta tags / OG image
- [ ] Custom domain (opcional)
- [ ] Probar el flujo completo E2E con un usuario "ajeno"

## Deuda técnica explícita (post-MVP)

- Notificaciones por mail antes de cada fecha
- Ver pronósticos del resto después del kickoff
- RLS en Supabase (hoy valido en Server Actions)
- Cache del query de ranking (hoy se calcula on the fly)
- Logo / branding propio
- Tests E2E con Playwright (hoy solo unit tests)
