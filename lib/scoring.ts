/**
 * Algoritmo de puntaje del prode. Ver specs/scoring.md.
 * Función pura, sin I/O. Cualquier cambio acá necesita actualizar
 * tanto la spec como los tests de paridad SQL/TS del ranking.
 */

export type Prediction = {
  homeScore: number;
  awayScore: number;
  penaltyWinner: string | null;
};

export type Match = {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  penaltyWinner: string | null;
  isKnockout: boolean;
};

export type ScoreResult = {
  points: number;
  isExact: boolean;
};

function sign(n: number): -1 | 0 | 1 {
  return n > 0 ? 1 : n < 0 ? -1 : 0;
}

export function score(p: Prediction, m: Match): ScoreResult {
  const exactScore = p.homeScore === m.homeScore && p.awayScore === m.awayScore;
  const winnerCorrect =
    sign(p.homeScore - p.awayScore) === sign(m.homeScore - m.awayScore);
  const homeGoalsCorrect = p.homeScore === m.homeScore;
  const awayGoalsCorrect = p.awayScore === m.awayScore;
  const oneTeamGoalsCorrect = homeGoalsCorrect !== awayGoalsCorrect;

  let base = 0;
  if (exactScore) base = 12;
  else if (winnerCorrect && oneTeamGoalsCorrect) base = 7;
  else if (winnerCorrect) base = 5;
  else if (oneTeamGoalsCorrect) base = 2;

  const matchWasDraw = m.homeScore === m.awayScore;
  const predWasDraw = p.homeScore === p.awayScore;
  const penaltyBonus =
    m.isKnockout &&
    matchWasDraw &&
    predWasDraw &&
    p.penaltyWinner !== null &&
    p.penaltyWinner === m.penaltyWinner
      ? 5
      : 0;

  return { points: base + penaltyBonus, isExact: exactScore };
}
