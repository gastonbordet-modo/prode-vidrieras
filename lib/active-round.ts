import { db } from "@/db/client";
import { matches } from "@/db/schema";

type RoundStatusRow = {
  roundNumber: number;
  status: "scheduled" | "live" | "finished" | "postponed";
};

/**
 * Determina qué número de fecha está activa.
 *
 * - Si hay matches en estado `scheduled` o `live`: la fecha activa es la
 *   menor entre esas (la "próxima" en jugarse).
 * - Si no quedan partidos por jugar (todos `finished` o `postponed`): la
 *   fecha activa es la mayor (post-mortem del torneo).
 * - Si no hay matches todavía: `null` (estado vacío).
 *
 * Los `postponed` no cuentan para la "próxima" fecha — la fecha original
 * sigue avanzando aunque algunos partidos hayan sido reprogramados.
 */
export function deriveActiveRound(rows: RoundStatusRow[]): number | null {
  if (rows.length === 0) return null;

  const pendingRounds = rows
    .filter((r) => r.status === "scheduled" || r.status === "live")
    .map((r) => r.roundNumber);

  if (pendingRounds.length > 0) {
    return Math.min(...pendingRounds);
  }

  return Math.max(...rows.map((r) => r.roundNumber));
}

export async function getActiveRound(): Promise<number | null> {
  const rows = await db
    .select({
      roundNumber: matches.roundNumber,
      status: matches.status,
    })
    .from(matches);
  return deriveActiveRound(rows);
}
