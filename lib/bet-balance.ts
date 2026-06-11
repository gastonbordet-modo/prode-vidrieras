/**
 * Cálculo del balance disponible para apostar. Puro, sin I/O.
 * Ver specs/features/009-bets.md.
 *
 * Las apuestas resueltas ya impactaron el ranking (vía score_adjustments),
 * así que `rankingPoints` ya las refleja. Las apuestas open/locked solo
 * "reservan" puntos: no tocan el ranking visible, pero sí reducen lo que
 * tenés disponible para comprometer.
 *
 *   disponible = rankingPoints - Σ(amount de entries en bets open/locked)
 *
 * No hay tope inferior: el disponible puede ser negativo (la chicana tiene
 * precio real y el saldo se arrastra).
 */

export type CommittedEntry = { amount: number };

export function committedPoints(entries: CommittedEntry[]): number {
  return entries.reduce((sum, e) => sum + e.amount, 0);
}

export function availableBalance(
  rankingPoints: number,
  openEntries: CommittedEntry[],
): number {
  return rankingPoints - committedPoints(openEntries);
}
