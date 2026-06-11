/**
 * Tags de folklore: apodos derivados (no editables) que describen cómo
 * juega cada participante. Puros, sin I/O. Ver specs/features/008-tags.md.
 *
 * Muchos tags son COMPARATIVOS (peor del grupo, más exactos, #1, #2
 * sostenido, más posiciones subidas), así que computamos todos los usuarios
 * de una sola pasada: `computeAllTags` devuelve un Map userId → Tag[].
 *
 * Reusa los helpers de ranking (única fuente del scoring). Se calcula
 * on-demand en cada render (decisión v1: con ~10 usuarios el costo es
 * trivial y nos ahorra una tabla + cron).
 *
 * Resolución de cupos: un usuario muestra hasta 3 tags. Si califica para
 * más, se ordenan por `priority` ascendente (los efímeros de fecha y los
 * premios del torneo ganan a los de carácter) y se toman los primeros 3.
 */

import {
  computeGeneralRanking,
  getFinishedRounds,
  computeRoundRanking,
  type RankingUser,
} from "./ranking";
import type {
  StatsAdjustment,
  StatsMatch,
  StatsPrediction,
} from "./user-stats";

export type TagId =
  | "messi"
  | "cebollita"
  | "el_diez"
  | "brujita"
  | "mascherano"
  | "profeta"
  | "mufa"
  | "patadura"
  | "comeback"
  | "bilardista"
  | "menottista"
  | "pecho_frio"
  | "cabulero"
  | "el_loco";

export type Tag = {
  id: TagId;
  name: string;
  description: string;
  priority: number;
};

/** Catálogo fijo en código. El orden acá define el desempate dentro de
 * una misma prioridad (sort estable). */
const CATALOG: Tag[] = [
  // De torneo (acumulados)
  { id: "messi", name: "Messi", description: "El mejor.", priority: 1 },
  {
    id: "cebollita",
    name: "Cebollita Subcampeón",
    description: "Siempre cerca, nunca.",
    priority: 2,
  },
  {
    id: "el_diez",
    name: "El Diez",
    description: "Pega los resultados justos.",
    priority: 5,
  },
  {
    id: "brujita",
    name: "Brujita",
    description: "El que la ve a los ingleses.",
    priority: 6,
  },
  {
    id: "mascherano",
    name: "Mascherano",
    description: "El jefe, regular como pocos.",
    priority: 7,
  },
  // De fecha (efímeros)
  { id: "profeta", name: "Profeta", description: "La vio antes.", priority: 1 },
  { id: "mufa", name: "Mufa", description: "Toca madera.", priority: 2 },
  {
    id: "patadura",
    name: "Patadura",
    description: "Se quedó afuera.",
    priority: 3,
  },
  {
    id: "comeback",
    name: "El Comeback",
    description: "De atrás viene.",
    priority: 4,
  },
  // De carácter (sobre todos los pronósticos del torneo)
  {
    id: "bilardista",
    name: "Bilardista",
    description: "Resultados feos, ganador claro.",
    priority: 10,
  },
  {
    id: "menottista",
    name: "Menottista",
    description: "El fútbol es una fiesta.",
    priority: 10,
  },
  {
    id: "pecho_frio",
    name: "Pecho Frío",
    description: "No se la juega nunca.",
    priority: 11,
  },
  {
    id: "cabulero",
    name: "Cabulero",
    description: "El mismo número, siempre.",
    priority: 12,
  },
  {
    id: "el_loco",
    name: "El Loco",
    description: "Tira goleadas absurdas.",
    priority: 13,
  },
];

const BY_ID = new Map(CATALOG.map((t) => [t.id, t]));

/** Match con kickoff, necesario para ordenar cronológicamente (Brujita). */
export type TagMatch = StatsMatch & { kickoffAt: Date };

export type TagsInput = {
  users: RankingUser[];
  predictions: StatsPrediction[];
  matches: TagMatch[];
  adjustments: StatsAdjustment[];
};

const UGLY_SCORES = new Set(["1-0", "2-1", "1-2"]);
const ENGLAND = "England";

