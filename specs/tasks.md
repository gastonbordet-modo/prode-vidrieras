# Work breakdown

Plan de ejecución del MVP + progreso real.

## Estado actual (2026-06-07)

- **Production**: https://prode-vidrieras-reservas-m.vercel.app
- **GitHub**: https://github.com/gastonbordet-modo/prode-vidrieras
- **DB**: Supabase (linkeada vía Marketplace de Vercel; vars
  `POSTGRES_URL`, `NEXT_PUBLIC_SUPABASE_*` auto-inyectadas)
- **Cron**: `0 5 * * *` UTC en Vercel — `/api/cron/sync` (auth por
  `Authorization: Bearer ${CRON_SECRET}`)
- **Tests**: 37 verdes (`pnpm test`)
- **Mundial 2026**: 104 partidos cargados en `matches`; arranca el
  **11/6** (en 4 días)

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

**Fase 7 — Admin**. Permite moderar mientras el equipo se registra
(borrar usuarios, ajustes manuales de puntos, sync manual de
fixtures/resultados). Ver criterios de priorización abajo.

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

### 3c — Penales en eliminatorias (pendiente)

- [ ] Si `is_knockout` + predicción empate → select "ganador por penales"
- [ ] Server Action acepta y valida `penaltyWinner`
- [ ] Resolver "home"/"away" al nombre real del equipo en server
- [ ] Tests de validación
- **Deadline**: antes del 28/6 (arranque de eliminatorias)

## Fase 4 — Ranking (feature 003) — pendiente

- [ ] `/ranking` con tabs General / Fecha
- [ ] Query SQL del ranking con tiebreakers (puntos, exactos,
      created_at)
- [ ] Test de paridad TS vs SQL del scoring (14 casos por ambos)
- [ ] Indicador visual de "tu posición" en el ranking
- **Útil a partir del 11/6** (cuando haya partidos finalizados)

## Fase 5 — Historial — pendiente

- [ ] `/historial` con fechas pasadas, navegación entre fechas
- [ ] Desglose por partido: mi predicción vs resultado real
- [ ] Puntos obtenidos por partido (usando `lib/scoring.ts`)
- **Útil a partir del 14/6** (cuando haya 2+ fechas jugadas)

## Fase 6 — Sync (feature 005) ✅

- [x] `lib/football-data.ts` cliente HTTP con Zod
- [x] Mapeos `mapMatch`, `deriveRound`, `mapStatus`, `derivePenaltyWinner`
- [x] `app/api/cron/sync/route.ts` con auth Bearer token
- [x] `vercel.json` con schedule diario `0 5 * * *`
- [x] Tests del mapeo (10 casos: REGULAR, EXTRA_TIME, PENALTY_SHOOTOUT,
      TBD, GROUP_STAGE, LAST_32 con formato 48 equipos, etc.)
- [x] Bulk upsert con `onConflictDoUpdate` (1 query, ~3s para 104 rows)

## Fase 7 — Admin (feature 004) — pendiente

- [ ] Layout `/admin/*` protegido por `role='admin'` (404 si no es admin)
- [ ] `/admin/users` lista usuarios con borrar
- [ ] `/admin/users/[id]/adjust` form de ajuste de puntos
- [ ] `/admin/sync` con botones "Sync ahora"
- [ ] Pequeño dashboard: última corrida del cron, total predictions, etc.

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
