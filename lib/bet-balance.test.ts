import { describe, expect, it } from "vitest";
import { availableBalance, committedPoints } from "./bet-balance";

describe("committedPoints", () => {
  it("suma los montos de las entries abiertas", () => {
    expect(committedPoints([{ amount: 20 }, { amount: 5 }])).toBe(25);
  });
  it("sin entries → 0", () => {
    expect(committedPoints([])).toBe(0);
  });
});

describe("availableBalance", () => {
  it("ranking menos comprometido", () => {
    expect(availableBalance(50, [{ amount: 20 }, { amount: 10 }])).toBe(20);
  });
  it("puede ser negativo (saldo se arrastra)", () => {
    expect(availableBalance(5, [{ amount: 20 }])).toBe(-15);
  });
  it("sin apuestas abiertas → igual al ranking", () => {
    expect(availableBalance(42, [])).toBe(42);
  });
});
