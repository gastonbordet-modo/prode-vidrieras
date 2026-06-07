import { describe, expect, it } from "vitest";
import { deriveActiveRound } from "./active-round";

const row = (
  roundNumber: number,
  status: "scheduled" | "live" | "finished" | "postponed",
) => ({ roundNumber, status });

describe("deriveActiveRound", () => {
  it("matches vacíos → null (torneo no cargado)", () => {
    expect(deriveActiveRound([])).toBeNull();
  });

  it("todos scheduled → primer round con partidos", () => {
    expect(deriveActiveRound([row(1, "scheduled"), row(2, "scheduled")])).toBe(
      1,
    );
  });

  it("fecha 1 toda finished, fecha 2 scheduled → 2", () => {
    expect(
      deriveActiveRound([
        row(1, "finished"),
        row(1, "finished"),
        row(2, "scheduled"),
        row(3, "scheduled"),
      ]),
    ).toBe(2);
  });

  it("hay un partido live en fecha 1 → 1", () => {
    expect(
      deriveActiveRound([
        row(1, "finished"),
        row(1, "live"),
        row(2, "scheduled"),
      ]),
    ).toBe(1);
  });

  it("último round con scheduled gana sobre rounds anteriores con live", () => {
    // Caso raro: fecha 2 ya empezó pero fecha 1 todavía tiene scheduled
    // (no debería pasar en el Mundial, pero el min lo resuelve)
    expect(deriveActiveRound([row(1, "scheduled"), row(2, "live")])).toBe(1);
  });

  it("partidos postponed no cuentan como 'próxima fecha'", () => {
    // Si la fecha 1 entera está postponed y la 2 scheduled, la activa
    // pasa a ser la 2.
    expect(
      deriveActiveRound([
        row(1, "postponed"),
        row(1, "postponed"),
        row(2, "scheduled"),
      ]),
    ).toBe(2);
  });

  it("torneo terminado: todos finished → último round", () => {
    expect(
      deriveActiveRound([
        row(1, "finished"),
        row(7, "finished"),
        row(9, "finished"),
      ]),
    ).toBe(9);
  });

  it("torneo terminado con algún postponed en medio → último round", () => {
    expect(
      deriveActiveRound([
        row(1, "finished"),
        row(5, "postponed"),
        row(9, "finished"),
      ]),
    ).toBe(9);
  });
});
