import { describe, expect, it } from "vitest";
import type { ApiMatch } from "./football-data";
import { deriveRound, mapMatch, mapStatus } from "./sync";

const baseMatch = {
  id: 1,
  utcDate: "2026-06-11T19:00:00Z",
  status: "TIMED",
  group: "GROUP_A",
  homeTeam: {
    name: "Argentina",
    crest: "https://crests.football-data.org/769.svg",
  },
  awayTeam: {
    name: "Francia",
    crest: "https://crests.football-data.org/773.svg",
  },
  score: { duration: "REGULAR", fullTime: { home: null, away: null } },
} satisfies Omit<ApiMatch, "stage" | "matchday">;

describe("deriveRound", () => {
  it("GROUP_STAGE matchday 1-3 → fechas 1-3", () => {
    expect(deriveRound("GROUP_STAGE", 1)).toEqual({
      number: 1,
      name: "Fase de grupos - Fecha 1",
      isKnockout: false,
    });
    expect(deriveRound("GROUP_STAGE", 3).number).toBe(3);
  });

  it("LAST_32 → 4, LAST_16 → 5, ..., FINAL → 9", () => {
    expect(deriveRound("LAST_32", null).number).toBe(4);
    expect(deriveRound("LAST_16", null).number).toBe(5);
    expect(deriveRound("QUARTER_FINALS", null).number).toBe(6);
    expect(deriveRound("SEMI_FINALS", null).number).toBe(7);
    expect(deriveRound("THIRD_PLACE", null).number).toBe(8);
    expect(deriveRound("FINAL", null).number).toBe(9);
  });

  it("eliminatoria → isKnockout true", () => {
    expect(deriveRound("LAST_32", null).isKnockout).toBe(true);
    expect(deriveRound("FINAL", null).isKnockout).toBe(true);
  });

  it("matchday inválido en GROUP_STAGE → throw", () => {
    expect(() => deriveRound("GROUP_STAGE", null)).toThrow();
    expect(() => deriveRound("GROUP_STAGE", 4)).toThrow();
  });
});

describe("mapStatus", () => {
  it("mapea cada status del API a nuestro enum", () => {
    expect(mapStatus("SCHEDULED")).toBe("scheduled");
    expect(mapStatus("TIMED")).toBe("scheduled");
    expect(mapStatus("IN_PLAY")).toBe("live");
    expect(mapStatus("PAUSED")).toBe("live");
    expect(mapStatus("FINISHED")).toBe("finished");
    expect(mapStatus("POSTPONED")).toBe("postponed");
    expect(mapStatus("SUSPENDED")).toBe("postponed");
    expect(mapStatus("CANCELLED")).toBe("postponed");
    expect(mapStatus("AWARDED")).toBe("postponed");
  });
});

describe("mapMatch", () => {
  it("partido programado sin resultado → scores null", () => {
    const m = mapMatch({
      ...baseMatch,
      stage: "GROUP_STAGE",
      matchday: 1,
    });
    expect(m.homeScore).toBeNull();
    expect(m.awayScore).toBeNull();
    expect(m.penaltyWinner).toBeNull();
    expect(m.status).toBe("scheduled");
    expect(m.homeTeam).toBe("Argentina");
    expect(m.roundNumber).toBe(1);
    expect(m.isKnockout).toBe(false);
  });

  it("partido finalizado en tiempo regular → scores cargados", () => {
    const m = mapMatch({
      ...baseMatch,
      stage: "GROUP_STAGE",
      matchday: 2,
      status: "FINISHED",
      score: {
        duration: "REGULAR",
        fullTime: { home: 3, away: 1 },
      },
    });
    expect(m.homeScore).toBe(3);
    expect(m.awayScore).toBe(1);
    expect(m.penaltyWinner).toBeNull();
    expect(m.status).toBe("finished");
  });

  it("eliminatoria con penales → toma resultado del alargue + ganador penal", () => {
    const m = mapMatch({
      ...baseMatch,
      stage: "LAST_16",
      matchday: null,
      status: "FINISHED",
      score: {
        duration: "PENALTY_SHOOTOUT",
        fullTime: { home: 1, away: 1 },
        extraTime: { home: 1, away: 1 },
        penalties: { home: 4, away: 2 },
      },
    });
    expect(m.homeScore).toBe(1);
    expect(m.awayScore).toBe(1);
    expect(m.penaltyWinner).toBe("Argentina");
    expect(m.isKnockout).toBe(true);
    expect(m.roundNumber).toBe(5);
  });

  it("eliminatoria con penales sin extraTime → fallback a fullTime", () => {
    const m = mapMatch({
      ...baseMatch,
      stage: "FINAL",
      matchday: null,
      status: "FINISHED",
      score: {
        duration: "PENALTY_SHOOTOUT",
        fullTime: { home: 2, away: 2 },
        penalties: { home: 5, away: 4 },
      },
    });
    expect(m.homeScore).toBe(2);
    expect(m.awayScore).toBe(2);
    expect(m.penaltyWinner).toBe("Argentina");
  });

  it("equipo TBD (name null) → string 'TBD' y crest null", () => {
    const m = mapMatch({
      ...baseMatch,
      stage: "LAST_32",
      matchday: null,
      group: null,
      homeTeam: { name: null, crest: null },
      awayTeam: { name: null, crest: null },
    });
    expect(m.homeTeam).toBe("TBD");
    expect(m.awayTeam).toBe("TBD");
    expect(m.homeTeamCrest).toBeNull();
    expect(m.awayTeamCrest).toBeNull();
    expect(m.groupName).toBeNull();
  });

  it("conserva crest y grupo de la API", () => {
    const m = mapMatch({
      ...baseMatch,
      stage: "GROUP_STAGE",
      matchday: 1,
    });
    expect(m.homeTeamCrest).toBe("https://crests.football-data.org/769.svg");
    expect(m.awayTeamCrest).toBe("https://crests.football-data.org/773.svg");
    expect(m.groupName).toBe("GROUP_A");
  });

  it("ganador por penales se resuelve aunque uno de los equipos sea TBD", () => {
    const m = mapMatch({
      ...baseMatch,
      stage: "QUARTER_FINALS",
      matchday: null,
      status: "FINISHED",
      homeTeam: { name: null, crest: null },
      awayTeam: {
        name: "Francia",
        crest: "https://crests.football-data.org/773.svg",
      },
      score: {
        duration: "PENALTY_SHOOTOUT",
        fullTime: { home: 1, away: 1 },
        extraTime: { home: 1, away: 1 },
        penalties: { home: 5, away: 4 },
      },
    });
    expect(m.penaltyWinner).toBe("TBD");
  });

  it("kickoffAt es Date válido derivado de utcDate ISO", () => {
    const m = mapMatch({
      ...baseMatch,
      stage: "GROUP_STAGE",
      matchday: 1,
    });
    expect(m.kickoffAt).toBeInstanceOf(Date);
    expect(m.kickoffAt.toISOString()).toBe("2026-06-11T19:00:00.000Z");
  });
});
