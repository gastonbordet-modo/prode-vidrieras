import { describe, expect, it } from "vitest";
import { computeAllTags, type TagMatch, type TagId } from "./tags";
import type { RankingUser } from "./ranking";
import type { StatsPrediction } from "./user-stats";

function user(id: string, daysOld: number): RankingUser {
  return { id, nickname: id, createdAt: new Date(2026, 0, daysOld) };
}

function match(
  over: Partial<TagMatch> & { id: number; roundNumber: number },
): TagMatch {
  return {
    status: "finished",
    homeTeam: "Home",
    awayTeam: "Away",
    homeScore: 0,
    awayScore: 0,
    penaltyWinner: null,
    isKnockout: false,
    roundName: `Fecha ${over.roundNumber}`,
    originalRoundNumber: null,
    kickoffAt: new Date(2026, 5, over.id),
    ...over,
  };
}

function pred(
  userId: string,
  matchId: number,
  homeScore: number,
  awayScore: number,
): StatsPrediction {
  return { userId, matchId, homeScore, awayScore, penaltyWinner: null };
}

function tagsOf(map: Map<string, { id: TagId }[]>, userId: string): TagId[] {
  return (map.get(userId) ?? []).map((t) => t.id);
}

describe("tags de carácter (sin fechas cerradas → solo carácter)", () => {
  // Matches scheduled: no hay fechas cerradas, así que solo corren los
  // tags de carácter.
  const sched = (id: number) =>
    match({ id, roundNumber: 1, status: "scheduled" });
  const matches = [sched(1), sched(2), sched(3), sched(4)];

  function run(preds: StatsPrediction[]) {
    return computeAllTags({
      users: [user("u", 1)],
      predictions: preds,
      matches,
      adjustments: [],
    });
  }

  it("Bilardista: >50% resultados feos", () => {
    const t = run([pred("u", 1, 1, 0), pred("u", 2, 2, 1), pred("u", 3, 3, 3)]);
    expect(tagsOf(t, "u")).toContain("bilardista");
  });

  it("no Bilardista cuando ≤50% feos", () => {
    const t = run([pred("u", 1, 1, 0), pred("u", 2, 3, 3), pred("u", 3, 4, 4)]);
    expect(tagsOf(t, "u")).not.toContain("bilardista");
  });

  it("Menottista: promedio de goles ≥ 4", () => {
    const t = run([pred("u", 1, 3, 2), pred("u", 2, 2, 3), pred("u", 3, 4, 1)]);
    expect(tagsOf(t, "u")).toContain("menottista");
  });

  it("Pecho Frío: >40% empates", () => {
    const t = run([pred("u", 1, 1, 1), pred("u", 2, 2, 2), pred("u", 3, 1, 0)]);
    expect(tagsOf(t, "u")).toContain("pecho_frio");
  });

  it("Cabulero: mismo resultado exacto ≥4 veces", () => {
    const t = run([
      pred("u", 1, 2, 1),
      pred("u", 2, 2, 1),
      pred("u", 3, 2, 1),
      pred("u", 4, 2, 1),
    ]);
    expect(tagsOf(t, "u")).toContain("cabulero");
  });

  it("El Loco: ≥3 pronósticos con ≥6 goles", () => {
    const t = run([pred("u", 1, 3, 3), pred("u", 2, 4, 2), pred("u", 3, 5, 1)]);
    expect(tagsOf(t, "u")).toContain("el_loco");
  });

  it("usuario sin pronósticos no tiene tags", () => {
    const t = run([]);
    expect(tagsOf(t, "u")).toEqual([]);
  });
});

describe("tags de fecha y torneo + regla de los 3 cupos", () => {
  // Round 1, 2 partidos finished. A acierta ambos exactos; B falla todo.
  const matches = [
    match({ id: 1, roundNumber: 1, homeScore: 2, awayScore: 1 }),
    match({ id: 2, roundNumber: 1, homeScore: 0, awayScore: 0 }),
  ];
  const users = [user("A", 1), user("B", 2)];
  const preds = [
    pred("A", 1, 2, 1), // exacto
    pred("A", 2, 0, 0), // exacto
    pred("B", 1, 0, 3), // ganador equivocado → 0
    pred("B", 2, 1, 2), // empate real 0-0, sin aciertos → 0
  ];
  const t = computeAllTags({ users, predictions: preds, matches, adjustments: [] });

  it("A: Messi + Profeta + El Diez, limitado a 3 (Mascherano queda afuera)", () => {
    const ids = tagsOf(t, "A");
    expect(ids).toHaveLength(3);
    expect(ids).toEqual(["messi", "profeta", "el_diez"]);
    expect(ids).not.toContain("mascherano");
  });

  it("B: Mufa + Patadura (peor puntaje y 0 puntos)", () => {
    const ids = tagsOf(t, "B");
    expect(ids).toContain("mufa");
    expect(ids).toContain("patadura");
  });
});

