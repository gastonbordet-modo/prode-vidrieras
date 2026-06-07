# Feature 005 — Sincronización con football-data.org

## Objetivo

Mantener `matches` actualizado con los fixtures y resultados oficiales
del Mundial 2026.

## Fuente

- **API**: football-data.org v4
- **Competition code**: `WC`
- **Endpoint principal**:
  `GET /v4/competitions/WC/matches?season=2026`
- **Auth**: header `X-Auth-Token: $FOOTBALL_DATA_TOKEN`
- **Rate limit**: 10 req/min en free tier (sobra para 1x/día).

## Mapeo del payload (campos relevantes)

Cada match en la respuesta tiene aproximadamente:

```json
{
  "id": 12345,
  "utcDate": "2026-06-11T18:00:00Z",
  "status": "SCHEDULED", // o TIMED, IN_PLAY, PAUSED, FINISHED, POSTPONED, SUSPENDED
  "stage": "GROUP_STAGE", // o LAST_16, QUARTER_FINALS, SEMI_FINALS, FINAL, THIRD_PLACE
  "matchday": 1, // 1-3 en grupos, null o stage en eliminatoria
  "homeTeam": { "name": "Argentina", "shortName": "ARG" },
  "awayTeam": { "name": "Francia", "shortName": "FRA" },
  "score": {
    "winner": "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null,
    "duration": "REGULAR" | "EXTRA_TIME" | "PENALTY_SHOOTOUT",
    "fullTime": { "home": 3, "away": 1 },
    "extraTime": { "home": null, "away": null },
    "penalties": { "home": 4, "away": 2 }
  }
}
```

## Función de mapeo

```ts
function mapMatch(raw: ApiMatch): MatchUpsert {
  const isKnockout = raw.stage !== "GROUP_STAGE";

  let homeScore: number | null = null;
  let awayScore: number | null = null;
  let penaltyWinner: string | null = null;

  if (raw.score.duration === "PENALTY_SHOOTOUT") {
    // El score "del partido" para nuestro scoring es 90/120 min, sin penales
    // football-data pone el score final con penales sumados en fullTime,
    // así que tomamos extraTime (que tiene el resultado al 120') o fallback
    homeScore = raw.score.extraTime?.home ?? raw.score.fullTime.home;
    awayScore = raw.score.extraTime?.away ?? raw.score.fullTime.away;
    // El ganador por penales
    penaltyWinner =
      raw.score.penalties.home > raw.score.penalties.away
        ? raw.homeTeam.name
        : raw.awayTeam.name;
  } else if (raw.status === "FINISHED") {
    homeScore = raw.score.fullTime.home;
    awayScore = raw.score.fullTime.away;
  }

  return {
    externalId: raw.id,
    roundNumber: deriveRoundNumber(raw.stage, raw.matchday),
    roundName: deriveRoundName(raw.stage, raw.matchday),
    isKnockout,
    homeTeam: raw.homeTeam.name,
    awayTeam: raw.awayTeam.name,
    kickoffAt: new Date(raw.utcDate),
    homeScore,
    awayScore,
    penaltyWinner,
    status: mapStatus(raw.status),
  };
}
```

### Derivación de `round_number`

```
GROUP_STAGE matchday=1 → 1
GROUP_STAGE matchday=2 → 2
GROUP_STAGE matchday=3 → 3
LAST_16                → 4
QUARTER_FINALS         → 5
SEMI_FINALS            → 6
THIRD_PLACE            → 7
FINAL                  → 8
```

### Mapeo de status

```
SCHEDULED, TIMED         → 'scheduled'
IN_PLAY, PAUSED          → 'live'
FINISHED                 → 'finished'
POSTPONED, SUSPENDED,
CANCELLED, AWARDED       → 'postponed'
```

## Lógica de upsert

```ts
async function syncMatches() {
  const res = await fetch(URL, { headers: { "X-Auth-Token": TOKEN } });
  const { matches } = await res.json();

  for (const raw of matches) {
    const mapped = mapMatch(raw);
    const existing = await db.query.matches.findFirst({
      where: eq(matches.externalId, mapped.externalId),
    });

    if (!existing) {
      await db.insert(matches).values(mapped);
    } else {
      // Detectar reprogramación: si el kickoff cambia a otro round_number
      // y el original ya pasó → setear original_round_number
      const reprogrammed =
        existing.roundNumber !== mapped.roundNumber &&
        existing.status !== "scheduled" &&
        existing.kickoffAt < new Date();

      await db
        .update(matches)
        .set({
          ...mapped,
          originalRoundNumber: reprogrammed
            ? (existing.originalRoundNumber ?? existing.roundNumber)
            : existing.originalRoundNumber,
          updatedAt: new Date(),
        })
        .where(eq(matches.id, existing.id));
    }
  }
}
```

## Schedule

- Vercel Cron en `vercel.json`:

  ```json
  {
    "crons": [{ "path": "/api/cron/sync", "schedule": "0 5 * * *" }]
  }
  ```

  Un solo cron que hace fixtures + resultados (mismo endpoint, mismo
  upsert). 5am UTC = 2am Argentina, después de que terminen todos los
  partidos del día.

## Autenticación del cron

- El handler exige `Authorization: Bearer $CRON_SECRET`.
- Vercel inyecta este header automáticamente si está en env vars y se
  llama desde Vercel Cron.
- Desde el admin panel hacemos un POST autenticado por la sesión del
  admin, no por el cron secret (separamos los caminos).

## Edge cases

- API down → log + status 500 → Vercel reintenta al día siguiente.
- Cambio de horario de un partido (kickoff_at) → upsert lo refleja, el
  lock se ajusta solo.
- Equipo "TBD" antes del sorteo final de octavos → guardar el nombre
  tal cual venga ("Winner of Group A" o lo que devuelva la API). El
  match queda en `scheduled` y se actualiza después.
- Un match aparece como `FINISHED` pero sin `fullTime` → no actualizar
  scores, log warning.
