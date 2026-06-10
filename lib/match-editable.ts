/**
 * Lógica de bloqueo de un partido para predicciones.
 *
 * Esta es la fuente de verdad del anti-trampa: si decimos que un partido
 * no es editable, ni el UI lo muestra como tal ni el server acepta la
 * mutación. Mantenemos UI y server alineados consumiendo este módulo
 * desde ambos lados.
 *
 * Spec: specs/features/002-predictions.md + reglamento ("sólo se
 * bloquean aquellos partidos que hayan comenzado a jugarse").
 */

export type LockReason = "not_scheduled" | "already_started";

type LockableMatch = {
  status: "scheduled" | "live" | "finished" | "postponed";
  kickoffAt: Date;
};

/**
 * Devuelve el motivo por el cual un partido no acepta predicciones, o
 * `null` si todavía las acepta. Permite al server convertir el motivo a
 * un mensaje específico para el usuario.
 */
export function getLockReason(
  match: LockableMatch,
  now: number,
): LockReason | null {
  // Solo aceptamos pronósticos en partidos "scheduled". Cualquier otro
  // status (live, finished, postponed) ya pasó el momento de cargar.
  if (match.status !== "scheduled") return "not_scheduled";

  // El reglamento bloquea "partidos que hayan comenzado a jugarse" — usamos
  // kickoffAt como umbral. `>=` significa que el instante exacto del kickoff
  // ya bloquea.
  if (now >= match.kickoffAt.getTime()) return "already_started";

  return null;
}

export function isMatchEditable(match: LockableMatch, now: number): boolean {
  return getLockReason(match, now) === null;
}

/**
 * Indica si el match acepta una elección de "ganador por penales".
 * Solo aplica para eliminatorias con empate (incluye empate cargado en
 * la predicción, no necesariamente en el resultado real).
 */
export function isPenaltyApplicable(
  isKnockout: boolean,
  homeScore: number | null,
  awayScore: number | null,
): boolean {
  if (!isKnockout) return false;
  if (homeScore === null || awayScore === null) return false;
  return homeScore === awayScore;
}
