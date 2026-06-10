/**
 * Datasets para previsualizar el ranking sin tocar la DB. Solo se usan
 * en las páginas bajo /dev/* (gateadas por NODE_ENV).
 *
 * El mock describe input crudo (users / predictions / matches /
 * adjustments). El cálculo pasa por las funciones reales de
 * lib/ranking.ts — así el preview refleja exactamente lo que verías
 * con datos en prod.
 */

import type { StatsAdjustment, StatsMatch, StatsPrediction } from "./user-stats";

export type MockUser = { id: string; nickname: string; createdAt: Date };

export type MockScenario = {
  id: string;
  label: string;
  description: string;
  users: MockUser[];
  matches: StatsMatch[];
  predictions: StatsPrediction[];
  adjustments: StatsAdjustment[];
  currentUserId: string;
};

const TEAMS = [
  ["Argentina", "Francia"],
  ["Brasil", "Alemania"],
  ["Inglaterra", "España"],
  ["Italia", "Países Bajos"],
  ["Portugal", "Croacia"],
  ["Uruguay", "Colombia"],
  ["México", "Estados Unidos"],
  ["Japón", "Corea del Sur"],
] as const;

let matchIdCounter = 0;
function finished(
  round: number,
  roundName: string,
  home: number,
  away: number,
  teamIdx = 0,
): StatsMatch {
  matchIdCounter++;
  const [homeTeam, awayTeam] = TEAMS[teamIdx % TEAMS.length]!;
  return {
    id: matchIdCounter,
    status: "finished",
    homeTeam,
    awayTeam,
    homeScore: home,
    awayScore: away,
    penaltyWinner: null,
    isKnockout: false,
    roundNumber: round,
    roundName,
    originalRoundNumber: null,
  };
}

function pred(
  userId: string,
  matchId: number,
  home: number,
  away: number,
): StatsPrediction {
  return { userId, matchId, homeScore: home, awayScore: away, penaltyWinner: null };
}

function user(idx: number, nickname: string): MockUser {
  return {
    id: `u${idx}`,
    nickname,
    createdAt: new Date(`2026-05-${String(idx + 1).padStart(2, "0")}T10:00:00Z`),
  };
}

// ─── Scenario: fresh ──────────────────────────────────────────────────
// Torneo recién arrancado, 1 fecha jugada con 4 partidos. 5 usuarios.
function buildFresh(): MockScenario {
  matchIdCounter = 0;
  const users = [
    user(0, "ana"),
    user(1, "beto"),
    user(2, "carla"),
    user(3, "dario"),
    user(4, "evita"),
  ];
  const matches = [
    finished(1, "Fase de grupos - Fecha 1", 2, 1, 0),
    finished(1, "Fase de grupos - Fecha 1", 0, 0, 1),
    finished(1, "Fase de grupos - Fecha 1", 3, 1, 2),
    finished(1, "Fase de grupos - Fecha 1", 1, 2, 3),
  ];
  const m = matches.map((mm) => mm.id);
  const predictions: StatsPrediction[] = [
    // ana: 2 exactos, alta
    pred("u0", m[0]!, 2, 1),
    pred("u0", m[1]!, 0, 0),
    pred("u0", m[2]!, 2, 1),
    pred("u0", m[3]!, 1, 2),
    // beto: mixto
    pred("u1", m[0]!, 1, 0),
    pred("u1", m[1]!, 1, 1),
    pred("u1", m[2]!, 3, 0),
    pred("u1", m[3]!, 0, 0),
    // carla: floja
    pred("u2", m[0]!, 0, 2),
    pred("u2", m[1]!, 2, 1),
    pred("u2", m[2]!, 0, 3),
    pred("u2", m[3]!, 3, 0),
    // dario: solo predijo dos
    pred("u3", m[0]!, 2, 0),
    pred("u3", m[2]!, 4, 2),
    // evita: nada
  ];
  return {
    id: "fresh",
    label: "Recién arrancado",
    description: "5 usuarios · 1 fecha jugada (4 partidos)",
    users,
    matches,
    predictions,
    adjustments: [],
    currentUserId: "u0",
  };
}

