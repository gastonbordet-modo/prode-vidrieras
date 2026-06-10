import { describe, expect, it } from "vitest";
import { getLockReason, isMatchEditable } from "./match-editable";

const T0 = Date.parse("2026-06-11T19:00:00Z");
const ONE_MIN = 60_000;

const match = (
  overrides: Partial<Parameters<typeof getLockReason>[0]> = {},
) => ({
  status: "scheduled" as const,
  kickoffAt: new Date(T0),
  isKnockout: false,
  ...overrides,
});

describe("getLockReason", () => {
  it("scheduled + grupo + kickoff futuro → null (editable)", () => {
    expect(getLockReason(match(), T0 - ONE_MIN)).toBeNull();
  });

  it("kickoff exacto a now → 'already_started' (kickoff inclusive)", () => {
    expect(getLockReason(match(), T0)).toBe("already_started");
  });

  it("kickoff en el pasado → 'already_started'", () => {
    expect(getLockReason(match(), T0 + ONE_MIN)).toBe("already_started");
  });

  it("status live → 'not_scheduled' aunque kickoff sea futuro", () => {
    expect(getLockReason(match({ status: "live" }), T0 - ONE_MIN)).toBe(
      "not_scheduled",
    );
  });

  it("status finished → 'not_scheduled'", () => {
    expect(getLockReason(match({ status: "finished" }), T0 - ONE_MIN)).toBe(
      "not_scheduled",
    );
  });

  it("status postponed con kickoff futuro → 'not_scheduled'", () => {
    expect(getLockReason(match({ status: "postponed" }), T0 - ONE_MIN)).toBe(
      "not_scheduled",
    );
  });

  it("knockout gana sobre cualquier otro check", () => {
    // Aunque sea scheduled y futuro, knockout queda bloqueado en 3b.
    expect(getLockReason(match({ isKnockout: true }), T0 - ONE_MIN)).toBe(
      "knockout",
    );
  });

  it("knockout pisa a 'already_started' (orden de evaluación)", () => {
    expect(getLockReason(match({ isKnockout: true }), T0 + ONE_MIN)).toBe(
      "knockout",
    );
  });
});

describe("isMatchEditable", () => {
  it("es true sólo cuando getLockReason devuelve null", () => {
    expect(isMatchEditable(match(), T0 - ONE_MIN)).toBe(true);
    expect(isMatchEditable(match(), T0)).toBe(false);
    expect(isMatchEditable(match({ status: "live" }), T0 - ONE_MIN)).toBe(
      false,
    );
    expect(isMatchEditable(match({ isKnockout: true }), T0 - ONE_MIN)).toBe(
      false,
    );
  });
});
