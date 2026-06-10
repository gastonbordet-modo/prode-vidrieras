# Feature 006 — Historial personal

## User story

Como participante quiero volver a una fecha pasada y ver, partido por
partido, qué pronostiqué, cuál fue el resultado real y cuántos puntos
saqué. La vista es solo para mí, no editable.

## Página

- `/historial` — protegida, requiere usuario logueado.
- Dropdown con las fechas que ya tienen al menos un partido `finished`.
- Default: la fecha más reciente.
- Selección persistida en `?round=N` (URL linkeable).

## Layout

```
┌────────────────────────────────────────┐
│ Historial · [dropdown fecha]    Volver │
│                                        │
│ Fecha N · Total: X pts                 │
│                                        │
│ [HistoryMatchCard]                     │
│   GRUPO · kickoff · status             │
│   Argentina ─────────  2               │
│   Francia ───────────  1               │
│   Tu pronóstico: 2-1 · Exacto +12      │
│ ...                                    │
└────────────────────────────────────────┘
```

## Lógica de cálculo

- Reusa `score()` de `lib/scoring.ts` por partido finalizado.
- Reusa `getFinishedRounds()` de `lib/ranking.ts` para el listado de
  fechas. Esa función ya respeta `originalRoundNumber` (un partido
  postponed se computa en su fecha original).
- Total de la fecha = suma de puntos por partido (no incluye ajustes —
  los ajustes solo impactan en el ranking general, ver `003-ranking.md`).

## Estados por partido

| Caso                                        | Display                              |
| ------------------------------------------- | ------------------------------------ |
| Match `finished` + predicción + exacto      | "Tu pronóstico: X-Y · Exacto +12"    |
| Match `finished` + predicción + ganador     | "Tu pronóstico: X-Y · Ganador +N"    |
| Match `finished` + predicción + goles solo  | "Tu pronóstico: X-Y · +2"            |
| Match `finished` + predicción sin puntos    | "Tu pronóstico: X-Y · +0"            |
| Match `finished` + sin predicción           | "No cargaste pronóstico"             |
| Match `scheduled`/`postponed` + predicción  | "Tu pronóstico: X-Y · Aún sin jugar" |
| Match `scheduled`/`postponed` + sin pred    | "Aún sin jugarse"                    |

## Estados vacíos

- Sin fechas finalizadas → "Todavía no terminó ninguna fecha. Vení
  después del primer partido finalizado." (no dropdown, no cards)

## Penales en eliminatorias

- Pendiente Fase 3c. Hasta que esté:
  - El historial calcula puntos con `score()` que ya soporta el bonus
    de penales si el `match.penaltyWinner` y la `prediction.penaltyWinner`
    coinciden.
  - Como hoy las predicciones de eliminatoria no permiten cargar
    `penaltyWinner` (Fase 3c), el bonus será 0 hasta que esa fase
    se implemente. No es un bug del historial.

## Edge cases

- Match knockout con empate + penales → ver arriba.
- Predicción cargada pero el match no se jugó aún (postponed): se
  muestra la predicción + "Aún sin jugar". No se asignan puntos.
- Usuario sin ninguna predicción en la fecha: todas las cards dicen
  "No cargaste pronóstico", el total es 0.

## Decisiones cerradas

- **No editar predicciones desde el historial.** Está en
  `specs/constitution.md` ("No editar predicciones del usuario").
- **No mostrar predicciones del resto.** Eso es deuda técnica
  post-MVP listada en `tasks.md`.
