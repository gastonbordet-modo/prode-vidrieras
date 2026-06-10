/**
 * Cálculo del ranking del torneo. Funciones puras, sin I/O.
 * Reusan `score()` de lib/scoring.ts — única fuente de verdad del algoritmo.
 *
 * Tres vistas:
 *   - General: incluye ajustes. Tiebreaker puntos→exactos→createdAt.
 *   - Por fecha: filtra por roundNumber, NO incluye ajustes (reglamento).
 *   - Evolución: serie por usuario con puntos acumulados hasta cada fecha.
 *
 * Decisión: TS en vez de SQL — con ~10 usuarios × 104 partidos no hay
 * razón para duplicar la lógica del scoring en SQL.
 */

import { score, type Match as ScoringMatch } from "./scoring";
import type {
  StatsAdjustment,
  StatsMatch,
  StatsPrediction,
} from "./user-stats";

export type RankingUser = {
  id: string;
  nickname: string;
  createdAt: Date;
};

export type RankingRow = {
  userId: string;
  nickname: string;
  createdAt: Date;
  points: number;
  exacts: number;
  adjustments: number;
};

function asScoringMatch(m: StatsMatch): ScoringMatch | null {
  if (m.status !== "finished") return null;
  if (m.homeScore === null || m.awayScore === null) return null;
  return {
    homeTeam: m.homeTeam,
    awayTeam: m.awayTeam,
    homeScore: m.homeScore,
    awayScore: m.awayScore,
    penaltyWinner: m.penaltyWinner,
    isKnockout: m.isKnockout,
  };
}

function comparator(a: RankingRow, b: RankingRow): number {
  if (a.points !== b.points) return b.points - a.points;
  if (a.exacts !== b.exacts) return b.exacts - a.exacts;
  return a.createdAt.getTime() - b.createdAt.getTime();
}

/**
 * Ranking general (suma de todos los matches finished + ajustes).
 */
export function computeGeneralRanking(
  users: RankingUser[],
  predictions: StatsPrediction[],
  matchesById: Map<number, StatsMatch>,
  adjustments: StatsAdjustment[],
): RankingRow[] {
  const adjByUser = new Map<string, number>();
  for (const a of adjustments) {
    adjByUser.set(a.userId, (adjByUser.get(a.userId) ?? 0) + a.points);
  }

  const rows: RankingRow[] = users.map((u) => {
    let pts = 0;
    let exacts = 0;
    for (const p of predictions) {
      if (p.userId !== u.id) continue;
      const m = matchesById.get(p.matchId);
      if (!m) continue;
      const sm = asScoringMatch(m);
      if (!sm) continue;
      const r = score(
        {
          homeScore: p.homeScore,
          awayScore: p.awayScore,
          penaltyWinner: p.penaltyWinner,
        },
        sm,
      );
      pts += r.points;
      if (r.isExact) exacts++;
    }
    const adj = adjByUser.get(u.id) ?? 0;
    return {
      userId: u.id,
      nickname: u.nickname,
      createdAt: u.createdAt,
      points: pts + adj,
      exacts,
      adjustments: adj,
    };
  });

  return rows.sort(comparator);
}

/**
 * Ranking de una fecha puntual. No incluye ajustes
 * (los ajustes solo impactan en el general — ver reglamento).
 */
export function computeRoundRanking(
  users: RankingUser[],
  predictions: StatsPrediction[],
  matchesById: Map<number, StatsMatch>,
  roundNumber: number,
): RankingRow[] {
  const matchesInRound = new Set<number>();
  for (const m of matchesById.values()) {
    // Para fechas reprogramadas, contamos el partido en su fecha original
    // si la tenemos cargada; si no, en la actual. Esto matchea la spec.
    const round = m.originalRoundNumber ?? m.roundNumber;
    if (round === roundNumber) matchesInRound.add(m.id);
  }

  const rows: RankingRow[] = users.map((u) => {
    let pts = 0;
    let exacts = 0;
    for (const p of predictions) {
      if (p.userId !== u.id) continue;
      if (!matchesInRound.has(p.matchId)) continue;
      const m = matchesById.get(p.matchId);
      if (!m) continue;
      const sm = asScoringMatch(m);
      if (!sm) continue;
      const r = score(
        {
          homeScore: p.homeScore,
          awayScore: p.awayScore,
          penaltyWinner: p.penaltyWinner,
        },
        sm,
      );
      pts += r.points;
      if (r.isExact) exacts++;
    }
    return {
      userId: u.id,
      nickname: u.nickname,
      createdAt: u.createdAt,
      points: pts,
      exacts,
      adjustments: 0,
    };
  });

  return rows.sort(comparator);
}

export type RoundInfo = { number: number; name: string };

/**
 * Devuelve las fechas con al menos un partido finished, ordenadas asc por número.
 * El "número" viene de originalRoundNumber si existe (fecha reprogramada),
 * para evitar que un partido movido a una fecha futura cree una fecha fantasma.
 */
export function getFinishedRounds(matches: StatsMatch[]): RoundInfo[] {
  const byNumber = new Map<number, string>();
  for (const m of matches) {
    if (m.status !== "finished") continue;
    const number = m.originalRoundNumber ?? m.roundNumber;
    if (!byNumber.has(number)) byNumber.set(number, m.roundName);
  }
  return Array.from(byNumber.entries())
    .map(([number, name]) => ({ number, name }))
    .sort((a, b) => a.number - b.number);
}

export type EvolutionPoint = {
  round: number;
  name: string;
  points: number;
};

export type EvolutionSeries = {
  userId: string;
  nickname: string;
  data: EvolutionPoint[];
};

/**
 * Para cada usuario, devuelve los puntos acumulados al cierre de cada fecha
 * jugada. Acumulado = suma de TODOS los partidos finished con roundNumber
 * (u original) ≤ current. No incluye ajustes.
 */
export function computeEvolution(
  users: RankingUser[],
  predictions: StatsPrediction[],
  matches: StatsMatch[],
  finishedRounds: RoundInfo[],
): EvolutionSeries[] {
  const predsByUser = new Map<string, StatsPrediction[]>();
  for (const p of predictions) {
    const list = predsByUser.get(p.userId) ?? [];
    list.push(p);
    predsByUser.set(p.userId, list);
  }
  const matchById = new Map(matches.map((m) => [m.id, m]));

  return users.map((u) => {
    const userPreds = predsByUser.get(u.id) ?? [];
    const data: EvolutionPoint[] = finishedRounds.map((r) => {
      let pts = 0;
      for (const p of userPreds) {
        const m = matchById.get(p.matchId);
        if (!m) continue;
        const roundOfMatch = m.originalRoundNumber ?? m.roundNumber;
        if (roundOfMatch > r.number) continue;
        const sm = asScoringMatch(m);
        if (!sm) continue;
        pts += score(
          {
            homeScore: p.homeScore,
            awayScore: p.awayScore,
            penaltyWinner: p.penaltyWinner,
          },
          sm,
        ).points;
      }
      return { round: r.number, name: r.name, points: pts };
    });
    return { userId: u.id, nickname: u.nickname, data };
  });
}
