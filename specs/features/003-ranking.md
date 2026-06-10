# Feature 003 — Ranking

## User stories

- Como participante quiero ver el ranking general del torneo.
- Quiero ver el ranking de una fecha puntual (eligiendo entre las
  fechas ya jugadas).
- Quiero ver un gráfico de evolución que muestre cómo varían los
  puntos acumulados de cada usuario fecha a fecha.

## Páginas

`/ranking` con tres tabs:

- **General** (`/ranking`) — tabla con todos los usuarios.
- **Por fecha** (`/ranking/fecha`) — dropdown con las fechas jugadas +
  tabla del ranking de esa fecha.
- **Evolución** (`/ranking/evolucion`) — gráfico de líneas con los
  puntos acumulados por usuario fecha a fecha.

El layout (`app/ranking/layout.tsx`) hace `requireUser()` y renderiza
las tabs. Cada tab es un segmento aparte → pages independientes,
URL-shareables.

## Columnas en la tabla

| Pos | Nickname | Pts | Exactos | Ajustes (solo general) |
| --- | -------- | --- | ------- | ---------------------- |

- **Exactos**: cantidad de resultados exactos. Sirve como criterio
  de desempate y para que se vea.
- **Ajustes**: delta agregado del usuario. Solo se muestra en General;
  en por-fecha la columna se omite y los ajustes no impactan el
  cálculo (regla del reglamento: "los puntos impactarán únicamente en
  el Ranking General").

La fila del usuario logueado se destaca visualmente.

## Selector de fechas

- Lista solo fechas con al menos un partido `finished`. Hasta que el
  Mundial no arrancó, la página muestra empty state.
- Default: la fecha más reciente (la última de la lista).
- Selección persistida en `?round=N` para que sea linkeable.
- Las fechas reprogramadas (`originalRoundNumber` seteado) se
  contabilizan en su fecha original, no en la fecha movida — así un
  partido postergado no crea una "fecha fantasma" en el dropdown.

## Gráfico de evolución

- Eje X: nombre de la fecha jugada. Eje Y: puntos acumulados.
- Una línea por usuario, color asignado por orden (paleta fija
  inline tomada de tokens del YOY).
- Tooltip al hover con la fecha y los puntos de cada usuario en
  ese momento.
- Acumulado, no por fecha. El último punto de cada serie coincide con
  el total del Ranking General **sin ajustes** (los ajustes no entran
  en la evolución, mismo principio que el ranking por fecha).
- Vacío si todavía no se jugó nada.
- Implementado con `recharts` (`<LineChart>` + `<ResponsiveContainer>`).

## Cálculo: TS, no SQL

- Toda la lógica vive en `lib/ranking.ts` con funciones puras que
  reusan `score()` de `lib/scoring.ts`. Una sola fuente de verdad
  del algoritmo, sin duplicación SQL/TS.
- Con ~10 usuarios × 104 partidos no hay motivo para optimizar a SQL.
  El query es un `findMany()` por tabla en paralelo.
- Las funciones principales: `computeGeneralRanking`,
  `computeRoundRanking`, `getFinishedRounds`, `computeEvolution`.
- Desempate del general: `points DESC`, `exacts DESC`, `createdAt ASC`.

## Edge cases

- Sin usuarios registrados → tabla muestra mensaje vacío.
- Sin partidos jugados → empty state en `/ranking/fecha` y
  `/ranking/evolucion`.
- Usuario sin predicciones → aparece con 0 puntos.
- Match `status='finished'` sin score (no debería ocurrir, defensa):
  el partido se filtra silenciosamente, no rompe el cálculo.
