import { describe, expect, it } from "vitest";
import {
  decideBet,
  realMatchOutcome,
  type DecideBet,
  type DecideEntry,
  type DecideMatch,
} from "./bet-resolution";

const KICKOFF = new Date("2026-06-15T18:00:00Z");
const BEFORE = KICKOFF.getTime() - 60_000;
const AFTER = KICKOFF.getTime() + 60_000;

function match(over: Partial<DecideMatch> = {}): DecideMatch {
  return {
    status: "scheduled",
    kickoffAt: KICKOFF,
    homeTeam: "Argentina",
    awayTeam: "Brasil",
    homeScore: null,
    awayScore: null,
    penaltyWinner: null,
    isKnockout: false,
    ...over,
  };
}

function bet(over: Partial<DecideBet> = {}): DecideBet {
  return { pick: "home", amount: 20, status: "open", ...over };
}

const pro = (userId: string): DecideEntry => ({ userId, side: "pro" });
const con = (userId: string): DecideEntry => ({ userId, side: "con" });

describe("realMatchOutcome", () => {
  it("home gana", () => {
    expect(realMatchOutcome(match({ status: "finished", homeScore: 2, awayScore: 1 }))).toBe(
      "home",
    );
  });
  it("away gana", () => {
    expect(realMatchOutcome(match({ status: "finished", homeScore: 0, awayScore: 2 }))).toBe(
      "away",
    );
  });
  it("empate en fase de grupos → draw", () => {
    expect(
      realMatchOutcome(match({ status: "finished", homeScore: 1, awayScore: 1 })),
    ).toBe("draw");
  });
  it("empate en knockout con penalty_winner home → home", () => {
    expect(
      realMatchOutcome(
        match({
          status: "finished",
          isKnockout: true,
          homeScore: 1,
          awayScore: 1,
          penaltyWinner: "Argentina",
        }),
      ),
    ).toBe("home");
  });
  it("empate en knockout con penalty_winner away → away", () => {
    expect(
      realMatchOutcome(
        match({
          status: "finished",
          isKnockout: true,
          homeScore: 0,
          awayScore: 0,
          penaltyWinner: "Brasil",
        }),
      ),
    ).toBe("away");
  });
  it("empate en knockout sin penalty_winner → null (esperar)", () => {
    expect(
      realMatchOutcome(
        match({ status: "finished", isKnockout: true, homeScore: 1, awayScore: 1 }),
      ),
    ).toBe(null);
  });
  it("no terminado → null", () => {
    expect(realMatchOutcome(match({ status: "live", homeScore: 1, awayScore: 0 }))).toBe(
      null,
    );
  });
});

describe("decideBet — antes y al kickoff", () => {
  it("abierta antes del kickoff → noop", () => {
    expect(decideBet(bet(), [pro("a"), con("b")], match(), BEFORE).action).toBe("noop");
  });

  it("kickoff alcanzado con oponente y open → lock", () => {
    const d = decideBet(bet(), [pro("a"), con("b")], match(), AFTER);
    expect(d.action).toBe("lock");
  });

  it("kickoff alcanzado sin oponente (solo creador) → cancel", () => {
    const d = decideBet(bet(), [pro("a")], match(), AFTER);
    expect(d.action).toBe("cancel");
  });

  it("ya lockeada antes del resultado → noop", () => {
    const d = decideBet(
      bet({ status: "locked" }),
      [pro("a"), con("b")],
      match(),
      AFTER,
    );
    expect(d.action).toBe("noop");
  });
});

