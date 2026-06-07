import { describe, expect, it } from "vitest";
import { score, type Match, type Prediction } from "./scoring";

const groupMatch = (home: number, away: number): Match => ({
  homeTeam: "Argentina",
  awayTeam: "Francia",
  homeScore: home,
  awayScore: away,
  penaltyWinner: null,
  isKnockout: false,
});

const knockoutDraw = (
  home: number,
  away: number,
  penaltyWinner: string,
): Match => ({
  homeTeam: "Argentina",
  awayTeam: "Francia",
  homeScore: home,
  awayScore: away,
  penaltyWinner,
  isKnockout: true,
});

const predict = (
  home: number,
  away: number,
  penaltyWinner: string | null = null,
): Prediction => ({ homeScore: home, awayScore: away, penaltyWinner });

describe("score — casos del reglamento (resultado real 3-1)", () => {
  const match = groupMatch(3, 1);

  it("3-1 = exacto → 12", () => {
    expect(score(predict(3, 1), match)).toEqual({ points: 12, isExact: true });
  });

  it("3-0 = ganador + goles Argentina → 7", () => {
    expect(score(predict(3, 0), match)).toEqual({ points: 7, isExact: false });
  });

  it("2-1 = ganador + goles Francia → 7", () => {
    expect(score(predict(2, 1), match)).toEqual({ points: 7, isExact: false });
  });

  it("2-0 = solo ganador → 5", () => {
    expect(score(predict(2, 0), match)).toEqual({ points: 5, isExact: false });
  });

  it("0-1 = solo goles de Francia → 2", () => {
    expect(score(predict(0, 1), match)).toEqual({ points: 2, isExact: false });
  });

  it("3-3 = empate predicho con goles Arg → 2", () => {
    expect(score(predict(3, 3), match)).toEqual({ points: 2, isExact: false });
  });

  it("0-2 = nada → 0", () => {
    expect(score(predict(0, 2), match)).toEqual({ points: 0, isExact: false });
  });

  it("0-0 = nada → 0", () => {
    expect(score(predict(0, 0), match)).toEqual({ points: 0, isExact: false });
  });
});

describe("score — penales (eliminatoria, resultado real 1-1 ganador Argentina)", () => {
  const match = knockoutDraw(1, 1, "Argentina");

  it("1-1 + Argentina → 17", () => {
    expect(score(predict(1, 1, "Argentina"), match)).toEqual({
      points: 17,
      isExact: true,
    });
  });

  it("1-1 + Francia → 12 (acierta exacto, falla penales)", () => {
    expect(score(predict(1, 1, "Francia"), match)).toEqual({
      points: 12,
      isExact: true,
    });
  });

  it("0-0 + Argentina → 10 (acertó empate + ganador penales)", () => {
    expect(score(predict(0, 0, "Argentina"), match)).toEqual({
      points: 10,
      isExact: false,
    });
  });

  it("0-0 + Francia → 5 (solo acertó empate)", () => {
    expect(score(predict(0, 0, "Francia"), match)).toEqual({
      points: 5,
      isExact: false,
    });
  });
});

describe("score — edge cases", () => {
  it("empate exacto 0-0 fase grupos → 12 (sin bonus penales aunque sea empate)", () => {
    const match = groupMatch(0, 0);
    expect(score(predict(0, 0), match)).toEqual({ points: 12, isExact: true });
  });

  it("predicción de empate en knockout pero resultado real NO fue empate → sin bonus de penales", () => {
    // Real: 2-1 (Argentina gana, knockout). Pred: 1-1 con penales Argentina.
    // Acierta goles de Francia (1) → 2 puntos. NO suma bonus de penales
    // porque el match no terminó empatado.
    const match = knockoutDraw(2, 1, "Argentina");
    expect(score(predict(1, 1, "Argentina"), match)).toEqual({
      points: 2,
      isExact: false,
    });
  });

  it("sin penalty_winner cargado en knockout empatado → solo puntos base", () => {
    const match = knockoutDraw(1, 1, "Argentina");
    expect(score(predict(1, 1, null), match)).toEqual({
      points: 12,
      isExact: true,
    });
  });

  it("knockout con match.penalty_winner null (no se jugaron penales) → base", () => {
    const match = knockoutDraw(1, 1, "" as string);
    const matchNoPenalties: Match = { ...match, penaltyWinner: null };
    expect(score(predict(1, 1, "Argentina"), matchNoPenalties)).toEqual({
      points: 12,
      isExact: true,
    });
  });
});
