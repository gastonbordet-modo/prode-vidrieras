/**
 * Resolución del "ganador por penales" en eliminatorias.
 *
 * El UI elige `"home"` o `"away"`; persistimos en la DB el NOMBRE del
 * equipo (no la posición), así si en algún momento la home/away
 * cambian no se invalidan predicciones existentes.
 *
 * Spec: specs/features/002-predictions.md → punto 4 del Server Action.
 */

export type PenaltySide = "home" | "away";

/**
 * Resuelve el lado elegido al nombre del equipo, validando que aplique.
 *
 * - Si no es eliminatoria o los goles no empatan → devuelve `null` aunque
 *   el side venga seteado (el bonus no aplica).
 * - Si aplica y `side` está seteado → devuelve el nombre del equipo.
 * - Si aplica pero `side` es null → devuelve `null` (el usuario todavía
 *   no eligió; el bonus se pierde si nunca elige).
 */
export function resolvePenaltyWinner({
  side,
  isKnockout,
  homeScore,
  awayScore,
  homeTeam,
  awayTeam,
}: {
  side: PenaltySide | null;
  isKnockout: boolean;
  homeScore: number;
  awayScore: number;
  homeTeam: string;
  awayTeam: string;
}): string | null {
  if (!isKnockout) return null;
  if (homeScore !== awayScore) return null;
  if (side === null) return null;
  return side === "home" ? homeTeam : awayTeam;
}

/**
 * Inverso de resolvePenaltyWinner: dado el nombre persistido, derivá el
 * `side` para hidratar el form de edición.
 */
export function deriveSideFromTeam(
  teamName: string | null,
  homeTeam: string,
  awayTeam: string,
): PenaltySide | null {
  if (teamName === null) return null;
  if (teamName === homeTeam) return "home";
  if (teamName === awayTeam) return "away";
  return null;
}
