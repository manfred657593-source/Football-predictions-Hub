import { Team, PredictionResult, CorrectScore } from '../types';

/**
 * Calculates Poisson probability for k events with mean lambda
 */
export function poissonProb(k: number, lambda: number): number {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  let prob = Math.exp(-lambda);
  for (let i = 1; i <= k; i++) {
    prob *= lambda / i;
  }
  return prob;
}

/**
 * Dixon-Coles tau parameter adjusting for low-scoring dependence (0-0, 1-0, 0-1, 1-1)
 */
export function dixonColesTau(
  x: number,
  y: number,
  lambda: number,
  mu: number,
  rho: number = -0.06
): number {
  if (x === 0 && y === 0) {
    return Math.max(0.01, 1 - lambda * mu * rho);
  } else if (x === 1 && y === 0) {
    return Math.max(0.01, 1 + mu * rho);
  } else if (x === 0 && y === 1) {
    return Math.max(0.01, 1 + lambda * rho);
  } else if (x === 1 && y === 1) {
    return Math.max(0.01, 1 - rho);
  }
  return 1.0;
}

/**
 * Computes Dixon-Coles Poisson goal model prediction
 */
export function predictDixonColes(
  homeTeam: Team,
  awayTeam: Team,
  homeAdvantage: number = 1.22,
  rho: number = -0.06,
  formWeight: number = 0.15
): PredictionResult {
  // Recent form factor adjustment (-0.1 to +0.1)
  const getFormFactor = (form: ("W" | "D" | "L")[]) => {
    if (!form || form.length === 0) return 1.0;
    const score = form.reduce((acc, f) => acc + (f === 'W' ? 3 : f === 'D' ? 1 : 0), 0);
    const maxScore = form.length * 3;
    const ratio = score / maxScore;
    return 1.0 + (ratio - 0.5) * formWeight;
  };

  const homeFormAdj = getFormFactor(homeTeam.recentForm);
  const awayFormAdj = getFormFactor(awayTeam.recentForm);

  // Compute expected goals
  const lambda = Math.max(
    0.2,
    homeTeam.homeAttack * awayTeam.awayDefense * homeAdvantage * homeFormAdj
  );
  const mu = Math.max(
    0.2,
    awayTeam.awayAttack * homeTeam.homeDefense * awayFormAdj
  );

  const maxGoals = 6;
  const scoreMatrix: number[][] = Array.from({ length: maxGoals }, () =>
    Array(maxGoals).fill(0)
  );

  let totalProbSum = 0;
  let homeWinProb = 0;
  let drawProb = 0;
  let awayWinProb = 0;

  let over15Prob = 0;
  let over25Prob = 0;
  let over35Prob = 0;
  let bttsProb = 0;

  const correctScores: CorrectScore[] = [];

  for (let x = 0; x < maxGoals; x++) {
    const pX = poissonProb(x, lambda);
    for (let y = 0; y < maxGoals; y++) {
      const pY = poissonProb(y, mu);
      const tau = dixonColesTau(x, y, lambda, mu, rho);
      const prob = Math.max(0, pX * pY * tau);

      scoreMatrix[x][y] = prob;
      totalProbSum += prob;

      if (x > y) homeWinProb += prob;
      else if (x === y) drawProb += prob;
      else awayWinProb += prob;

      const totalGoals = x + y;
      if (totalGoals > 1.5) over15Prob += prob;
      if (totalGoals > 2.5) over25Prob += prob;
      if (totalGoals > 3.5) over35Prob += prob;

      if (x > 0 && y > 0) bttsProb += prob;

      correctScores.push({ homeGoals: x, awayGoals: y, probability: prob });
    }
  }

  // Normalize probabilities if needed
  if (totalProbSum > 0) {
    homeWinProb /= totalProbSum;
    drawProb /= totalProbSum;
    awayWinProb /= totalProbSum;
    over15Prob /= totalProbSum;
    over25Prob /= totalProbSum;
    over35Prob /= totalProbSum;
    bttsProb /= totalProbSum;

    correctScores.forEach((cs) => {
      cs.probability /= totalProbSum;
    });

    for (let x = 0; x < maxGoals; x++) {
      for (let y = 0; y < maxGoals; y++) {
        scoreMatrix[x][y] /= totalProbSum;
      }
    }
  }

  // Sort correct scores descending
  correctScores.sort((a, b) => b.probability - a.probability);

  const fairOddsHome = homeWinProb > 0 ? Number((1 / homeWinProb).toFixed(2)) : 99.0;
  const fairOddsDraw = drawProb > 0 ? Number((1 / drawProb).toFixed(2)) : 99.0;
  const fairOddsAway = awayWinProb > 0 ? Number((1 / awayWinProb).toFixed(2)) : 99.0;

  // Compute Dixon-Coles Standard Deviation & Visual Confidence Metrics
  const confidenceMetrics = computeDixonColesConfidence(
    lambda,
    mu,
    homeWinProb,
    drawProb,
    awayWinProb,
    scoreMatrix
  );

  return {
    homeTeamName: homeTeam.name,
    awayTeamName: awayTeam.name,
    homeExpectedGoals: Number(lambda.toFixed(2)),
    awayExpectedGoals: Number(mu.toFixed(2)),
    homeWinProb: Number(homeWinProb.toFixed(4)),
    drawProb: Number(drawProb.toFixed(4)),
    awayWinProb: Number(awayWinProb.toFixed(4)),
    over15Prob: Number(over15Prob.toFixed(4)),
    over25Prob: Number(over25Prob.toFixed(4)),
    over35Prob: Number(over35Prob.toFixed(4)),
    under25Prob: Number((1 - over25Prob).toFixed(4)),
    bttsProb: Number(bttsProb.toFixed(4)),
    scoreMatrix,
    correctScores,
    fairOddsHome,
    fairOddsDraw,
    fairOddsAway,
    goalDiffStdDev: confidenceMetrics.goalDiffStdDev,
    totalGoalsStdDev: confidenceMetrics.totalGoalsStdDev,
    outcomeStdDev: confidenceMetrics.outcomeStdDev,
    confidenceLevel: confidenceMetrics.confidenceLevel,
    confidenceRating: confidenceMetrics.confidenceRating,
  };
}

