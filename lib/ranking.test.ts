import { describe, expect, it } from "vitest";
import {
  computeEvolution,
  computeGeneralRanking,
  computeRoundRanking,
  getFinishedRounds,
  type RankingUser,
} from "./ranking";
import type {
  StatsAdjustment,
  StatsMatch,
  StatsPrediction,
} from "./user-stats";

const user = (
  id: string,
  nickname: string,
  createdAt: string,
): RankingUser => ({
  id,
  nickname,
  createdAt: new Date(createdAt),
});

const finishedMatch = (
  id: number,
  round: number,
  home: number,
  away: number,
): StatsMatch => ({
  id,
  status: "finished",
  homeTeam: "Arg",
  awayTeam: "Fra",
  homeScore: home,
  awayScore: away,
  penaltyWinner: null,
  isKnockout: false,
  roundNumber: round,
  roundName: `Fecha ${round}`,
  originalRoundNumber: null,
});

const scheduledMatch = (id: number, round: number): StatsMatch => ({
  id,
  status: "scheduled",
  homeTeam: "Arg",
  awayTeam: "Fra",
  homeScore: null,
  awayScore: null,
  penaltyWinner: null,
  isKnockout: false,
  roundNumber: round,
  roundName: `Fecha ${round}`,
  originalRoundNumber: null,
});

const pred = (
  userId: string,
  matchId: number,
  home: number,
  away: number,
): StatsPrediction => ({
  userId,
  matchId,
  homeScore: home,
  awayScore: away,
  penaltyWinner: null,
});

const buildMap = (...ms: StatsMatch[]) =>
  new Map<number, StatsMatch>(ms.map((m) => [m.id, m]));

describe("computeGeneralRanking", () => {
  const u1 = user("u1", "ana", "2026-05-01T00:00:00Z");
  const u2 = user("u2", "ben", "2026-05-02T00:00:00Z");

  it("ordena por puntos desc", () => {
    // m1 real 3-1
    // u1 predijo 3-1 → exacto = 12
    // u2 predijo 3-0 → ganador + goles home = 7
    const ranking = computeGeneralRanking(
      [u1, u2],
      [pred("u1", 1, 3, 1), pred("u2", 1, 3, 0)],
      buildMap(finishedMatch(1, 1, 3, 1)),
      [],
    );
    expect(ranking.map((r) => r.userId)).toEqual(["u1", "u2"]);
    expect(ranking[0]?.points).toBe(12);
    expect(ranking[1]?.points).toBe(7);
  });

  it("desempate por exactos", () => {
    // Ambos suman 12 puntos, u1 con 1 exacto y u2 con 0 exactos.
    // u1: 12 (exacto en match 1)
    // u2: 7 + 5 = 12 — match 1 ganador+goles home / match 2 solo ganador
    const ranking = computeGeneralRanking(
      [u1, u2],
      [
        pred("u1", 1, 3, 1), // exacto → 12
        pred("u2", 1, 3, 0), // ganador + home goles → 7
        pred("u2", 2, 5, 1), // solo ganador (sin team correcto) → 5
      ],
      buildMap(finishedMatch(1, 1, 3, 1), finishedMatch(2, 1, 2, 0)),
      [],
    );
    expect(ranking[0]?.userId).toBe("u1");
    expect(ranking[0]?.exacts).toBe(1);
    expect(ranking[1]?.userId).toBe("u2");
    expect(ranking[1]?.exacts).toBe(0);
  });

  it("desempate final por createdAt asc (el más viejo gana)", () => {
    const ranking = computeGeneralRanking([u1, u2], [], buildMap(), []);
    expect(ranking.map((r) => r.userId)).toEqual(["u1", "u2"]);
  });

  it("incluye ajustes en el total general", () => {
    const adjustments: StatsAdjustment[] = [{ userId: "u2", points: 50 }];
    const ranking = computeGeneralRanking(
      [u1, u2],
      [pred("u1", 1, 3, 1)],
      buildMap(finishedMatch(1, 1, 3, 1)),
      adjustments,
    );
    expect(ranking[0]?.userId).toBe("u2");
    expect(ranking[0]?.points).toBe(50);
    expect(ranking[0]?.adjustments).toBe(50);
    expect(ranking[1]?.points).toBe(12);
  });

  it("usuarios sin predicciones aparecen con 0", () => {
    const ranking = computeGeneralRanking([u1, u2], [], buildMap(), []);
    expect(ranking).toHaveLength(2);
    expect(ranking.every((r) => r.points === 0)).toBe(true);
  });

  it("ignora matches no finished", () => {
    const ranking = computeGeneralRanking(
      [u1],
      [pred("u1", 1, 3, 1)],
      buildMap(scheduledMatch(1, 1)),
      [],
    );
    expect(ranking[0]?.points).toBe(0);
  });
});