export function computeAllTags(input: TagsInput): Map<string, Tag[]> {
  const { users, predictions, matches, adjustments } = input;

  const matchesById = new Map<number, TagMatch>(matches.map((m) => [m.id, m]));
  // TagMatch extiende StatsMatch (suma kickoffAt); los helpers de ranking
  // solo leen, así que el cast es seguro (mismo patrón que ranking/page.tsx).
  const mStats = matchesById as unknown as Map<number, StatsMatch>;
  const finishedRounds = getFinishedRounds(matches);
  const lastFinished = finishedRounds.at(-1) ?? null;

  // userId → Set<TagId> de los que califica.
  const qual = new Map<string, Set<TagId>>();
  for (const u of users) qual.set(u.id, new Set());
  const add = (userId: string, id: TagId) => qual.get(userId)?.add(id);

  // Ranking general (con ajustes) — base de Messi y El Diez.
  const general = computeGeneralRanking(users, predictions, mStats, adjustments);

  // ---- Tags de carácter (siempre que el usuario tenga pronósticos) ----
  const predsByUser = new Map<string, StatsPrediction[]>();
  for (const p of predictions) {
    const list = predsByUser.get(p.userId) ?? [];
    list.push(p);
    predsByUser.set(p.userId, list);
  }

  for (const u of users) {
    const preds = predsByUser.get(u.id) ?? [];
    if (preds.length === 0) continue;

    let ugly = 0;
    let draws = 0;
    let totalGoals = 0;
    let bigMatches = 0;
    const exactCounts = new Map<string, number>();

    for (const p of preds) {
      const key = `${p.homeScore}-${p.awayScore}`;
      if (UGLY_SCORES.has(key)) ugly++;
      if (p.homeScore === p.awayScore) draws++;
      const sum = p.homeScore + p.awayScore;
      totalGoals += sum;
      if (sum >= 6) bigMatches++;
      exactCounts.set(key, (exactCounts.get(key) ?? 0) + 1);
    }

    if (ugly / preds.length > 0.5) add(u.id, "bilardista");
    if (totalGoals / preds.length >= 4) add(u.id, "menottista");
    if (draws / preds.length > 0.4) add(u.id, "pecho_frio");
    if ([...exactCounts.values()].some((c) => c >= 4)) add(u.id, "cabulero");
    if (bigMatches >= 3) add(u.id, "el_loco");
  }

  // ---- Brujita (de torneo, no necesita ranking) ----
  const englandChrono = matches
    .filter(
      (m) =>
        m.status === "finished" &&
        (m.homeTeam === ENGLAND || m.awayTeam === ENGLAND),
    )
    .sort((a, b) => a.kickoffAt.getTime() - b.kickoffAt.getTime());

  if (englandChrono.length > 0) {
    const predByUserMatch = new Map<string, Map<number, StatsPrediction>>();
    for (const p of predictions) {
      const inner = predByUserMatch.get(p.userId) ?? new Map();
      inner.set(p.matchId, p);
      predByUserMatch.set(p.userId, inner);
    }
    for (const u of users) {
      const inner = predByUserMatch.get(u.id);
      if (!inner) continue;
      let streak = 0;
      let best = 0;
      for (const m of englandChrono) {
        const p = inner.get(m.id);
        const win =
          !!p &&
          ((m.homeTeam === ENGLAND && p.homeScore > p.awayScore) ||
            (m.awayTeam === ENGLAND && p.awayScore > p.homeScore));
        if (win) {
          streak++;
          best = Math.max(best, streak);
        } else {
          streak = 0;
        }
      }
      if (best >= 3) add(u.id, "brujita");
    }
  }

  // Sin fechas cerradas no hay tags de fecha ni de ranking del torneo.
  if (finishedRounds.length === 0) {
    return finalize(qual);
  }

  // ---- Messi: #1 del ranking general (con puntos reales) ----
  if (general[0] && general[0].points > 0) add(general[0].userId, "messi");

  // ---- El Diez: más exactos del torneo (desempate por orden de ranking) ----
  const maxExacts = Math.max(...general.map((r) => r.exacts));
  if (maxExacts > 0) {
    const winner = general.find((r) => r.exacts === maxExacts);
    if (winner) add(winner.userId, "el_diez");
  }

  // ---- Standings acumulados por fecha (sin ajustes) para Comeback/Cebollita
  const cumCache = new Map<number, Map<string, number>>();
  const cumulativePositions = (roundNumber: number): Map<string, number> => {
    const cached = cumCache.get(roundNumber);
    if (cached) return cached;
    const filtered = new Map<number, StatsMatch>();
    for (const [id, m] of mStats) {
      const rn = m.originalRoundNumber ?? m.roundNumber;
      if (rn <= roundNumber) filtered.set(id, m);
    }
    const rows = computeGeneralRanking(users, predictions, filtered, []);
    const pos = new Map<string, number>();
    rows.forEach((r, i) => pos.set(r.userId, i + 1));
    cumCache.set(roundNumber, pos);
    return pos;
  };

  // ---- Cebollita Subcampeón: #2 en las últimas ≥3 fechas cerradas ----
  if (finishedRounds.length >= 3) {
    const lastThree = finishedRounds.slice(-3);
    const seconds = lastThree.map((r) => {
      const pos = cumulativePositions(r.number);
      return [...pos.entries()].find(([, p]) => p === 2)?.[0] ?? null;
    });
    const [first] = seconds;
    if (first && seconds.every((s) => s === first)) add(first, "cebollita");
  }

  // ---- El Comeback: más posiciones subidas en la última fecha cerrada ----
  if (finishedRounds.length >= 2 && lastFinished) {
    const prev = finishedRounds[finishedRounds.length - 2];
    const posPrev = cumulativePositions(prev.number);
    const posLast = cumulativePositions(lastFinished.number);
    let maxGain = 0;
    const gains = new Map<string, number>();
    for (const u of users) {
      const gain = (posPrev.get(u.id) ?? 0) - (posLast.get(u.id) ?? 0);
      gains.set(u.id, gain);
      if (gain > maxGain) maxGain = gain;
    }
    if (maxGain > 0) {
      for (const u of users) {
        if (gains.get(u.id) === maxGain) add(u.id, "comeback");
      }
    }
  }

  // ---- Mascherano: racha más larga de fechas sin 0 puntos (desempate ranking)
  const roundPoints = new Map<number, Map<string, number>>();
  for (const r of finishedRounds) {
    const rows = computeRoundRanking(users, predictions, mStats, r.number);
    roundPoints.set(r.number, new Map(rows.map((x) => [x.userId, x.points])));
  }
  const streakByUser = new Map<string, number>();
  for (const u of users) {
    let streak = 0;
    let best = 0;
    for (const r of finishedRounds) {
      const pts = roundPoints.get(r.number)?.get(u.id) ?? 0;
      if (pts > 0) {
        streak++;
        best = Math.max(best, streak);
      } else {
        streak = 0;
      }
    }
    streakByUser.set(u.id, best);
  }
  const maxStreak = Math.max(...streakByUser.values());
  if (maxStreak > 0) {
    const winner = general.find((r) => streakByUser.get(r.userId) === maxStreak);
    if (winner) add(winner.userId, "mascherano");
  }

  // ---- Tags de la última fecha cerrada: Profeta / Mufa / Patadura ----
  if (lastFinished) {
    const roundRows = computeRoundRanking(
      users,
      predictions,
      mStats,
      lastFinished.number,
    );
    const minPoints = Math.min(...roundRows.map((r) => r.points));
    for (const r of roundRows) {
      if (r.exacts >= 2) add(r.userId, "profeta");
      if (r.points === 0) add(r.userId, "mufa");
      if (r.points === minPoints) add(r.userId, "patadura");
    }
  }

  return finalize(qual);
}

/** Convierte el Set de ids por usuario en la lista final de ≤3 tags
 * ordenada por prioridad (desempate por orden de catálogo). */
function finalize(qual: Map<string, Set<TagId>>): Map<string, Tag[]> {
  const result = new Map<string, Tag[]>();
  for (const [userId, ids] of qual) {
    const tags = CATALOG.filter((t) => ids.has(t.id))
      .slice() // CATALOG ya está en orden de desempate
      .sort((a, b) => a.priority - b.priority)
      .slice(0, 3);
    result.set(userId, tags);
  }
  return result;
}

export { CATALOG as TAG_CATALOG, BY_ID as TAG_BY_ID };