describe("El Comeback: más posiciones subidas en la última fecha", () => {
  // 2 rondas de 1 partido (1-0 ambas).
  const matches = [
    match({ id: 1, roundNumber: 1, homeScore: 1, awayScore: 0 }),
    match({ id: 2, roundNumber: 2, homeScore: 1, awayScore: 0 }),
  ];
  const users = [user("A", 1), user("B", 2), user("C", 3)];
  const preds = [
    pred("A", 1, 1, 0), // 12
    pred("A", 2, 0, 1), // 0
    pred("B", 1, 0, 1), // 0
    pred("B", 2, 1, 0), // 12
    pred("C", 1, 0, 0), // 2
    pred("C", 2, 0, 0), // 2
  ];
  const t = computeAllTags({ users, predictions: preds, matches, adjustments: [] });

  it("B sube de #3 a #2 → Comeback", () => {
    expect(tagsOf(t, "B")).toContain("comeback");
  });
});

describe("Cebollita Subcampeón: #2 sostenido ≥3 fechas", () => {
  // 3 rondas de 1 partido 1-0. A siempre 1º, B siempre 2º, C siempre 3º.
  const matches = [
    match({ id: 1, roundNumber: 1, homeScore: 1, awayScore: 0 }),
    match({ id: 2, roundNumber: 2, homeScore: 1, awayScore: 0 }),
    match({ id: 3, roundNumber: 3, homeScore: 1, awayScore: 0 }),
  ];
  const users = [user("A", 1), user("B", 2), user("C", 3)];
  const preds = [
    pred("A", 1, 1, 0),
    pred("A", 2, 1, 0),
    pred("A", 3, 1, 0), // 12 c/u
    pred("B", 1, 2, 0),
    pred("B", 2, 2, 0),
    pred("B", 3, 2, 0), // 7 c/u (ganador + un equipo)
    pred("C", 1, 0, 0),
    pred("C", 2, 0, 0),
    pred("C", 3, 0, 0), // 2 c/u
  ];
  const t = computeAllTags({ users, predictions: preds, matches, adjustments: [] });

  it("B es subcampeón en las 3 fechas → Cebollita", () => {
    expect(tagsOf(t, "B")).toContain("cebollita");
  });

  it("A es Messi, no Cebollita", () => {
    expect(tagsOf(t, "A")).toContain("messi");
    expect(tagsOf(t, "A")).not.toContain("cebollita");
  });
});

describe("Brujita: racha de ganador a Inglaterra ≥3", () => {
  // 6 partidos de Inglaterra (local), cronológicos por kickoff.
  const eng = (id: number) =>
    match({
      id,
      roundNumber: 1,
      homeTeam: "England",
      awayTeam: `Rival${id}`,
      homeScore: 1,
      awayScore: 0,
      kickoffAt: new Date(2026, 5, id),
    });
  const matches = [eng(1), eng(2), eng(3), eng(4), eng(5), eng(6)];
  // D domina el ranking (acierta todo exacto) para aislar a Brujita de los
  // tags de mayor prioridad. W y L apuestan a Inglaterra con 2-0 (ganador,
  // sin exacto), para no acumular exactos ni quedar #1.
  const users = [user("D", 1), user("W", 2), user("L", 3)];

  // W: gana, gana, NO, gana, gana, gana → racha máxima 3.
  // L: gana, gana, NO, gana, gana, NO → racha máxima 2.
  const preds = [
    pred("D", 1, 1, 0),
    pred("D", 2, 1, 0),
    pred("D", 3, 1, 0),
    pred("D", 4, 1, 0),
    pred("D", 5, 1, 0),
    pred("D", 6, 1, 0),
    pred("W", 1, 2, 0),
    pred("W", 2, 2, 0),
    pred("W", 3, 0, 0),
    pred("W", 4, 2, 0),
    pred("W", 5, 2, 0),
    pred("W", 6, 2, 0),
    pred("L", 1, 2, 0),
    pred("L", 2, 2, 0),
    pred("L", 3, 0, 0),
    pred("L", 4, 2, 0),
    pred("L", 5, 2, 0),
    pred("L", 6, 0, 0),
  ];
  const t = computeAllTags({ users, predictions: preds, matches, adjustments: [] });

  it("W llega a racha 3 → Brujita", () => {
    expect(tagsOf(t, "W")).toContain("brujita");
  });

  it("L se queda en racha 2 → sin Brujita", () => {
    expect(tagsOf(t, "L")).not.toContain("brujita");
  });
});

describe("torneo no arrancó", () => {
  it("sin fechas cerradas ni pronósticos → nadie tiene tags", () => {
    const t = computeAllTags({
      users: [user("A", 1)],
      predictions: [],
      matches: [match({ id: 1, roundNumber: 1, status: "scheduled" })],
      adjustments: [],
    });
    expect(tagsOf(t, "A")).toEqual([]);
  });
});