describe("computeRoundRanking", () => {
  const u1 = user("u1", "ana", "2026-05-01T00:00:00Z");

  it("solo cuenta puntos de partidos de esa fecha", () => {
    const ranking = computeRoundRanking(
      [u1],
      [pred("u1", 1, 3, 1), pred("u1", 2, 1, 0)],
      buildMap(finishedMatch(1, 1, 3, 1), finishedMatch(2, 2, 1, 0)),
      1,
    );
    expect(ranking[0]?.points).toBe(12);
  });

  it("NO incluye ajustes (los ajustes solo impactan en general)", () => {
    const ranking = computeRoundRanking(
      [u1],
      [pred("u1", 1, 3, 1)],
      buildMap(finishedMatch(1, 1, 3, 1)),
      1,
    );
    expect(ranking[0]?.adjustments).toBe(0);
    expect(ranking[0]?.points).toBe(12);
  });
});

describe("getFinishedRounds", () => {
  it("devuelve solo fechas con al menos un match finished, ordenadas", () => {
    const rounds = getFinishedRounds([
      finishedMatch(1, 2, 1, 0),
      scheduledMatch(2, 1),
      finishedMatch(3, 1, 0, 0),
      scheduledMatch(4, 3),
    ]);
    expect(rounds.map((r) => r.number)).toEqual([1, 2]);
  });

  it("usa originalRoundNumber si está seteado (fechas reprogramadas)", () => {
    const reprogrammed: StatsMatch = {
      ...finishedMatch(1, 5, 1, 0),
      originalRoundNumber: 2,
    };
    const rounds = getFinishedRounds([reprogrammed]);
    expect(rounds.map((r) => r.number)).toEqual([2]);
  });
});

describe("computeEvolution", () => {
  const u1 = user("u1", "ana", "2026-05-01T00:00:00Z");
  const u2 = user("u2", "ben", "2026-05-02T00:00:00Z");

  it("cumulative: fecha 2 = puntos de fecha 1 + fecha 2", () => {
    // fecha 1: real 3-1, pred 3-1 → 12 (exacto)
    // fecha 2: real 2-0, pred 2-1 → 7 (ganador + goles home)
    // total fecha 1: 12 / total fecha 2: 19
    const matches: StatsMatch[] = [
      finishedMatch(1, 1, 3, 1),
      finishedMatch(2, 2, 2, 0),
    ];
    const series = computeEvolution(
      [u1],
      [pred("u1", 1, 3, 1), pred("u1", 2, 2, 1)],
      matches,
      getFinishedRounds(matches),
    );
    expect(series[0]?.data).toEqual([
      { round: 1, name: "Fecha 1", points: 12 },
      { round: 2, name: "Fecha 2", points: 19 },
    ]);
  });

  it("último punto ≈ ranking general sin ajustes", () => {
    const matches: StatsMatch[] = [
      finishedMatch(1, 1, 3, 1),
      finishedMatch(2, 2, 2, 0),
    ];
    const predictions = [
      pred("u1", 1, 3, 1), // 12
      pred("u1", 2, 1, 0), // 5 (ganador)
      pred("u2", 1, 0, 0), // 0
      pred("u2", 2, 2, 0), // 12 (exacto)
    ];
    const rounds = getFinishedRounds(matches);
    const series = computeEvolution([u1, u2], predictions, matches, rounds);
    const generalNoAdjustments = computeGeneralRanking(
      [u1, u2],
      predictions,
      new Map(matches.map((m) => [m.id, m])),
      [],
    );
    for (const u of [u1, u2]) {
      const last = series.find((s) => s.userId === u.id)?.data.at(-1)?.points;
      const total = generalNoAdjustments.find((r) => r.userId === u.id)?.points;
      expect(last).toBe(total);
    }
  });

  it("matches scheduled no aportan puntos", () => {
    const matches: StatsMatch[] = [
      finishedMatch(1, 1, 3, 1),
      scheduledMatch(2, 2),
    ];
    const series = computeEvolution(
      [u1],
      [pred("u1", 1, 3, 1), pred("u1", 2, 0, 0)],
      matches,
      getFinishedRounds(matches),
    );
    // Solo fecha 1 está finished → solo un punto
    expect(series[0]?.data).toHaveLength(1);
    expect(series[0]?.data[0]?.points).toBe(12);
  });
});
