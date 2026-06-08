# prode-vidrieras

Prode interno para el Mundial 2026 — equipo Vidrieras (Modo).

Aplicación web pública para un grupo acotado (~10 personas) donde cada
participante pronostica los partidos del Mundial y compite en un ranking
único.

- **Production**: https://prode-vidrieras-reservas-m.vercel.app
- **DB**: Supabase Postgres (Vercel Marketplace integration)
- **Cron**: 1×/día `0 5 * * *` UTC

## Empezando en una conversación nueva

Si abrís una nueva sesión con Claude, leé en este orden:

1. [`specs/tasks.md`](./specs/tasks.md) — estado actual, qué está
   deployado, qué falta, próximos pasos recomendados.
2. [`specs/constitution.md`](./specs/constitution.md) — stack y
   principios no-negociables.
3. [`specs/prd.md`](./specs/prd.md) — qué construimos y por qué.
4. Spec de la feature que vas a tocar (`specs/features/00N-*.md`).

## Documentación

Este repo sigue **Spec-Driven Development**. Antes de tocar código se
escriben specs. Si lo que vas a hacer no está reflejado en `/specs`,
actualizá las specs primero.

- [`specs/constitution.md`](./specs/constitution.md) — principios y stack
  no-negociables
- [`specs/prd.md`](./specs/prd.md) — qué construimos y por qué
- [`specs/architecture.md`](./specs/architecture.md) — arquitectura
  técnica
- [`specs/data-model.md`](./specs/data-model.md) — schema de datos
- [`specs/scoring.md`](./specs/scoring.md) — algoritmo de puntaje (con
  casos de prueba del reglamento)
- [`specs/features/`](./specs/features/) — specs por feature
- [`specs/tasks.md`](./specs/tasks.md) — work breakdown

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Drizzle
ORM · Supabase (Postgres + Auth) · Vitest · ESLint + Prettier · Vercel.

## Setup

```bash
pnpm install
cp .env.example .env.local   # completá las vars de Supabase
pnpm db:generate              # genera migraciones desde el schema
pnpm db:migrate               # aplica migraciones a la DB
pnpm dev
```

## Scripts

| Script             | Qué hace                                      |
| ------------------ | --------------------------------------------- |
| `pnpm dev`         | Next dev server en `localhost:3000`           |
| `pnpm build`       | Build de producción                           |
| `pnpm start`       | Sirve el build                                |
| `pnpm test`        | Corre Vitest (tests del scoring son críticos) |
| `pnpm lint`        | ESLint                                        |
| `pnpm format`      | Prettier write                                |
| `pnpm db:generate` | Genera migración SQL desde el schema Drizzle  |
| `pnpm db:migrate`  | Aplica migraciones pendientes                 |
| `pnpm db:studio`   | Drizzle Studio (browser DB inspector)         |