/**
 * Computes standard deviation metrics and visual confidence classification for Dixon-Coles output
 */
export function computeDixonColesConfidence(
  lambda: number,
  mu: number,
  homeWinProb: number,
  drawProb: number,
  awayWinProb: number,
  scoreMatrix: number[][]
): {
  goalDiffStdDev: number;
  totalGoalsStdDev: number;
  outcomeStdDev: number;
  confidenceLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  confidenceRating: number;
} {
  const maxGoals = scoreMatrix.length;
  let goalDiffMean = 0;
  let totalGoalsMean = 0;

  for (let x = 0; x < maxGoals; x++) {
    for (let y = 0; y < maxGoals; y++) {
      const prob = scoreMatrix[x]?.[y] || 0;
      goalDiffMean += (x - y) * prob;
      totalGoalsMean += (x + y) * prob;
    }
  }

  let goalDiffVar = 0;
  let totalGoalsVar = 0;

  for (let x = 0; x < maxGoals; x++) {
    for (let y = 0; y < maxGoals; y++) {
      const prob = scoreMatrix[x]?.[y] || 0;
      goalDiffVar += Math.pow((x - y) - goalDiffMean, 2) * prob;
      totalGoalsVar += Math.pow((x + y) - totalGoalsMean, 2) * prob;
    }
  }

  const goalDiffStdDev = Number(Math.sqrt(Math.max(0, goalDiffVar)).toFixed(2));
  const totalGoalsStdDev = Number(Math.sqrt(Math.max(0, totalGoalsVar)).toFixed(2));

  // Outcome standard deviation across [homeWinProb, drawProb, awayWinProb]
  const meanProb = 1 / 3;
  const outcomeVar = (
    Math.pow(homeWinProb - meanProb, 2) +
    Math.pow(drawProb - meanProb, 2) +
    Math.pow(awayWinProb - meanProb, 2)
  ) / 3;
  const outcomeStdDev = Number(Math.sqrt(Math.max(0, outcomeVar)).toFixed(4));

  // Signal-to-noise ratio: expected goal diff / goal diff std dev
  const goalDiffSNR = Math.abs(lambda - mu) / (goalDiffStdDev || 1);

  // Confidence score (0 to 100)
  const rawScore = (outcomeStdDev / 0.32) * 60 + Math.min(40, goalDiffSNR * 30);
  const confidenceRating = Math.min(99, Math.max(10, Math.round(rawScore)));

  let confidenceLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM';
  if (confidenceRating >= 62 || outcomeStdDev >= 0.13) {
    confidenceLevel = 'HIGH';
  } else if (confidenceRating <= 38 || outcomeStdDev < 0.065) {
    confidenceLevel = 'LOW';
  } else {
    confidenceLevel = 'MEDIUM';
  }

  return {
    goalDiffStdDev,
    totalGoalsStdDev,
    outcomeStdDev,
    confidenceLevel,
    confidenceRating,
  };
}