// ─── Scenario: midway ─────────────────────────────────────────────────
// 8 usuarios, 3 fechas jugadas con 4 partidos cada una. Incluye un ajuste.
function buildMidway(): MockScenario {
  matchIdCounter = 0;
  const users = [
    user(0, "ana"),
    user(1, "beto"),
    user(2, "carla"),
    user(3, "dario"),
    user(4, "evita"),
    user(5, "fede"),
    user(6, "gabi"),
    user(7, "hugo"),
  ];
  const matches: StatsMatch[] = [];
  // Fecha 1: 4 partidos
  matches.push(
    finished(1, "Fase de grupos - Fecha 1", 2, 1, 0),
    finished(1, "Fase de grupos - Fecha 1", 1, 1, 1),
    finished(1, "Fase de grupos - Fecha 1", 0, 2, 2),
    finished(1, "Fase de grupos - Fecha 1", 3, 0, 3),
  );
  // Fecha 2
  matches.push(
    finished(2, "Fase de grupos - Fecha 2", 1, 0, 4),
    finished(2, "Fase de grupos - Fecha 2", 2, 2, 5),
    finished(2, "Fase de grupos - Fecha 2", 0, 1, 6),
    finished(2, "Fase de grupos - Fecha 2", 4, 1, 7),
  );
  // Fecha 3
  matches.push(
    finished(3, "Fase de grupos - Fecha 3", 1, 1, 0),
    finished(3, "Fase de grupos - Fecha 3", 0, 0, 1),
    finished(3, "Fase de grupos - Fecha 3", 2, 0, 2),
    finished(3, "Fase de grupos - Fecha 3", 3, 2, 3),
  );

  // Predicciones: cada usuario tiene un "perfil" de acierto distinto
  // para generar puntajes variados.
  const predictions: StatsPrediction[] = [];
  // Predicciones de cada user contra cada match
  const profiles: Record<string, (m: StatsMatch) => [number, number]> = {
    // ana: muy buena (suele acertar exacto o muy cerca)
    u0: (mm) => [mm.homeScore!, mm.awayScore!],
    // beto: buena (acierta ganador casi siempre, goles a veces)
    u1: (mm) => [
      Math.max(0, mm.homeScore! + (mm.id % 2 === 0 ? 0 : 1)),
      Math.max(0, mm.awayScore!),
    ],
    // carla: media (acierta ganador a veces)
    u2: (mm) => [
      Math.max(0, mm.homeScore! + ((mm.id % 3) - 1)),
      Math.max(0, mm.awayScore! + (mm.id % 2)),
    ],
    // dario: medio-bajo
    u3: (mm) => [mm.awayScore!, mm.homeScore!], // tipo "espejado", suele errar
    // evita: regular, mejora con el tiempo
    u4: (mm) => [
      Math.max(0, mm.homeScore! - (mm.roundNumber > 1 ? 0 : 1)),
      mm.awayScore!,
    ],
    // fede: arranca mal, levanta
    u5: (mm) => [
      mm.roundNumber === 1 ? 5 : mm.homeScore!,
      mm.roundNumber === 1 ? 0 : mm.awayScore!,
    ],
    // gabi: estable
    u6: (mm) => [Math.max(0, mm.homeScore! - 1), mm.awayScore!],
    // hugo: caótico
    u7: (mm) => [(mm.id * 3) % 4, (mm.id * 5) % 3],
  };

  for (const u of users) {
    const f = profiles[u.id]!;
    for (const mm of matches) {
      const [h, a] = f(mm);
      predictions.push(pred(u.id, mm.id, h, a));
    }
  }

  const adjustments: StatsAdjustment[] = [
    { userId: "u3", points: 5 }, // dario recibió un bonus
    { userId: "u5", points: -3 }, // fede pagó una penalty
  ];

  return {
    id: "midway",
    label: "A mitad de camino",
    description: "8 usuarios · 3 fechas jugadas · incluye ajustes",
    users,
    matches,
    predictions,
    adjustments,
    currentUserId: "u0",
  };
}

// ─── Scenario: tied ───────────────────────────────────────────────────
// 4 usuarios diseñados para que 3 empaten en puntos, desempate por exactos.
function buildTied(): MockScenario {
  matchIdCounter = 0;
  const users = [
    user(0, "ana"),
    user(1, "beto"),
    user(2, "carla"),
    user(3, "dario"),
  ];
  // 2 partidos, real 2-1
  const matches = [
    finished(1, "Fase de grupos - Fecha 1", 2, 1, 0),
    finished(1, "Fase de grupos - Fecha 1", 1, 0, 1),
  ];
  const m = matches.map((mm) => mm.id);
  // ana: 2 exactos = 12 + 12 = 24
  // beto: 1 exacto + 1 ganador = 12 + 5 = 17
  // carla: 1 exacto + 1 ganador = 12 + 5 = 17 (empate con beto)
  // dario: 2 ganadores con goles parciales = 7 + 7 = 14
  const predictions: StatsPrediction[] = [
    pred("u0", m[0]!, 2, 1),
    pred("u0", m[1]!, 1, 0),
    pred("u1", m[0]!, 2, 1),
    pred("u1", m[1]!, 3, 2),
    pred("u2", m[0]!, 4, 3),
    pred("u2", m[1]!, 1, 0),
    pred("u3", m[0]!, 2, 0),
    pred("u3", m[1]!, 1, 1),
  ];
  return {
    id: "tied",
    label: "Empates",
    description: "4 usuarios · 2 partidos · desempates múltiples",
    users,
    matches,
    predictions,
    adjustments: [],
    currentUserId: "u2",
  };
}

// ─── Scenario: large ──────────────────────────────────────────────────
// 12 usuarios, 5 fechas, para stress-test del chart.
function buildLarge(): MockScenario {
  matchIdCounter = 0;
  const nicknames = [
    "ana", "beto", "carla", "dario", "evita", "fede",
    "gabi", "hugo", "ines", "javi", "kari", "lalo",
  ];
  const users = nicknames.map((n, i) => user(i, n));

  const matches: StatsMatch[] = [];
  for (let r = 1; r <= 5; r++) {
    for (let i = 0; i < 3; i++) {
      const h = (r * 7 + i * 3) % 4;
      const a = (r * 5 + i * 2) % 4;
      matches.push(finished(r, `Fase de grupos - Fecha ${r}`, h, a, i));
    }
  }

  const predictions: StatsPrediction[] = [];
  for (const u of users) {
    const idx = Number(u.id.slice(1));
    for (const mm of matches) {
      // Ruido pseudo-determinístico para cada user
      const noise = (idx * 13 + mm.id * 7) % 5;
      const h = Math.max(0, (mm.homeScore ?? 0) + (noise - 2));
      const a = Math.max(0, (mm.awayScore ?? 0) + ((noise + 1) % 5) - 2);
      predictions.push(pred(u.id, mm.id, h, a));
    }
  }

  return {
    id: "large",
    label: "Grupo grande",
    description: "12 usuarios · 5 fechas · stress-test del chart",
    users,
    matches,
    predictions,
    adjustments: [],
    currentUserId: "u3",
  };
}

const ALL: MockScenario[] = [buildFresh(), buildMidway(), buildTied(), buildLarge()];

export const SCENARIOS = ALL;

export function getScenario(id: string | undefined): MockScenario {
  return ALL.find((s) => s.id === id) ?? ALL[0]!;
}
