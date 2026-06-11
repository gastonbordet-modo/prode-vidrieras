import { describe, expect, it } from "vitest";
import { shouldClearChat } from "./clear-chat";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

describe("shouldClearChat", () => {
  it("sin fecha activa → no limpia", () => {
    const res = shouldClearChat({
      activeRound: null,
      lastClearedRound: 0,
      previousRoundEndMs: null,
      nowMs: 0,
    });
    expect(res.clear).toBe(false);
  });

  it("active === lastCleared → no limpia (ya al día)", () => {
    const res = shouldClearChat({
      activeRound: 2,
      lastClearedRound: 2,
      previousRoundEndMs: 0,
      nowMs: DAY * 365,
    });
    expect(res.clear).toBe(false);
  });

  it("active < lastCleared (override admin) → no limpia", () => {
    const res = shouldClearChat({
      activeRound: 1,
      lastClearedRound: 3,
      previousRoundEndMs: null,
      nowMs: 0,
    });
    expect(res.clear).toBe(false);
  });

  it("primera fecha, nunca limpió → avanza cursor sin truncar", () => {
    const res = shouldClearChat({
      activeRound: 1,
      lastClearedRound: 0,
      previousRoundEndMs: null,
      nowMs: 0,
    });
    expect(res.clear).toBe(true);
    if (res.clear) {
      expect(res.targetRound).toBe(1);
      expect(res.truncate).toBe(false);
    }
  });

  it("fecha 2 activa pero fecha 1 terminó hace 10h → no limpia (ventana)", () => {
    const res = shouldClearChat({
      activeRound: 2,
      lastClearedRound: 1,
      previousRoundEndMs: 100 * DAY,
      nowMs: 100 * DAY + 10 * HOUR,
    });
    expect(res.clear).toBe(false);
    if (!res.clear) expect(res.reason).toContain("~14h");
  });

  it("fecha 2 activa, fecha 1 terminó hace exactamente 24h → limpia", () => {
    const res = shouldClearChat({
      activeRound: 2,
      lastClearedRound: 1,
      previousRoundEndMs: 100 * DAY,
      nowMs: 100 * DAY + DAY,
    });
    expect(res.clear).toBe(true);
    if (res.clear) {
      expect(res.targetRound).toBe(2);
      expect(res.truncate).toBe(true);
    }
  });

  it("fecha 2 activa, fecha 1 terminó hace 36h → limpia", () => {
    const res = shouldClearChat({
      activeRound: 2,
      lastClearedRound: 1,
      previousRoundEndMs: 100 * DAY,
      nowMs: 100 * DAY + 36 * HOUR,
    });
    expect(res.clear).toBe(true);
    if (res.clear) expect(res.truncate).toBe(true);
  });

  it("active salta de 1 a 3 (fecha 2 sin partidos) y pasó la ventana → limpia", () => {
    // edge: previousRoundEndMs viene del caller, que mira active-1=2.
    // si no hay partidos en la 2, el caller devuelve null y caemos al
    // branch "sin fecha previa": avanzamos cursor sin truncar.
    const res = shouldClearChat({
      activeRound: 3,
      lastClearedRound: 1,
      previousRoundEndMs: null,
      nowMs: 100 * DAY,
    });
    expect(res.clear).toBe(true);
    if (res.clear) {
      expect(res.targetRound).toBe(3);
      expect(res.truncate).toBe(false);
    }
  });
});
