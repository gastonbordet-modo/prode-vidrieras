import { describe, expect, it } from "vitest";
import { deriveSideFromTeam, resolvePenaltyWinner } from "./penalty-winner";

const base = {
  isKnockout: true,
  homeScore: 1,
  awayScore: 1,
  homeTeam: "Argentina",
  awayTeam: "Francia",
};

describe("resolvePenaltyWinner", () => {
  it("knockout + empate + side 'home' → nombre home", () => {
    expect(resolvePenaltyWinner({ ...base, side: "home" })).toBe("Argentina");
  });

  it("knockout + empate + side 'away' → nombre away", () => {
    expect(resolvePenaltyWinner({ ...base, side: "away" })).toBe("Francia");
  });

  it("knockout + empate + side null → null (user no eligió)", () => {
    expect(resolvePenaltyWinner({ ...base, side: null })).toBeNull();
  });

  it("knockout + sin empate → null aunque side venga seteado", () => {
    expect(
      resolvePenaltyWinner({
        ...base,
        side: "home",
        homeScore: 2,
        awayScore: 1,
      }),
    ).toBeNull();
  });

  it("grupo (no knockout) + empate + side → null", () => {
    expect(
      resolvePenaltyWinner({ ...base, side: "home", isKnockout: false }),
    ).toBeNull();
  });
});

describe("deriveSideFromTeam", () => {
  it("nombre del home → 'home'", () => {
    expect(deriveSideFromTeam("Argentina", "Argentina", "Francia")).toBe(
      "home",
    );
  });

  it("nombre del away → 'away'", () => {
    expect(deriveSideFromTeam("Francia", "Argentina", "Francia")).toBe("away");
  });

  it("null → null", () => {
    expect(deriveSideFromTeam(null, "Argentina", "Francia")).toBeNull();
  });

  it("nombre que no matchea → null (defensa contra renames en DB)", () => {
    expect(deriveSideFromTeam("Brasil", "Argentina", "Francia")).toBeNull();
  });
});