describe("decideBet — resolución", () => {
  it("pro gana con varios ganadores, reparte el pozo", () => {
    // pick=home, resultado home. pro: creador + 1 acompañante. con: 1.
    // pot = 20 * 3 = 60. winners (pro) = 2 → payout 30 c/u.
    const d = decideBet(
      bet({ pick: "home" }),
      [pro("creator"), pro("ally"), con("rival")],
      match({ status: "finished", homeScore: 2, awayScore: 0 }),
      AFTER,
    );
    expect(d.action).toBe("resolve");
    if (d.action !== "resolve") return;
    expect(d.outcome).toBe("pro");
    const byUser = Object.fromEntries(d.deltas.map((x) => [x.userId, x.points]));
    expect(byUser).toEqual({ creator: 30 - 20, ally: 30 - 20, rival: -20 });
  });

  it("con gana con un solo ganador, se lleva todo el pozo", () => {
    // pick=home, resultado away (con gana). pro: creador. con: 1.
    // pot = 40. winners (con) = 1 → payout 40. neto con = +20, creador -20.
    const d = decideBet(
      bet({ pick: "home" }),
      [pro("creator"), con("rival")],
      match({ status: "finished", homeScore: 0, awayScore: 1 }),
      AFTER,
    );
    expect(d.action).toBe("resolve");
    if (d.action !== "resolve") return;
    expect(d.outcome).toBe("con");
    const byUser = Object.fromEntries(d.deltas.map((x) => [x.userId, x.points]));
    expect(byUser).toEqual({ creator: -20, rival: 40 - 20 });
  });

  it("división con residuo: el residuo sale de la economía", () => {
    // amount=10, 4 entries → pot 40. pick=home, resultado home.
    // pro = 3 ganadores → floor(40/3)=13 c/u (residuo 1 descartado).
    const d = decideBet(
      bet({ pick: "home", amount: 10 }),
      [pro("a"), pro("b"), pro("c"), con("d")],
      match({ status: "finished", homeScore: 1, awayScore: 0 }),
      AFTER,
    );
    expect(d.action).toBe("resolve");
    if (d.action !== "resolve") return;
    const byUser = Object.fromEntries(d.deltas.map((x) => [x.userId, x.points]));
    expect(byUser).toEqual({ a: 13 - 10, b: 13 - 10, c: 13 - 10, d: -10 });
    const sum = d.deltas.reduce((s, x) => s + x.points, 0);
    expect(sum).toBe(-1); // el residuo (1) desaparece de la economía
  });

  it("knockout empatado resuelto por penales", () => {
    // pick=home, knockout 1-1, penales para away (Brasil) → con gana.
    const d = decideBet(
      bet({ pick: "home" }),
      [pro("creator"), con("rival")],
      match({
        status: "finished",
        isKnockout: true,
        homeScore: 1,
        awayScore: 1,
        penaltyWinner: "Brasil",
      }),
      AFTER,
    );
    expect(d.action).toBe("resolve");
    if (d.action !== "resolve") return;
    expect(d.outcome).toBe("con");
  });

  it("terminado pero sin oponente → cancel (no resolve)", () => {
    const d = decideBet(
      bet(),
      [pro("creator")],
      match({ status: "finished", homeScore: 1, awayScore: 0 }),
      AFTER,
    );
    expect(d.action).toBe("cancel");
  });

  it("knockout empatado finished sin penalty_winner → noop (esperar)", () => {
    const d = decideBet(
      bet(),
      [pro("creator"), con("rival")],
      match({ status: "finished", isKnockout: true, homeScore: 1, awayScore: 1 }),
      AFTER,
    );
    expect(d.action).toBe("noop");
  });
});

describe("decideBet — estados terminales y postponed", () => {
  it("ya resuelta → noop", () => {
    expect(
      decideBet(bet({ status: "resolved" }), [pro("a"), con("b")], match(), AFTER).action,
    ).toBe("noop");
  });
  it("ya cancelada → noop", () => {
    expect(
      decideBet(bet({ status: "cancelled" }), [pro("a")], match(), AFTER).action,
    ).toBe("noop");
  });
  it("partido postergado → noop (espera)", () => {
    const d = decideBet(
      bet({ status: "locked" }),
      [pro("a"), con("b")],
      match({ status: "postponed" }),
      AFTER,
    );
    expect(d.action).toBe("noop");
  });
});
