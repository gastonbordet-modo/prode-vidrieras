# Work breakdown

Plan de ejecución del MVP + progreso real.

## Estado actual (2026-06-10)

- **Production**: https://prode-vidrieras-reservas-m.vercel.app
- **GitHub**: https://github.com/gastonbordet-modo/prode-vidrieras
- **DB**: Supabase (linkeada vía Marketplace de Vercel; vars
  `POSTGRES_URL`, `NEXT_PUBLIC_SUPABASE_*` auto-inyectadas)
- **Cron**: `0 5 * * *` UTC en Vercel — `/api/cron/sync` (auth por
  `Authorization: Bearer ${CRON_SECRET}`)
- **Tests**: 121 verdes (`pnpm test`)
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

MVP completo. Próxima tanda de features (sociales / interactividad)
specificadas en `specs/features/`:

1. **Fase 9 — Chat por fecha** (`007-chat.md`)
2. **Fase 10 — Tags de folklore** (`008-tags.md`)
3. **Fase 11 — Apuestas** (`009-bets.md`)

Orden sugerido: chat primero (habilita la chicana base), tags
después (100% lectura sobre datos existentes), apuestas al final (es
la más invasiva y se beneficia del chat).

**Estado**: Fase 9 (chat) ✅, Fase 11 (apuestas) ✅. Queda **Fase 10
(tags de folklore)**.

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

## Fase 8 — Pulido pre-lanzamiento ✅

- [x] `app/not-found.tsx` con estilo del tema
- [x] `app/error.tsx` con botón Reintentar + digest visible
- [x] `app/opengraph-image.tsx` dinámica 1200×630 con tokens del YOY
- [x] `app/icon.tsx` (favicon "PV" en fucsia, generado por code)
- [x] Metadata completa en `layout.tsx`: OG, Twitter card, themeColor,
      title template (`%s · Prode Vidrieras`), robots noindex (grupo
      privado), viewport
- [ ] Custom domain en Vercel (opcional, operativo)
- [ ] Test E2E del registro con un email distinto al del admin (operativo)

## Fase 9 — Chat por fecha (feature 007)

Ver `specs/features/007-chat.md`.

- [ ] Migración: tabla `chat_messages` (id, user_id, text, created_at)
- [ ] `/chat` con lista + form + auto-scroll + polling 5s
- [ ] Server Action `postChatMessage` con validación Zod (1..500)
- [ ] `/api/cron/clear-chat` con lógica de ventana 24h post-última-fecha
- [ ] Sumar schedule diario en `vercel.json`
- [ ] Botón "Limpiar chat ahora" en `/admin/sync`
- [ ] Link "Chat" en header del home

## Fase 10 — Tags de folklore (feature 008)

Ver `specs/features/008-tags.md`.

- [ ] `lib/tags.ts` puro con `computeTags()` + tests por tag
- [ ] `lib/tag-styles.ts` con paleta de 5 colores del theme + mapeo
- [ ] Componente `<TagChip>` con tooltip
- [ ] Integración en `/ranking`, `/historial`, `/chat`, header del home
- [ ] Tests: positivos + negativos por tag, regla de los 3 cupos,
      racha de Brujita, ranking Cebollita

## Fase 11 — Apuestas (feature 009) ✅

Ver `specs/features/009-bets.md`.

- [x] Migración: tablas `bets` y `bet_entries` con índices
      (`0003_yummy_kang.sql`)
- [x] `lib/bet-side.ts` puro (derivación pro/con + `outcomeFromScore`) +
      tests (9 combos)
- [x] `lib/bet-resolution.ts` puro (`decideBet`: 1X2 real con penales,
      lock, cancelación sin oponente, payout `floor(pot/winners)`, deltas
      netos, postponed=noop) + tests
- [x] `lib/bet-balance.ts` puro (`availableBalance`) + tests
- [x] Server Actions `createBet` y `joinBet` con todos los guards
- [x] `lib/bets.ts` `resolveFinishedBets()` integrada dentro de
      `syncFromApi()` (corre por cron y por sync manual del admin)
- [x] `/casino` con form de creación + lista con tabs (De la fecha /
      Mis apuestas / Histórico) + preview de payout + botón Sumarme
- [x] Reusar `score_adjustments` para impactar el ranking en cada
      resolución. **Decisión de contabilidad**: las apuestas open/locked
      solo "reservan" (no tocan el ranking); al resolver se escribe el
      DELTA NETO (ganador = `payout - amount`, perdedor = `-amount`),
      porque el stake nunca se descontó antes. El residuo de la división
      sale de la economía.
- [x] Mostrar balance disponible (ranking − comprometido) en `/casino`
- [x] Link "Apuestas" en `MainTabs`
- [x] 45 tests nuevos (bet-side, bet-resolution, bet-balance) — total 121

### Pendiente operativo (no es código)

- [ ] Aplicar la migración `0003_yummy_kang.sql` a Supabase
      (`pnpm db:migrate` con `DATABASE_URL` apuntando a prod, o aplicarla
      desde el SQL editor). Sin esto, `/casino` falla en prod.

## Deuda técnica explícita (post-MVP)

- Notificaciones por mail antes de cada fecha
- Ver pronósticos del resto después del kickoff (parcialmente cubierto
  por chat + apuestas — la gente va a decir lo que apostó)
- RLS en Supabase (hoy valido en Server Actions)
- Cache del query de ranking (hoy se calcula on the fly)
- Logo / branding propio
- Tests E2E con Playwright (hoy solo unit tests)
