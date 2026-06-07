# Scoring spec

Esta es la **función crítica** del prode. Toda regla acá tiene que tener
un test correspondiente en `lib/scoring.test.ts`.

## Reglamento (resumen)

Para cada partido finalizado, dado un pronóstico:

| Caso                                                   | Puntos |
| ------------------------------------------------------ | ------ |
| A. Resultado y marcador exacto                         | 12     |
| B. Acertar ganador (o empate no exacto)                | 5      |
| C. Acertar goles de uno de los dos equipos (sin ganar) | 2      |

**Combinaciones del reglamento (ejemplos oficiales):**

Resultado real: `Argentina 3 - 1 Francia`

| Predicción      | Puntos | Por qué                                  |
| --------------- | ------ | ---------------------------------------- |
| `Arg 3 - 1 Fra` | 12     | Exacto                                   |
| `Arg 3 - 0 Fra` | 7      | Ganador (5) + goles Argentina (2)        |
| `Arg 2 - 1 Fra` | 7      | Ganador (5) + goles Francia (2)          |
| `Arg 2 - 0 Fra` | 5      | Solo ganador                             |
| `Arg 0 - 1 Fra` | 2      | Solo goles de Francia                    |
| `Arg 3 - 3 Fra` | 2      | Solo goles de Argentina (predijo empate) |
| `Arg 0 - 2 Fra` | 0      | Nada                                     |
| `Arg 0 - 0 Fra` | 0      | Nada                                     |

### Penales (eliminación directa)

Solo aplica si:

- el match es `is_knockout`
- el resultado real (90/120 min) terminó **empatado**
- el usuario **predijo empate** en el resultado principal

Si el usuario predijo empate:

- se le habilita un campo extra "ganador por penales"
- si lo acierta: **+5 puntos** sobre el puntaje principal
- si lo falla o no lo cargó: 0 puntos extra, conserva el puntaje
  principal

**Ejemplos del reglamento:**

Resultado real: `Argentina 1 - 1 Francia` (penales: Argentina)

| Predicción                        | Puntos      |
| --------------------------------- | ----------- |
| `Arg 1 - 1 Fra` + penal Argentina | 17 (12 + 5) |
| `Arg 1 - 1 Fra` + penal Francia   | 12          |
| `Arg 0 - 0 Fra` + penal Argentina | 10 (5 + 5)  |
| `Arg 0 - 0 Fra` + penal Francia   | 5           |

## Algoritmo (TypeScript pseudocódigo)

```ts
type Prediction = {
  homeScore: number;
  awayScore: number;
  penaltyWinner: string | null; // nombre del equipo home o away
};
type Match = {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  penaltyWinner: string | null;
  isKnockout: boolean;
};

function score(p: Prediction, m: Match): { points: number; isExact: boolean } {
  const exactScore = p.homeScore === m.homeScore && p.awayScore === m.awayScore;
  const predWinner = sign(p.homeScore - p.awayScore); // -1, 0, 1
  const realWinner = sign(m.homeScore - m.awayScore);
  const winnerCorrect = predWinner === realWinner;
  const homeGoalsCorrect = p.homeScore === m.homeScore;
  const awayGoalsCorrect = p.awayScore === m.awayScore;
  const oneTeamGoalsCorrect = homeGoalsCorrect !== awayGoalsCorrect; // XOR

  let base = 0;
  if (exactScore) base = 12;
  else if (winnerCorrect && oneTeamGoalsCorrect)
    base = 7; // 5 + 2
  else if (winnerCorrect) base = 5;
  else if (oneTeamGoalsCorrect) base = 2;

  // Bonus de penales
  let bonus = 0;
  const matchWasDraw = m.homeScore === m.awayScore;
  const predWasDraw = p.homeScore === p.awayScore;
  if (
    m.isKnockout &&
    matchWasDraw &&
    predWasDraw &&
    p.penaltyWinner !== null &&
    p.penaltyWinner === m.penaltyWinner
  ) {
    bonus = 5;
  }

  return { points: base + bonus, isExact: exactScore };
}
```

## Casos edge a testear

1. Exacto sin penales (3-1 vs 3-1) → 12
2. Exacto con penales acertado (1-1 + Arg vs 1-1 + Arg, knockout) → 17
3. Exacto con penales fallado (1-1 + Fra vs 1-1 + Arg) → 12
4. Exacto 0-0 con penales acertado (knockout) → 17
5. Ganador + un equipo (3-0 vs 3-1) → 7
6. Ganador + un equipo, el otro lado (2-1 vs 3-1) → 7
7. Solo ganador (2-0 vs 3-1) → 5
8. Solo goles de un equipo, sin ganador (0-1 vs 3-1) → 2
9. Empate predicho con goles de un equipo correcto (3-3 vs 3-1) → 2
10. Nada (0-2 vs 3-1) → 0
11. Empate exacto sin penales 0-0 vs 0-0, partido fase de grupos → 12
12. Empate predicho en knockout + penales correcto pero resultado real
    no fue empate (predijo 1-1, salió 2-1) → 5 (acertó "draw"? no — acá
    el ganador no fue empate, así que 0; el bonus penales no aplica
    porque match no terminó empatado)
13. Predicción sin penalty_winner cargado en partido eliminatoria
    empate → solo puntos base
14. Empate exacto en eliminatoria que se definió en 120 min sin penales
    (caso imposible en práctica, pero el `match.penalty_winner` es
    null) → base + 0 bonus

## Tiebreakers (ranking)

Cuando dos usuarios empatan en puntos totales:

1. **Más resultados exactos en la fecha** (cuando es ranking de fecha)
   o **en el torneo** (cuando es ranking general).
2. Para el ranking de fecha: si siguen empatados, **más resultados
   exactos en el torneo** (cláusula 2 del reglamento).
3. **Quien activó la cuenta antes** (= `users.created_at` ascendente).

## Ajustes manuales

- `score_adjustments.points` se suma al total computed del usuario.
- Los ajustes **no cuentan como "resultado exacto"** para tiebreakers.
- Aparecen en el ranking general como una columna desglosada para
  transparencia (TBD diseño UI).
