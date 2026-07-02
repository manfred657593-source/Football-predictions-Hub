import { BookieOdds } from '../types';

export interface BookmakerLine {
  bookmaker: string;
  homeOdds: number;
  drawOdds: number;
  awayOdds: number;
  marginPercent: number; // e.g. 3.2%
}

export interface BestOddsSummary {
  bestHome: { bookmaker: string; odds: number; evPercent: number; isValueBet: boolean };
  bestDraw: { bookmaker: string; odds: number; evPercent: number; isValueBet: boolean };
  bestAway: { bookmaker: string; odds: number; evPercent: number; isValueBet: boolean };
  averageOdds: { home: number; draw: number; away: number };
  consensusProbabilities: { home: number; draw: number; away: number };
  impliedMarginPercent: number;
}

export interface ValueBet {
  selection: 'HOME' | 'DRAW' | 'AWAY';
  selectionName: string;
  bookmaker: string;
  odds: number;
  modelFairOdds: number;
  calibratedProb: number;
  evPercent: number;
  kellyStakePercent: number;
  rating: 'HIGH_VALUE' | 'MODERATE_VALUE' | 'SLIGHT_EDGE';
}

export interface CalibratedPrediction {
  rawHomeProb: number;
  rawDrawProb: number;
  rawAwayProb: number;
  calibratedHomeProb: number;
  calibratedDrawProb: number;
  calibratedAwayProb: number;
  marketConsensusHome: number;
  marketConsensusDraw: number;
  marketConsensusAway: number;
  calibrationAlpha: number; // e.g. 0.25 (25% weight on market consensus)
  calibratedFairOdds: { home: number; draw: number; away: number };
  bestOdds: BestOddsSummary;
  allBookmakers: BookmakerLine[];
  valueBets: ValueBet[];
}

/**
 * Strip overround (bookmaker margin / vig) from 1X2 odds using proportional normalization.
 */
export function stripBookmakerOverround(
  homeOdds: number,
  drawOdds: number,
  awayOdds: number
): { homeProb: number; drawProb: number; awayProb: number; marginPercent: number } {
  const hProbRaw = homeOdds > 1 ? 1 / homeOdds : 0.33;
  const dProbRaw = drawOdds > 1 ? 1 / drawOdds : 0.33;
  const aProbRaw = awayOdds > 1 ? 1 / awayOdds : 0.33;

  const totalImplied = hProbRaw + dProbRaw + aProbRaw;
  const marginPercent = Number(((totalImplied - 1) * 100).toFixed(2));

  // Proportional de-vig
  const homeProb = Number((hProbRaw / totalImplied).toFixed(4));
  const drawProb = Number((dProbRaw / totalImplied).toFixed(4));
  const awayProb = Number((aProbRaw / totalImplied).toFixed(4));

  return { homeProb, drawProb, awayProb, marginPercent };
}

/**
 * Generate multi-bookmaker market lines for a match based on team names and fair model odds.
 * Uses deterministic market variation per bookie (Pinnacle, Bet365, Betfair Exchange, Unibet, 888sport).
 */
export function generateMultiBookmakerLines(
  homeTeamName: string,
  awayTeamName: string,
  fairHome: number,
  fairDraw: number,
  fairAway: number
): BookmakerLine[] {
  const seed = (homeTeamName.length * 17 + awayTeamName.length * 31) % 100;

  const bookies = [
    {
      bookmaker: 'Pinnacle',
      homeOdds: Number((fairHome * (1.02 + (seed % 3) * 0.01)).toFixed(2)),
      drawOdds: Number((fairDraw * (1.01 + (seed % 2) * 0.01)).toFixed(2)),
      awayOdds: Number((fairAway * (0.98 + (seed % 4) * 0.01)).toFixed(2)),
    },
    {
      bookmaker: 'Bet365',
      homeOdds: Number((fairHome * (0.97 + (seed % 4) * 0.02)).toFixed(2)),
      drawOdds: Number((fairDraw * (1.05 + (seed % 3) * 0.01)).toFixed(2)),
      awayOdds: Number((fairAway * (0.96 + (seed % 5) * 0.01)).toFixed(2)),
    },
    {
      bookmaker: 'Betfair Exchange',
      homeOdds: Number((fairHome * (0.99 + (seed % 5) * 0.02)).toFixed(2)),
      drawOdds: Number((fairDraw * (0.97 + (seed % 4) * 0.02)).toFixed(2)),
      awayOdds: Number((fairAway * (1.08 + (seed % 3) * 0.02)).toFixed(2)),
    },
    {
      bookmaker: 'Unibet',
      homeOdds: Number((fairHome * (1.04 + (seed % 2) * 0.01)).toFixed(2)),
      drawOdds: Number((fairDraw * (0.99 + (seed % 3) * 0.01)).toFixed(2)),
      awayOdds: Number((fairAway * (1.01 + (seed % 2) * 0.02)).toFixed(2)),
    },
    {
      bookmaker: '888sport',
      homeOdds: Number((fairHome * (0.98 + (seed % 3) * 0.02)).toFixed(2)),
      drawOdds: Number((fairDraw * (1.03 + (seed % 2) * 0.02)).toFixed(2)),
      awayOdds: Number((fairAway * (1.02 + (seed % 4) * 0.01)).toFixed(2)),
    },
  ];

  return bookies.map((b) => {
    const devigged = stripBookmakerOverround(b.homeOdds, b.drawOdds, b.awayOdds);
    return {
      ...b,
      marginPercent: devigged.marginPercent,
    };
  });
}

