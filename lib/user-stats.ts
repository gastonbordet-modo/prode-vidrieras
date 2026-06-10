/**
 * Cálculo de stats por usuario (predicciones jugadas, puntos totales).
 * Función pura, sin I/O — recibe rows ya fetchadas. Reusada por el
 * panel de admin; será reusada por el ranking (Fase 4).
 */

import { score, type Match as ScoringMatch } from "./scoring";

export type StatsPrediction = {
  userId: string;
  matchId: number;
  homeScore: number;
  awayScore: number;
  penaltyWinner: string | null;
};

export type StatsMatch = {
  id: number;
  status: "scheduled" | "live" | "finished" | "postponed";
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  penaltyWinner: string | null;
  isKnockout: boolean;
};

export type StatsAdjustment = {
  userId: string;
  points: number;
};

export type UserStats = {
  predictionsCount: number;
  scoredCount: number;
  points: number;
};

export function computeUserStats(
  userId: string,
  predictions: StatsPrediction[],
  matchesById: Map<number, StatsMatch>,
  adjustments: StatsAdjustment[],
): UserStats {
  let predictionsCount = 0;
  let scoredCount = 0;
  let points = 0;

  for (const p of predictions) {
    if (p.userId !== userId) continue;
    predictionsCount++;

    const m = matchesById.get(p.matchId);
    if (!m || m.status !== "finished") continue;
    if (m.homeScore === null || m.awayScore === null) continue;

    const finished: ScoringMatch = {
      homeTeam: m.homeTeam,
      awayTeam: m.awayTeam,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      penaltyWinner: m.penaltyWinner,
      isKnockout: m.isKnockout,
    };
    points += score(
      {
        homeScore: p.homeScore,
        awayScore: p.awayScore,
        penaltyWinner: p.penaltyWinner,
      },
      finished,
    ).points;
    scoredCount++;
  }

  for (const a of adjustments) {
    if (a.userId === userId) points += a.points;
  }

  return { predictionsCount, scoredCount, points };
}
