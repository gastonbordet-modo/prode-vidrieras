/**
 * Decisión pura sobre qué hacer con una apuesta en cada corrida del cron.
 * Sin I/O. Ver specs/features/009-bets.md.
 *
 * La orquestación (lib/bets.ts) lee filas, llama a `decideBet` por cada
 * apuesta abierta/lockeada, y aplica el resultado en una transacción:
 *   - `lock`    → status open → locked.
 *   - `cancel`  → status → cancelled. No toca el ranking (el stake solo
 *                 estaba "reservado", nunca se descontó). Refund = liberar
 *                 la reserva.
 *   - `resolve` → status → resolved + un score_adjustment por participante
 *                 con su DELTA NETO. El stake nunca tocó el ranking, así
 *                 que el neto es: ganador = payout - amount, perdedor =
 *                 -amount. El residuo de floor(pot/winners) se descarta
 *                 (sale de la economía).
 *   - `noop`    → nada por ahora.
 *
 * Idempotencia: la orquestación solo invoca esto para bets en estado
 * `open`/`locked`; una vez `resolved`/`cancelled` no se vuelven a tocar.
 */

import type { BetOutcome, BetSide } from "./bet-side";

export type DecideBet = {
  pick: BetOutcome;
  amount: number;
  status: "open" | "locked" | "resolved" | "cancelled";
};

export type DecideEntry = {
  userId: string;
  side: BetSide;
};

export type DecideMatch = {
  status: "scheduled" | "live" | "finished" | "postponed";
  kickoffAt: Date;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  penaltyWinner: string | null;
  isKnockout: boolean;
};

export type BetDelta = { userId: string; points: number };

export type BetDecision =
  | { action: "noop"; reason: string }
  | { action: "lock"; reason: string }
  | { action: "cancel"; reason: string }
  | {
      action: "resolve";
      outcome: BetSide; // lado ganador
      deltas: BetDelta[];
      reason: string;
    };

/**
 * 1X2 real de un partido terminado. `null` si todavía no es resoluble
 * (no terminó, sin marcador, o eliminatoria empatada sin penalty_winner).
 *
 * En eliminatorias con empate, el ganador lo define `penaltyWinner` (nombre
 * del equipo), consistente con el resto de la app.
 */
export function realMatchOutcome(match: DecideMatch): BetOutcome | null {
  if (match.status !== "finished") return null;
  if (match.homeScore === null || match.awayScore === null) return null;

  if (match.homeScore > match.awayScore) return "home";
  if (match.homeScore < match.awayScore) return "away";

  // Empate al final del tiempo reglamentario.
  if (match.isKnockout) {
    if (match.penaltyWinner === null) return null; // esperar la definición
    if (match.penaltyWinner === match.homeTeam) return "home";
    if (match.penaltyWinner === match.awayTeam) return "away";
    return null; // penaltyWinner no matchea ningún equipo: no resolver
  }

  return "draw";
}

export function decideBet(
  bet: DecideBet,
  entries: DecideEntry[],
  match: DecideMatch,
  now: number,
): BetDecision {
  if (bet.status === "resolved" || bet.status === "cancelled") {
    return { action: "noop", reason: "La apuesta ya está cerrada." };
  }

  const conCount = entries.filter((e) => e.side === "con").length;

  // Partido postergado/cancelado: no podemos distinguir uno de otro con
  // nuestro mapeo de status (ambos caen en 'postponed'). v1: esperar.
  if (match.status === "postponed") {
    return { action: "noop", reason: "Partido postergado; esperando." };
  }

  if (match.status === "finished") {
    const real = realMatchOutcome(match);
    if (real === null) {
      return {
        action: "noop",
        reason: "Empate de eliminatoria sin definición por penales aún.",
      };
    }
    if (conCount === 0) {
      return { action: "cancel", reason: "Nadie se sumó en contra." };
    }

    const winningSide: BetSide = real === bet.pick ? "pro" : "con";
    const winners = entries.filter((e) => e.side === winningSide);
    const pot = bet.amount * entries.length;
    const payoutPerWinner = Math.floor(pot / winners.length);

    const deltas: BetDelta[] = entries.map((e) => ({
      userId: e.userId,
      points: (e.side === winningSide ? payoutPerWinner : 0) - bet.amount,
    }));

    return {
      action: "resolve",
      outcome: winningSide,
      deltas,
      reason: `Resuelta: ganó el lado ${winningSide} (resultado ${real}).`,
    };
  }

  // scheduled | live: el partido aún no terminó.
  if (now >= match.kickoffAt.getTime()) {
    // Llegó el kickoff: no entran más participantes.
    if (conCount === 0) {
      return {
        action: "cancel",
        reason: "Se llegó al kickoff sin oponente.",
      };
    }
    if (bet.status === "open") {
      return { action: "lock", reason: "Kickoff alcanzado; lockeada." };
    }
    return { action: "noop", reason: "Lockeada; esperando resultado." };
  }

  return { action: "noop", reason: "Abierta, antes del kickoff." };
}
