import { describe, expect, it } from "vitest";
import {
  deriveBetSide,
  outcomeFromScore,
  type BetOutcome,
} from "./bet-side";

describe("outcomeFromScore", () => {
  it("home gana", () => {
    expect(outcomeFromScore(2, 1)).toBe("home");
  });
  it("away gana", () => {
    expect(outcomeFromScore(0, 3)).toBe("away");
  });
  it("empate", () => {
    expect(outcomeFromScore(1, 1)).toBe("draw");
    expect(outcomeFromScore(0, 0)).toBe("draw");
  });
});

describe("deriveBetSide — los 9 combos pick × pronóstico", () => {
  const outcomes: BetOutcome[] = ["home", "draw", "away"];

  for (const pick of outcomes) {
    for (const pred of outcomes) {
      const expected = pick === pred ? "pro" : "con";
      it(`pick=${pick}, pronóstico=${pred} → ${expected}`, () => {
        expect(deriveBetSide(pick, pred)).toBe(expected);
      });
    }
  }
});
