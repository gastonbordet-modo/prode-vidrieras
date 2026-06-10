/**
 * Escenarios para previsualizar `MatchCard` + `PredictionForm` con
 * casos del flujo de eliminatorias. Solo se usan en /dev/predictions
 * (gateado por NODE_ENV).
 */

import type { matches, predictions } from "@/db/schema";

type Match = typeof matches.$inferSelect;
type Prediction = typeof predictions.$inferSelect;

export type MockPredictionScenario = {
  id: string;
  label: string;
  description: string;
  match: Match;
  prediction: Prediction | null;
};

function baseMatch(overrides: Partial<Match>): Match {
  const now = Date.now();
  return {
    id: 9001,
    externalId: 0,
    roundNumber: 1,
    roundName: "Fase de grupos - Fecha 1",
    isKnockout: false,
    homeTeam: "Argentina",
    awayTeam: "Francia",
    homeTeamCrest: "https://crests.football-data.org/762.svg",
    awayTeamCrest: "https://crests.football-data.org/773.svg",
    groupName: "GROUP_A",
    kickoffAt: new Date(now + 2 * 60 * 60 * 1000),
    homeScore: null,
    awayScore: null,
    penaltyWinner: null,
    status: "scheduled",
    originalRoundNumber: null,
    updatedAt: new Date(),
    ...overrides,
  };
}

function basePrediction(overrides: Partial<Prediction>): Prediction {
  return {
    id: 1,
    userId: "dev-user",
    matchId: 9001,
    homeScore: 1,
    awayScore: 1,
    penaltyWinner: null,
    updatedAt: new Date(),
    ...overrides,
  };
}

const SCENARIOS: MockPredictionScenario[] = [
  {
    id: "group-fresh",
    label: "Grupo · sin predicción",
    description:
      "Partido de grupos sin predicción cargada. El picker de penales NO aparece aunque cargues empate.",
    match: baseMatch({}),
    prediction: null,
  },
  {
    id: "knockout-fresh",
    label: "Octavos · sin predicción",
    description:
      "Cargá un empate (ej. 1-1) y vas a ver el picker de ganador por penales aparecer abajo.",
    match: baseMatch({
      id: 9002,
      isKnockout: true,
      roundNumber: 5,
      roundName: "Octavos de final",
      groupName: null,
    }),
    prediction: null,
  },
  {
    id: "knockout-draw-no-pick",
    label: "Octavos · empate sin elegir",
    description:
      "Predicción 1-1 cargada pero sin haber elegido ganador por penales. Mostrá el warning amarillo.",
    match: baseMatch({
      id: 9003,
      isKnockout: true,
      roundNumber: 5,
      roundName: "Octavos de final",
      groupName: null,
    }),
    prediction: basePrediction({
      matchId: 9003,
      homeScore: 1,
      awayScore: 1,
      penaltyWinner: null,
    }),
  },
  {
    id: "knockout-draw-picked",
    label: "Octavos · empate + Argentina",
    description:
      "Predicción 1-1 con Argentina como ganador por penales. Argentina resaltado en el picker.",
    match: baseMatch({
      id: 9004,
      isKnockout: true,
      roundNumber: 5,
      roundName: "Octavos de final",
      groupName: null,
    }),
    prediction: basePrediction({
      matchId: 9004,
      homeScore: 1,
      awayScore: 1,
      penaltyWinner: "Argentina",
    }),
  },
  {
    id: "knockout-locked",
    label: "Octavos · partido empezó (read-only)",
    description:
      "Kickoff en el pasado — read-only con la predicción + penales: Argentina.",
    match: baseMatch({
      id: 9005,
      isKnockout: true,
      roundNumber: 5,
      roundName: "Octavos de final",
      groupName: null,
      kickoffAt: new Date(Date.now() - 60 * 60 * 1000),
      status: "live",
    }),
    prediction: basePrediction({
      matchId: 9005,
      homeScore: 1,
      awayScore: 1,
      penaltyWinner: "Argentina",
    }),
  },
  {
    id: "knockout-finished",
    label: "Octavos · finalizado con resultado",
    description:
      "Partido terminado 1-1 + Argentina ganó penales. Tu predicción coincidió → cuando entres al historial vas a ver +17 pts.",
    match: baseMatch({
      id: 9006,
      isKnockout: true,
      roundNumber: 5,
      roundName: "Octavos de final",
      groupName: null,
      kickoffAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
      homeScore: 1,
      awayScore: 1,
      penaltyWinner: "Argentina",
      status: "finished",
    }),
    prediction: basePrediction({
      matchId: 9006,
      homeScore: 1,
      awayScore: 1,
      penaltyWinner: "Argentina",
    }),
  },
];

export { SCENARIOS };

export function getPredictionScenario(
  id: string | undefined,
): MockPredictionScenario {
  return SCENARIOS.find((s) => s.id === id) ?? SCENARIOS[0]!;
}
