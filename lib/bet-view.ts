/**
 * View-models de apuestas para la UI. Puro, sin I/O. Toma filas ya
 * fetchadas y produce lo que la card necesita: pozo, conteos por lado,
 * preview de payout para cada escenario y, si está resuelta, el delta del
 * usuario. Ver specs/features/009-bets.md.
 */

import type { BetOutcome, BetSide } from "./bet-side";

export type BetViewMatch = {
  homeTeam: string;
  awayTeam: string;
  homeTeamCrest: string | null;
  awayTeamCrest: string | null;
  kickoffAt: Date;
  status: "scheduled" | "live" | "finished" | "postponed";
  roundNumber: number;
};

export type BetViewEntry = {
  userId: string;
  nickname: string;
  side: BetSide;
};

export type BetViewInput = {
  id: number;
  creatorId: string;
  pick: BetOutcome;
  amount: number;
  status: "open" | "locked" | "resolved" | "cancelled";
  outcome: BetSide | null;
  match: BetViewMatch;
  entries: BetViewEntry[]; // ordenadas por antigüedad
};

export type BetView = {
  id: number;
  homeTeam: string;
  awayTeam: string;
  homeTeamCrest: string | null;
  awayTeamCrest: string | null;
  kickoffIso: string;
  matchStatus: "scheduled" | "live" | "finished" | "postponed";
  roundNumber: number;
  pick: BetOutcome;
  pickLabel: string;
  amount: number;
  status: "open" | "locked" | "resolved" | "cancelled";
  outcome: BetSide | null;
  creatorNickname: string;
  players: { nickname: string; side: BetSide }[];
  proCount: number;
  conCount: number;
  pot: number;
  /** Lo que se lleva cada ganador si gana el lado pro. */
  proPayout: number;
  /** Lo que se lleva cada ganador si gana el lado con; null si no hay con. */
  conPayout: number | null;
  isCreator: boolean;
  isMine: boolean;
  mySide: BetSide | null;
  canJoin: boolean;
  /** Delta neto del usuario si la apuesta está resuelta; null si no aplica. */
  myDelta: number | null;
};

export function pickLabel(pick: BetOutcome, home: string, away: string): string {
  if (pick === "home") return `gana ${home}`;
  if (pick === "away") return `gana ${away}`;
  return "empate";
}

export function buildBetView(
  input: BetViewInput,
  currentUserId: string,
  now: number,
): BetView {
  const { match, entries } = input;
  const proCount = entries.filter((e) => e.side === "pro").length;
  const conCount = entries.filter((e) => e.side === "con").length;
  const pot = input.amount * entries.length;

  const proPayout = proCount > 0 ? Math.floor(pot / proCount) : 0;
  const conPayout = conCount > 0 ? Math.floor(pot / conCount) : null;

  const myEntry = entries.find((e) => e.userId === currentUserId) ?? null;
  const isCreator = input.creatorId === currentUserId;
  const isMine = isCreator || myEntry !== null;
  const mySide = myEntry?.side ?? null;

  const creator = entries.find((e) => e.userId === input.creatorId);

  let myDelta: number | null = null;
  if (input.status === "resolved" && input.outcome && mySide) {
    const winnerPayout = input.outcome === "pro" ? proPayout : conPayout ?? 0;
    myDelta = (mySide === input.outcome ? winnerPayout : 0) - input.amount;
  }

  const canJoin =
    input.status === "open" &&
    !isMine &&
    now < match.kickoffAt.getTime();

  return {
    id: input.id,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    homeTeamCrest: match.homeTeamCrest,
    awayTeamCrest: match.awayTeamCrest,
    kickoffIso: match.kickoffAt.toISOString(),
    matchStatus: match.status,
    roundNumber: match.roundNumber,
    pick: input.pick,
    pickLabel: pickLabel(input.pick, match.homeTeam, match.awayTeam),
    amount: input.amount,
    status: input.status,
    outcome: input.outcome,
    creatorNickname: creator?.nickname ?? "—",
    players: entries.map((e) => ({ nickname: e.nickname, side: e.side })),
    proCount,
    conCount,
    pot,
    proPayout,
    conPayout,
    isCreator,
    isMine,
    mySide,
    canJoin,
    myDelta,
  };
}
