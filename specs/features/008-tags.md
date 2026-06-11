# Feature 008 — Tags de folklore

## User story

Como participante quiero que mi nickname tenga "apodos" automáticos
que describan cómo juego (con onda futbolera argentina), y poder
chusmear los apodos del resto para chicanear.

## Concepto

Los tags son **derivados**, no editables. Se calculan al cierre de
cada fecha sobre los datos que ya tenemos (`predictions`, `matches`,
ranking). Pueden cambiar entre fechas: un Bilardista de la fecha 2
puede ser Menottista en la fecha 5 si cambió de mano.

- Cada usuario tiene **0 a 3 tags simultáneos** visibles.
- Si un usuario califica para más de 3, se priorizan por la **prioridad
  fija del catálogo** (ver tabla).
- El set de tags es **fijo en código**, no editable desde panel.

## Catálogo

### De carácter (cómo pronosticás)

Se computan sobre **todos** los pronósticos del torneo (no por fecha).

| Prioridad | Tag | Criterio | Descripción (tooltip) |
|---|---|---|---|
| 10 | **Bilardista** | >50% de pronósticos terminan 1-0 / 2-1 / 1-2 | Resultados feos, ganador claro. |
| 10 | **Menottista** | Promedio de goles por pronóstico ≥ 4 | El fútbol es una fiesta. |
| 11 | **Pecho Frío** | >40% de pronósticos son empates | No se la juega nunca. |
| 12 | **Cabulero** | Mismo resultado exacto en ≥4 partidos | El mismo número, siempre. |
| 13 | **El Loco** | Pronósticos con ≥6 goles totales en ≥3 partidos | Tira goleadas absurdas. |

**Bilardista y Menottista** son mutuamente excluyentes por
construcción del criterio (no se puede tener >50% de 1-0/2-1/1-2 y
promedio ≥4 al mismo tiempo), por eso comparten prioridad.

### De fecha (efímeros, duran hasta la próxima)

Se computan sobre la **última fecha cerrada** (todos los partidos
`finished`).

| Prioridad | Tag | Criterio | Descripción |
|---|---|---|---|
| 1 | **Profeta** | 2+ exactos en la última fecha cerrada | La vio antes. |
| 2 | **Mufa** | 0 puntos en la última fecha cerrada | Toca madera. |
| 3 | **Patadura** | Peor puntaje del grupo en la última fecha cerrada | Se quedó afuera. |
| 4 | **El Comeback** | Más posiciones subidas en el ranking en la última fecha cerrada | De atrás viene. |

`Mufa` y `Patadura` pueden coincidir (peor puntaje del grupo siendo 0
también). En ese caso valen los dos, ambos cuentan contra el límite
de 3.

### De torneo (acumulados)

Se computan sobre el ranking general acumulado.

| Prioridad | Tag | Criterio | Descripción |
|---|---|---|---|
| 1 | **Messi** | #1 del ranking general | El mejor. |
| 2 | **Cebollita Subcampeón** | Sos #2 desde hace ≥3 fechas cerradas seguidas | Siempre cerca, nunca. |
| 5 | **El Diez** | Más exactos del torneo | Pega los resultados justos. |
| 6 | **Brujita** | Le diste ganador a Inglaterra en **≥3 partidos consecutivos** de Inglaterra | El que la ve a los ingleses. |
| 7 | **Mascherano** | Racha más larga sin fecha con 0 puntos | El jefe, regular como pocos. |

Solo un usuario puede tener **Messi** y **Cebollita Subcampeón** a la
vez (son del ranking). **El Diez** y **Mascherano** son únicos por
torneo (líderes de su métrica); en caso de empate, gana el desempate
del ranking general (puntos → exactos → `created_at`).

## Reglas detalladas por tag

### Brujita

- Recorrer los partidos de Inglaterra en orden cronológico (por
  `kickoff_at`, status `finished`).
- Para cada uno, mirar el pronóstico del usuario en ese partido:
  - Si pronosticó "gana Inglaterra" (Inglaterra como local con
    `home > away`, o visitante con `away > home`) → suma a la racha.
  - Si pronosticó empate, gana el rival, o no pronosticó → la racha
    se reinicia.
