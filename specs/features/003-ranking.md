# Feature 003 — Ranking

## User stories

- Como participante quiero ver el ranking general del torneo.
- Quiero ver también el ranking de la fecha activa.

## Páginas

- `/ranking` — pestañas (o secciones) "General" y "Fecha actual".

## Columnas mostradas

| Posición | Nickname | Puntos | Exactos | Ajustes |
| -------- | -------- | ------ | ------- | ------- |

- Exactos: cantidad de resultados exactos (sirve como criterio de
  desempate y para que se vea).
- Ajustes: si hubo, mostrar el delta agregado del usuario (con
  tooltip de motivos). Default 0.

## Query (ranking general)

Vista lógica del query (en SQL real con Drizzle):

```sql
WITH scored AS (
  SELECT
    p.user_id,
    -- aplicar función de scoring (CASE expression replicada)
    CASE
      WHEN p.home_score = m.home_score AND p.away_score = m.away_score
        THEN 12
        + CASE
            WHEN m.is_knockout
             AND m.home_score = m.away_score
             AND p.home_score = p.away_score
             AND p.penalty_winner IS NOT NULL
             AND p.penalty_winner = m.penalty_winner
            THEN 5 ELSE 0 END
      WHEN sign(p.home_score - p.away_score) = sign(m.home_score - m.away_score)
        AND ((p.home_score = m.home_score) <> (p.away_score = m.away_score))
        THEN 7
      WHEN sign(p.home_score - p.away_score) = sign(m.home_score - m.away_score)
        THEN 5
        + CASE
            WHEN m.is_knockout
             AND m.home_score = m.away_score
             AND p.home_score = p.away_score
             AND p.penalty_winner IS NOT NULL
             AND p.penalty_winner = m.penalty_winner
            THEN 5 ELSE 0 END
      WHEN ((p.home_score = m.home_score) <> (p.away_score = m.away_score))
        THEN 2
      ELSE 0
    END AS pts,
    (p.home_score = m.home_score AND p.away_score = m.away_score) AS is_exact
  FROM predictions p
  JOIN matches m ON m.id = p.match_id
  WHERE m.status = 'finished'
),
totals AS (
  SELECT user_id, SUM(pts) AS pts, SUM(is_exact::int) AS exacts
  FROM scored
  GROUP BY user_id
),
adjustments AS (
  SELECT user_id, COALESCE(SUM(points), 0) AS adj_pts
  FROM score_adjustments
  GROUP BY user_id
)
SELECT
  u.nickname,
  u.created_at,
  COALESCE(t.pts, 0) + COALESCE(a.adj_pts, 0) AS total_pts,
  COALESCE(t.exacts, 0) AS exacts,
  COALESCE(a.adj_pts, 0) AS adj_pts
FROM users u
LEFT JOIN totals t ON t.user_id = u.id
LEFT JOIN adjustments a ON a.user_id = u.id
ORDER BY total_pts DESC, exacts DESC, u.created_at ASC;
```

Para el ranking **de la fecha activa** se filtra por `m.round_number = $active` y
los ajustes no se suman (los ajustes solo afectan al ranking general,
ver reglamento — "los puntos impactarán únicamente en el Ranking
General").

## Decisión: SQL vs TS para scoring

- En **tests** y en operaciones puntuales (ver "mis puntos en un
  partido"), usar la función TS de `lib/scoring.ts`.
- En el **ranking** usamos SQL para no traer todas las predicciones a
  Node y sumarlas en memoria.
- **Riesgo**: dos fuentes de verdad para el algoritmo. Mitigación:
  test de paridad que pasa los 14 casos de `scoring.md` por ambos
  caminos y compara.

## Edge cases

- Usuario sin predicciones todavía → fila con 0 puntos.
- Usuario fue borrado → no aparece (LEFT JOIN desde users).
- Match sin score aún → `WHERE m.status = 'finished'` lo excluye.
