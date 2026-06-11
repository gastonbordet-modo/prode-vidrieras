/**
 * Derivación del "lado" de un participante en una apuesta 1X2.
 * Funciones puras, sin I/O. Ver specs/features/009-bets.md.
 *
 * El lado NO se elige: se deriva del pronóstico oficial del usuario para
 * el partido, comparado contra el `pick` del creador de la apuesta.
 *   - El 1X2 del pronóstico cae en el mismo outcome que el pick → `'pro'`.
 *   - Cae en cualquiera de los otros dos → `'con'`.
 *
 * El 1X2 de un pronóstico se deriva del signo de (home - away). Los penales
 * NO entran acá: una apuesta es sobre el 1X2 a los 90'/120', no sobre quién
 * gana la definición. Un pronóstico de empate en una eliminatoria es
 * outcome `'draw'` para fines de apuesta (y por lo tanto siempre `'con'`
 * frente a un pick `'home'`/`'away'`, porque el resultado real de un
 * knockout nunca resuelve como `'draw'` — ver bet-resolution).
 */

export type BetOutcome = "home" | "draw" | "away";
export type BetSide = "pro" | "con";

function sign(n: number): -1 | 0 | 1 {
  return n > 0 ? 1 : n < 0 ? -1 : 0;
}

/** 1X2 derivado de un marcador (de un pronóstico o de un resultado). */
export function outcomeFromScore(
  homeScore: number,
  awayScore: number,
): BetOutcome {
  const s = sign(homeScore - awayScore);
  return s > 0 ? "home" : s < 0 ? "away" : "draw";
}

/**
 * Lado del participante: `'pro'` si su pronóstico coincide con el pick del
 * creador, `'con'` en cualquier otro caso.
 */
export function deriveBetSide(
  creatorPick: BetOutcome,
  predictionOutcome: BetOutcome,
): BetSide {
  return predictionOutcome === creatorPick ? "pro" : "con";
}
