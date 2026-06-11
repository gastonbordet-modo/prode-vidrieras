/**
 * Orquestación DB de las apuestas: resolución automática (corre dentro del
 * cron de sync) y lecturas compartidas por actions y la página /casino.
 *
 * La lógica de decisión vive en lib/bet-resolution.ts (pura, testeada). Acá
 * solo leemos filas, llamamos a `decideBet` y aplicamos el resultado en una
 * transacción. Idempotente: solo tocamos bets en estado open/locked.
 *
 * Ver specs/features/009-bets.md.
 */

import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { betEntries, bets, matches, scoreAdjustments } from "@/db/schema";
import { decideBet, type DecideEntry } from "@/lib/bet-resolution";

export type ResolveBetsResult = {
  scanned: number;
  locked: number;
  cancelled: number;
  resolved: number;
};

/**
 * Recorre las apuestas open/locked, decide qué hacer con cada una y aplica
 * los cambios. Las resoluciones impactan el ranking insertando un
 * `score_adjustment` por participante con su delta neto.
 */
export async function resolveFinishedBets(
  now: number = Date.now(),
): Promise<ResolveBetsResult> {
  const activeBets = await db.query.bets.findMany({
    where: inArray(bets.status, ["open", "locked"]),
  });

  const result: ResolveBetsResult = {
    scanned: activeBets.length,
    locked: 0,
    cancelled: 0,
    resolved: 0,
  };
  if (activeBets.length === 0) return result;

  const matchIds = [...new Set(activeBets.map((b) => b.matchId))];
  const betIds = activeBets.map((b) => b.id);

  const [matchRows, entryRows] = await Promise.all([
    db.query.matches.findMany({ where: inArray(matches.id, matchIds) }),
    db.query.betEntries.findMany({ where: inArray(betEntries.betId, betIds) }),
  ]);

  const matchById = new Map(matchRows.map((m) => [m.id, m]));
  const entriesByBet = new Map<number, DecideEntry[]>();
  for (const e of entryRows) {
    const list = entriesByBet.get(e.betId) ?? [];
    list.push({ userId: e.userId, side: e.side });
    entriesByBet.set(e.betId, list);
  }

  await db.transaction(async (tx) => {
    for (const b of activeBets) {
      const match = matchById.get(b.matchId);
      if (!match) continue; // partido borrado: no debería pasar
      const entries = entriesByBet.get(b.id) ?? [];

      const decision = decideBet(
        { pick: b.pick, amount: b.amount, status: b.status },
        entries,
        match,
        now,
      );

      if (decision.action === "lock") {
        await tx.update(bets).set({ status: "locked" }).where(eq(bets.id, b.id));
        result.locked++;
      } else if (decision.action === "cancel") {
        await tx
          .update(bets)
          .set({ status: "cancelled", resolvedAt: new Date(now) })
          .where(eq(bets.id, b.id));
        result.cancelled++;
      } else if (decision.action === "resolve") {
        await tx
          .update(bets)
          .set({
            status: "resolved",
            outcome: decision.outcome,
            resolvedAt: new Date(now),
          })
          .where(eq(bets.id, b.id));

        const reason = `Apuesta #${b.id} — ${match.homeTeam} vs ${match.awayTeam}`;
        const adjustments = decision.deltas
          .filter((d) => d.points !== 0)
          .map((d) => ({
            userId: d.userId,
            points: d.points,
            reason,
            createdBy: b.creatorId,
          }));
        if (adjustments.length > 0) {
          await tx.insert(scoreAdjustments).values(adjustments);
        }
        result.resolved++;
      }
    }
  });

  return result;
}

/**
 * Apuestas en las que el usuario tiene una entry y que siguen comprometiendo
 * puntos (status open/locked). Usado para el cálculo del balance disponible
 * y para el guard de "máximo 5 apuestas abiertas".
 */
export async function getOpenBetsForUser(
  userId: string,
): Promise<{ betId: number; amount: number }[]> {
  const rows = await db
    .select({ betId: bets.id, amount: bets.amount })
    .from(betEntries)
    .innerJoin(bets, eq(bets.id, betEntries.betId))
    .where(
      and(
        eq(betEntries.userId, userId),
        inArray(bets.status, ["open", "locked"]),
      ),
    );
  return rows;
}
