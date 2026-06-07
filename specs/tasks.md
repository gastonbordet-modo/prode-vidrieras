# Work breakdown

Plan de ejecución del MVP. Marcar `[x]` cuando se cierra.

## Fase 0 — Setup

- [ ] Init pnpm, Next.js 15, TS estricto, Tailwind v4, ESLint, Prettier
- [ ] Configurar Tailwind con tokens del YOY
- [ ] Fuente Hanken Grotesk via `next/font/google`
- [ ] Configurar Drizzle + supabase-js + env.example
- [ ] Configurar Vitest
- [ ] Linkear proyecto a Vercel + Supabase Marketplace (manual una vez)
- [ ] Primer commit + push

## Fase 1 — Modelo y scoring (offline-testable)

- [ ] `db/schema.ts` con todas las tablas de `data-model.md`
- [ ] Migración inicial generada y commiteada
- [ ] `lib/scoring.ts` puro + `lib/scoring.test.ts` con los 14 casos de
      `scoring.md`
- [ ] `lib/active-round.ts` + tests

## Fase 2 — Auth y onboarding (feature 001)

- [ ] `/login` con form de email
- [ ] Server Action `requestMagicLink`
- [ ] `/auth/callback` handler
- [ ] `/onboarding` con form de nickname
- [ ] Server Action `setNickname` con validación Zod
- [ ] Middleware/redirect: usuarios sin nickname siempre a `/onboarding`

## Fase 3 — Predicciones (feature 002)

- [ ] `/` lista partidos de la fecha activa
- [ ] Componente `MatchPredictionCard` con form
- [ ] Server Action `submitPrediction` con lock por kickoff
- [ ] Estado vacío (torneo no arrancó / fecha cerrada)

## Fase 4 — Ranking (feature 003)

- [ ] `/ranking` con tabs General / Fecha
- [ ] Query SQL del ranking con tiebreakers
- [ ] Test de paridad TS vs SQL del scoring

## Fase 5 — Historial

- [ ] `/historial` con fechas pasadas
- [ ] Desglose por partido: predicción vs resultado, puntos

## Fase 6 — Sync (feature 005)

- [ ] `lib/football-data.ts` cliente HTTP
- [ ] Mapeos `mapMatch`, `deriveRoundNumber`, `mapStatus`, tests
- [ ] `app/api/cron/sync/route.ts` con auth por bearer token
- [ ] `vercel.json` con schedule diario
- [ ] Tests de la lógica de upsert (con fixtures mock)

## Fase 7 — Admin (feature 004)

- [ ] Layout protegido por role
- [ ] `/admin/users` con borrar
- [ ] `/admin/users/[id]/adjust` con form de ajuste
- [ ] `/admin/sync` con botones manuales

## Fase 8 — Pulido pre-lanzamiento

- [ ] Página 404 / error con estilo del tema
- [ ] Meta tags / OG
- [ ] Seed manual: convertir mi user en admin
- [ ] Probar el flujo completo end-to-end con un usuario falso

## Deuda técnica explícita (post-MVP)

- Notificaciones por mail antes de cada fecha
- Ver pronósticos del resto después del kickoff
- RLS en lugar de validar en Server Actions
- Cache del query de ranking (ahora se calcula on the fly)
- Logo / branding propio (más allá de los tokens YOY)
