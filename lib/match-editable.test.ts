import { describe, expect, it } from "vitest";
import {
  getLockReason,
  isMatchEditable,
  isPenaltyApplicable,
} from "./match-editable";

const T0 = Date.parse("2026-06-11T19:00:00Z");
const ONE_MIN = 60_000;

const match = (
  overrides: Partial<Parameters<typeof getLockReason>[0]> = {},
) => ({
  status: "scheduled" as const,
  kickoffAt: new Date(T0),
  ...overrides,
});

describe("getLockReason", () => {
  it("scheduled + kickoff futuro → null (editable)", () => {
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
});

describe("isMatchEditable", () => {
  it("es true sólo cuando getLockReason devuelve null", () => {
    expect(isMatchEditable(match(), T0 - ONE_MIN)).toBe(true);
    expect(isMatchEditable(match(), T0)).toBe(false);
    expect(isMatchEditable(match({ status: "live" }), T0 - ONE_MIN)).toBe(
      false,
    );
  });
});

describe("isPenaltyApplicable", () => {
  it("knockout + empate cargado → true", () => {
    expect(isPenaltyApplicable(true, 1, 1)).toBe(true);
    expect(isPenaltyApplicable(true, 0, 0)).toBe(true);
  });

  it("knockout sin empate → false", () => {
    expect(isPenaltyApplicable(true, 2, 1)).toBe(false);
  });

  it("grupo (no knockout) → false aunque haya empate", () => {
    expect(isPenaltyApplicable(false, 1, 1)).toBe(false);
  });

  it("scores incompletos → false", () => {
    expect(isPenaltyApplicable(true, null, 1)).toBe(false);
    expect(isPenaltyApplicable(true, 1, null)).toBe(false);
    expect(isPenaltyApplicable(true, null, null)).toBe(false);
  });
});