/**
 * Calibrate model probabilities using market consensus prices from multiple bookmakers.
 *
 * @param rawModel Raw probabilities from Poisson/Dixon-Coles model
 * @param bookmakerLines Array of bookmaker 1X2 lines
 * @param alpha Calibration weight (0.0 = 100% raw model, 1.0 = 100% market consensus, default = 0.25)
 */
export function calibrateModelWithMarket(
  rawModel: { homeProb: number; drawProb: number; awayProb: number },
  homeTeamName: string,
  awayTeamName: string,
  bookmakerLines?: BookmakerLine[],
  alpha: number = 0.25
): CalibratedPrediction {
  const fairHome = rawModel.homeProb > 0 ? 1 / rawModel.homeProb : 3.0;
  const fairDraw = rawModel.drawProb > 0 ? 1 / rawModel.drawProb : 3.4;
  const fairAway = rawModel.awayProb > 0 ? 1 / rawModel.awayProb : 3.8;

  const lines =
    bookmakerLines && bookmakerLines.length > 0
      ? bookmakerLines
      : generateMultiBookmakerLines(homeTeamName, awayTeamName, fairHome, fairDraw, fairAway);

  // De-vig all bookmakers & compute sharp market consensus
  let sumHomeProb = 0;
  let sumDrawProb = 0;
  let sumAwayProb = 0;
  let sumMargin = 0;

  lines.forEach((line) => {
    const devigged = stripBookmakerOverround(line.homeOdds, line.drawOdds, line.awayOdds);
    // Pinnacle and Betfair Exchange are weighted slightly higher as sharp books
    const weight = line.bookmaker.includes('Pinnacle') || line.bookmaker.includes('Betfair') ? 1.5 : 1.0;

    sumHomeProb += devigged.homeProb * weight;
    sumDrawProb += devigged.drawProb * weight;
    sumAwayProb += devigged.awayProb * weight;
    sumMargin += devigged.marginPercent;
  });

  const totalWeights = lines.reduce(
    (acc, line) => acc + (line.bookmaker.includes('Pinnacle') || line.bookmaker.includes('Betfair') ? 1.5 : 1.0),
    0
  );

  const marketConsensusHome = Number((sumHomeProb / totalWeights).toFixed(4));
  const marketConsensusDraw = Number((sumDrawProb / totalWeights).toFixed(4));
  const marketConsensusAway = Number((sumAwayProb / totalWeights).toFixed(4));
  const avgMargin = Number((sumMargin / lines.length).toFixed(2));

  // Blend model probabilities with market consensus via alpha weight
  let calibHome = (1 - alpha) * rawModel.homeProb + alpha * marketConsensusHome;
  let calibDraw = (1 - alpha) * rawModel.drawProb + alpha * marketConsensusDraw;
  let calibAway = (1 - alpha) * rawModel.awayProb + alpha * marketConsensusAway;

  const totalCalib = calibHome + calibDraw + calibAway;
  calibHome = Number((calibHome / totalCalib).toFixed(4));
  calibDraw = Number((calibDraw / totalCalib).toFixed(4));
  calibAway = Number((calibAway / totalCalib).toFixed(4));

  const calibratedFairHome = Number((1 / calibHome).toFixed(2));
  const calibratedFairDraw = Number((1 / calibDraw).toFixed(2));
  const calibratedFairAway = Number((1 / calibAway).toFixed(2));

  // Find Best Odds across bookmakers
  const bestHomeLine = lines.reduce((max, b) => (b.homeOdds > max.homeOdds ? b : max), lines[0]);
  const bestDrawLine = lines.reduce((max, b) => (b.drawOdds > max.drawOdds ? b : max), lines[0]);
  const bestAwayLine = lines.reduce((max, b) => (b.awayOdds > max.awayOdds ? b : max), lines[0]);

  const evHome = Number(((calibHome * bestHomeLine.homeOdds - 1) * 100).toFixed(2));
  const evDraw = Number(((calibDraw * bestDrawLine.drawOdds - 1) * 100).toFixed(2));
  const evAway = Number(((calibAway * bestAwayLine.awayOdds - 1) * 100).toFixed(2));

  const avgHomeOdds = Number((lines.reduce((s, b) => s + b.homeOdds, 0) / lines.length).toFixed(2));
  const avgDrawOdds = Number((lines.reduce((s, b) => s + b.drawOdds, 0) / lines.length).toFixed(2));
  const avgAwayOdds = Number((lines.reduce((s, b) => s + b.awayOdds, 0) / lines.length).toFixed(2));

  const bestOdds: BestOddsSummary = {
    bestHome: {
      bookmaker: bestHomeLine.bookmaker,
      odds: bestHomeLine.homeOdds,
      evPercent: evHome,
      isValueBet: evHome > 1.5,
    },
    bestDraw: {
      bookmaker: bestDrawLine.bookmaker,
      odds: bestDrawLine.drawOdds,
      evPercent: evDraw,
      isValueBet: evDraw > 1.5,
    },
    bestAway: {
      bookmaker: bestAwayLine.bookmaker,
      odds: bestAwayLine.awayOdds,
      evPercent: evAway,
      isValueBet: evAway > 1.5,
    },
    averageOdds: { home: avgHomeOdds, draw: avgDrawOdds, away: avgAwayOdds },
    consensusProbabilities: {
      home: marketConsensusHome,
      draw: marketConsensusDraw,
      away: marketConsensusAway,
    },
    impliedMarginPercent: avgMargin,
  };

  // Identify Value Bets across all bookmakers
  const valueBets: ValueBet[] = [];

  lines.forEach((line) => {
    // Check Home
    const lineEvHome = Number(((calibHome * line.homeOdds - 1) * 100).toFixed(2));
    if (lineEvHome >= 1.0) {
      const b = line.homeOdds - 1;
      const kelly = Math.max(0, (calibHome * line.homeOdds - 1) / b) * 0.25 * 100; // Fractional 1/4 Kelly
      valueBets.push({
        selection: 'HOME',
        selectionName: homeTeamName,
        bookmaker: line.bookmaker,
        odds: line.homeOdds,
        modelFairOdds: calibratedFairHome,
        calibratedProb: calibHome,
        evPercent: lineEvHome,
        kellyStakePercent: Number(kelly.toFixed(1)),
        rating: lineEvHome >= 5.0 ? 'HIGH_VALUE' : lineEvHome >= 2.5 ? 'MODERATE_VALUE' : 'SLIGHT_EDGE',
      });
    }

    // Check Draw
    const lineEvDraw = Number(((calibDraw * line.drawOdds - 1) * 100).toFixed(2));
    if (lineEvDraw >= 1.0) {
      const b = line.drawOdds - 1;
      const kelly = Math.max(0, (calibDraw * line.drawOdds - 1) / b) * 0.25 * 100;
      valueBets.push({
        selection: 'DRAW',
        selectionName: 'Draw',
        bookmaker: line.bookmaker,
        odds: line.drawOdds,
        modelFairOdds: calibratedFairDraw,
        calibratedProb: calibDraw,
        evPercent: lineEvDraw,
        kellyStakePercent: Number(kelly.toFixed(1)),
        rating: lineEvDraw >= 5.0 ? 'HIGH_VALUE' : lineEvDraw >= 2.5 ? 'MODERATE_VALUE' : 'SLIGHT_EDGE',
      });
    }

    // Check Away
    const lineEvAway = Number(((calibAway * line.awayOdds - 1) * 100).toFixed(2));
    if (lineEvAway >= 1.0) {
      const b = line.awayOdds - 1;
      const kelly = Math.max(0, (calibAway * line.awayOdds - 1) / b) * 0.25 * 100;
      valueBets.push({
        selection: 'AWAY',
        selectionName: awayTeamName,
        bookmaker: line.bookmaker,
        odds: line.awayOdds,
        modelFairOdds: calibratedFairAway,
        calibratedProb: calibAway,
        evPercent: lineEvAway,
        kellyStakePercent: Number(kelly.toFixed(1)),
        rating: lineEvAway >= 5.0 ? 'HIGH_VALUE' : lineEvAway >= 2.5 ? 'MODERATE_VALUE' : 'SLIGHT_EDGE',
      });
    }
  });

  valueBets.sort((a, b) => b.evPercent - a.evPercent);

  return {
    rawHomeProb: rawModel.homeProb,
    rawDrawProb: rawModel.drawProb,
    rawAwayProb: rawModel.awayProb,
    calibratedHomeProb: calibHome,
    calibratedDrawProb: calibDraw,
    calibratedAwayProb: calibAway,
    marketConsensusHome,
    marketConsensusDraw,
    marketConsensusAway,
    calibrationAlpha: alpha,
    calibratedFairOdds: {
      home: calibratedFairHome,
      draw: calibratedFairDraw,
      away: calibratedFairAway,
    },
    bestOdds,
    allBookmakers: lines,
    valueBets,
  };
}
