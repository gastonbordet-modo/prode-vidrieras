import { describe, expect, it } from "vitest";
import {
  computeUserStats,
  type StatsAdjustment,
  type StatsMatch,
  type StatsPrediction,
} from "./user-stats";

const USER = "u1";
const OTHER = "u2";

const finishedMatch = (id: number, home: number, away: number): StatsMatch => ({
  id,
  status: "finished",
  homeTeam: "Argentina",
  awayTeam: "Francia",
  homeScore: home,
  awayScore: away,
  penaltyWinner: null,
  isKnockout: false,
});

const scheduledMatch = (id: number): StatsMatch => ({
  id,
  status: "scheduled",
  homeTeam: "Argentina",
  awayTeam: "Francia",
  homeScore: null,
  awayScore: null,
  penaltyWinner: null,
  isKnockout: false,
});

const pred = (
  matchId: number,
  home: number,
  away: number,
  userId: string = USER,
): StatsPrediction => ({
  userId,
  matchId,
  homeScore: home,
  awayScore: away,
  penaltyWinner: null,
});

const buildMatchMap = (...ms: StatsMatch[]) =>
  new Map<number, StatsMatch>(ms.map((m) => [m.id, m]));

describe("computeUserStats", () => {
  it("usuario sin predicciones ni ajustes → 0 todos", () => {
    expect(computeUserStats(USER, [], buildMatchMap(), [])).toEqual({
      predictionsCount: 0,
      scoredCount: 0,
      points: 0,
    });
  });

  it("cuenta predicciones del usuario, ignora las del resto", () => {
    const stats = computeUserStats(
      USER,
      [pred(1, 1, 0, USER), pred(2, 2, 2, OTHER), pred(3, 0, 0, USER)],
      buildMatchMap(),
      [],
    );
    expect(stats.predictionsCount).toBe(2);
  });

  it("suma puntos sólo de partidos finished", () => {
    // Real 3-1: exacto = 12 pts
    const stats = computeUserStats(
      USER,
      [pred(1, 3, 1), pred(2, 0, 0)],
      buildMatchMap(finishedMatch(1, 3, 1), scheduledMatch(2)),
      [],
    );
    expect(stats.predictionsCount).toBe(2);
    expect(stats.scoredCount).toBe(1);
    expect(stats.points).toBe(12);
  });

  it("incluye ajustes del usuario (positivos y negativos)", () => {
    const adjustments: StatsAdjustment[] = [
      { userId: USER, points: 5 },
      { userId: USER, points: -3 },
      { userId: OTHER, points: 100 },
    ];
    const stats = computeUserStats(USER, [], buildMatchMap(), adjustments);
    expect(stats.points).toBe(2);
  });

  it("suma scoring + ajustes", () => {
    // 3-1 real, predicción 3-0 → 7 pts (ganador + goles home) + ajuste +5
    const stats = computeUserStats(
      USER,
      [pred(1, 3, 0)],
      buildMatchMap(finishedMatch(1, 3, 1)),
      [{ userId: USER, points: 5 }],
    );
    expect(stats.points).toBe(12);
  });

  it("predicción sin match correspondiente → cuenta pero no suma puntos", () => {
    const stats = computeUserStats(USER, [pred(99, 1, 1)], buildMatchMap(), []);
    expect(stats.predictionsCount).toBe(1);
    expect(stats.scoredCount).toBe(0);
    expect(stats.points).toBe(0);
  });
});
