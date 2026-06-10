# Feature 002 — Pronósticos de la fecha activa

## User story

Como participante quiero ver los partidos de la fecha activa y cargar
mi pronóstico para cada uno antes del kickoff.

## Página

- `/` — home protegida. Lista los partidos de la fecha activa.

## Layout (mobile-first)

- Header: nickname + link a ranking e historial.
- Bloque grande con el `round_name` (ej. "Fase de grupos - Fecha 2").
- Cards por partido:
  - equipos (banderas si las tenemos, si no nombre)
  - kickoff en hora local con zona AR
  - inputs de goles (home, away) — número, min 0
  - si `is_knockout` y `home == away`: aparece select "ganador por
    penales"
  - botón "Guardar" → Server Action
  - si `now >= kickoff_at`: card en modo read-only (con mi predicción
    si existía)

## Server Action: `submitPrediction`

```ts
const schema = z.object({
  matchId: z.number().int(),
  homeScore: z.number().int().min(0).max(20),
  awayScore: z.number().int().min(0).max(20),
  penaltyWinner: z.enum(["home", "away"]).nullable(),
});
```

Pasos:

1. `getUser()` desde Supabase. Si no hay usuario → throw.
2. Validar input con Zod.
3. `SELECT match WHERE id = matchId`.
4. Reglas de negocio:
   - `now < match.kickoff_at` (lock — vía `getLockReason`).
   - `penaltyWinner` se resuelve con `lib/penalty-winner.ts`:
     - Si `match.is_knockout` y `homeScore === awayScore` y el side está
       seteado → se persiste el **nombre del equipo** (no `"home"`/`"away"`).
     - Si no aplica (no knockout / no empate / side null) → se persiste
       `null`. No se rechaza: el form auto-guarda incluso sin elegir.
5. Upsert en `predictions` (UNIQUE en `user_id + match_id`). Sobreescribe
   `penalty_winner` con el valor resuelto, así cambiar 2-2 → 3-2 limpia
   el ganador por penales que ya no aplica.
6. `revalidatePath('/')`.

## Fecha activa

Ver `data-model.md` → función `lib/active-round.ts`. Si la query no
encuentra fecha activa (torneo no arrancó / terminó), la home muestra
mensaje informativo en lugar de form.

## Estado vacío

- Si no hay partidos en `matches` aún → "El torneo todavía no está
  cargado. Vuelve más tarde."
- Si el usuario completó onboarding pero la fecha activa ya está
  bloqueada (todos los partidos pasaron kickoff) → mostrar en
  read-only con mensaje "Esta fecha ya está cerrada, los resultados
  llegan después de cada partido."

## Edge cases

- Race condition: usuario hace submit a las `kickoff_at - 1s` y el
  request llega después → lock server-side rechaza. Mostrar error.
- Predicción con `homeScore = awayScore` pero match no knockout → no
  permitir penalty_winner (UI no lo muestra, server lo rechaza).
- Cambio de mente: el usuario re-submitea con valores diferentes →
  upsert reemplaza el `updated_at`.
