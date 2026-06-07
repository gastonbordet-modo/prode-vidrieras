# Constitution

Principios no-negociables del proyecto. Si vas a romper alguno, primero
editá este documento y justificá.

## Metodología

- **Spec-Driven Development**. Las specs en `/specs` son la fuente de
  verdad. El código las implementa, no las contradice.
- Antes de codear una feature: confirmar que su spec existe y refleja la
  decisión. Si no existe, escribirla primero.
- Si durante la implementación se descubre algo que cambia la spec,
  actualizar la spec en el mismo PR.

## Stack

- Runtime: **Node 22 LTS**
- Package manager: **pnpm**
- Framework: **Next.js 16** App Router, React 19
- Lenguaje: **TypeScript estricto** (`"strict": true`, sin `any`
  implícito)
- Estilos: **Tailwind CSS v4** con tokens del JSON YOY (sin shadcn)
- Fuente: **Hanken Grotesk** via `next/font/local` o Google Fonts
  (fallback gratuito de Galano Grotesque)
- DB: **Postgres** vía Supabase
- ORM: **Drizzle ORM** para queries y migraciones
- Auth: **Supabase Auth** con magic link
- Validación: **Zod** en bordes (Server Actions, env, payloads
  externos)
- Tests: **Vitest**
- Lint/format: **ESLint flat config + Prettier**
- Hosting: **Vercel Hobby**
- Fixtures API: **football-data.org** competition `WC` (Mundial 2026)

## Principios de código

- **No agregar lo que no se necesita.** Sin abstracciones especulativas,
  feature flags innecesarios, ni código defensivo para casos
  imposibles.
- **Validá en los bordes, no en el interior.** Server Actions y rutas de
  API validan input con Zod. Funciones internas confían en los tipos.
- **El scoring es código crítico.** Función pura, sin I/O, con tests
  unitarios cubriendo cada caso del reglamento.
- **Lock anti-trampa server-side.** El bloqueo de pronósticos por
  `kickoff_at` se valida siempre en el servidor, no se confía en el UI.
- **Una sola fuente de verdad por dato.** Los puntos no se persisten,
  se calculan. Si un resultado cambia, el recálculo es automático.
- **Comentarios solo cuando el "por qué" no es obvio.** Nombres
  expresivos antes que comentarios.

## Convenciones

- Rutas: kebab-case (`/mi-fecha`)
- Componentes: PascalCase, un componente por archivo si es no trivial
- Server Actions: archivo `actions.ts` colocado junto al feature
- Tipos compartidos: `lib/types.ts` o por feature
- Schema DB: `db/schema.ts` (Drizzle)
- Migraciones: `db/migrations/` generadas por `drizzle-kit`
- Tests: junto al archivo (`scoring.ts` + `scoring.test.ts`)

## Decisiones cerradas (no re-discutir sin actualizar este doc)

- **Un solo torneo, hardcoded:** Mundial 2026. No multi-tenant.
- **Registro abierto.** Cualquiera con el link se registra.
- **Nickname único** por usuario, separado del email, requerido en
  onboarding.
- **Cron 1x por día** para fixtures y resultados.
- **Solo la fecha activa visible.** Las anteriores son read-only en
  historial; las futuras no se muestran hasta que se vuelven activas.
- **Override de puntos por admin** vía tabla `score_adjustments`.
  No editar predicciones del usuario.
- **Sin shadcn.** Tailwind a mano siguiendo los tokens del YOY.