- El tag se asigna si la **racha más larga** del torneo es ≥3.

### Cabulero

- Agrupar pronósticos del usuario por `(home_score, away_score)`.
- Si algún grupo tiene ≥4 elementos → tag.

### Hincha de ningún equipo en particular

Sacado del catálogo (decisión del producto).

### Tags removidos del catálogo

`Copión`, `Hincha de [equipo]`, `Pelusa`, `El Plomo`, `Narigón` — no
están en este set. No se computan.

## Resolución de los 3 cupos

Cuando un usuario califica para más de 3:

1. Tomar todos los tags que cumple.
2. Ordenar por `priority` ascendente.
3. Tomar los primeros 3.

Esto da preferencia a los **tags de fecha** (priority 1-4) y a
**Messi/Cebollita** (1-2) sobre los de carácter (10+), lo cual es lo
queremos: los apodos efímeros y los premios del torneo son los más
interesantes.

## Visualización

- Como **chips** al lado del nickname en:
  - `/ranking` (general, por fecha, evolución)
  - `/historial`
  - `/chat` (junto al nickname en cada mensaje)
  - Tu propio nickname en el header del home
- **Tooltip on hover** con la descripción del tag (en mobile: tap →
  popover que se cierra con tap afuera).
- **Colores**: paleta del theme actual del YOY. 5 colores reutilizables
  (no único por tag — colores pueden repetirse entre tags).
  Asignación es estable por tag (mismo tag → mismo color siempre).
  Definición de la paleta y mapeo en `lib/tag-styles.ts` (ver más
  abajo).

## Implementación lógica

### Módulo puro: `lib/tags.ts`

```ts
type Tag = {
  id: string;             // "messi", "bilardista", etc.
  name: string;           // "Messi"
  description: string;    // tooltip
  priority: number;
};

function computeTags(args: {
  userId: string;
  allPredictions: Prediction[];   // del usuario
  allMatches: Match[];
  ranking: RankingEntry[];        // pre-calculado
  rankingPrevious: RankingEntry[]; // de la fecha anterior, para Comeback
  lastFinishedRound: Round | null;
}): Tag[]
```

- Pura, sin DB.
- Tests exhaustivos por tag con fixtures.
- Computa **todos** los tags aplicables, ordena por priority, devuelve
  los primeros 3.

### Cuándo se calcula

Opción A: **on-demand** en cada page render (server component).
Opción B: **persistido** en una tabla `user_tags` que se actualiza por
cron al cierre de cada fecha.

Decisión: **on-demand en v1**. Con 10 usuarios y la data ya cacheada,
el costo es trivial y nos ahorra una tabla + cron + sync. Si se vuelve
lento, migrar a persistido es directo.

### `lib/tag-styles.ts`

Mapeo `tagId → colorVariant` y `colorVariant → clases Tailwind` para
asegurar que se mantiene el theme. 5 variantes de color, reutilizadas.

## Edge cases

- **Usuario sin pronósticos**: no califica para ningún tag de carácter,
  pero podría calificar para uno de fecha (Mufa si su puntaje en esa
  fecha fue 0 por no pronosticar). Está bien.
- **Torneo no arrancó**: nadie tiene tags. Sin error.
- **Una sola fecha cerrada**: los tags de fecha aplican; los de torneo
  también (Messi vale desde la fecha 1).
- **Empate en Brujita (Inglaterra empató y vos pronosticaste empate)**:
  no suma a la racha, la corta.
- **Inglaterra no juega más** (eliminada): la racha "se congela" en
  el valor que tenía. Si llegó a ≥3, mantenés el tag hasta fin del
  torneo. Si no llegó, no lo conseguís nunca más.

## Tests críticos

- `tags.test.ts` con un caso por tag (positivo + negativo).
- Caso de cupo: un usuario califica para 5 tags, verificar que se
  devuelven los 3 de menor priority.
- Caso Brujita: secuencia de pronósticos sobre 5 partidos de
  Inglaterra (`W, W, L, W, W, W` → tag, porque la racha más larga es 3).
- Caso Comeback: posiciones previa y actual.
- Caso Cebollita Subcampeón: ranking de 3 fechas, verificar que solo
  se da si fue #2 en las 3.
