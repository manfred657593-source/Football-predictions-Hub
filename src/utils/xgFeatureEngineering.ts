import { Team } from '../types';

/**
 * Shot Input Attributes for Individual Shot xG Calculation
 */
export interface ShotInput {
  id?: string;
  minute: number;
  distanceMeters: number; // Distance from center of goal line (e.g. 5m to 35m)
  angleDegrees: number;   // Angle relative to goal center (0 deg = straight on, 60+ deg = acute)
  shotType: 'open_play' | 'penalty' | 'direct_free_kick' | 'header' | 'corner_kick' | 'fast_break' | 'volley';
  bodyPart: 'right_foot' | 'left_foot' | 'head' | 'other';
  isBigChance: boolean;
  defendersInPath: number; // 0 to 5
  assistType: 'through_ball' | 'cross' | 'cutback' | 'rebound' | 'solo' | 'set_piece';
  isHome: boolean;
  teamName: string;
  shooterName?: string;
}

/**
 * Shot xG Calculation Result
 */
export interface ShotXGResult {
  shot: ShotInput;
  xgValue: number;         // e.g. 0.38
  conversionProbabilityPercent: number; // e.g. 38.0%
  dangerRating: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL_GOAL_CHANCE';
  shotQualityScore: number; // 0 - 100 rating
  factorsBreakdown: {
    distancePenalty: number;
    angleFactor: number;
    headerAdjustment: number;
    bigChanceBonus: number;
    defenderPressurePenalty: number;
    assistBonus: number;
  };
}

/**
 * Match Shot Log and Aggregate xG Summary
 */
export interface MatchXGSummary {
  matchId: string;
  homeTeamName: string;
  awayTeamName: string;
  leagueName: string;
  homeTotalXG: number;
  awayTotalXG: number;
  homeNpxG: number;          // Non-penalty xG
  awayNpxG: number;
  homeShotsCount: number;
  awayShotsCount: number;
  homeShotsOnTarget: number;
  awayShotsOnTarget: number;
  homeAvgShotQuality: number; // Average xG per shot
  awayAvgShotQuality: number;
  homeBigChances: number;
  awayBigChances: number;
  homeActualGoals: number;
  awayActualGoals: number;
  homeFinishingDiff: number; // Actual Goals - xG
  awayFinishingDiff: number;
  shotsLog: ShotXGResult[];
  xgTimeline: { minute: number; homeCumXG: number; awayCumXG: number }[];
}

/**
 * Team Rolling xG Performance Metrics Over Time
 */
export interface TeamXGPerformanceProfile {
  teamId: string;
  teamName: string;
  league: string;
  matchesAnalyzed: number;
  // Rolling Metrics
  rolling5XGCreatedAvg: number;
  rolling5XGConcededAvg: number;
  rolling10XGCreatedAvg: number;
  rolling10XGConcededAvg: number;
  rollingNpxGDiff: number;       // Non-penalty xG differential per match
  xgFinishingEfficiency: number; // Goals Scored / xG Created (1.0 = normal, >1.0 = overperforming/clinical)
  xgDefensiveSolidty: number;    // xG Conceded / Actual Goals Conceded (>1.0 = lucky/strong GK, <1.0 = leaking goals)
  xgDominanceIndex: number;      // Share of match xG generated (e.g. 62%)
  avgShotsPerGame: number;
  avgShotQuality: number;        // Average xG per shot attempt
  xgConsistencyIndex: number;    // Low variance = consistent xG creation
  xgTrendMomentum: number;       // 3-match vs 10-match rolling velocity (+0.15 = surging)
  historicalMatchLogs: MatchXGSummary[];
}

/**
 * Complete Engineered xG Features for Prediction Engines
 */
export interface EngineeredXGFeatures {
  homeRollingXG: number;
  awayRollingXG: number;
  homeRollingXGA: number;
  awayRollingXGA: number;
  homeNpxGDiff: number;
  awayNpxGDiff: number;
  homeFinishingEfficiency: number;
  awayFinishingEfficiency: number;
  homeDefensiveSolidty: number;
  awayDefensiveSolidty: number;
  homeShotQuality: number;
  awayShotQuality: number;
  homeXGTrendMomentum: number;
  awayXGTrendMomentum: number;
  xgGameDominanceDiff: number;
  expectedGoalDifferential: number;
}

// ============================================================================
// 1. SHOT-LEVEL xG CALCULATION MODEL (LOGISTIC REGRESSION & CALIBRATION)
// ============================================================================

/**
 * Calculates Expected Goals (xG) for an individual shot based on shot geometry,
 * body part, situation, defenders in path, and big chance classification.
 */
export function calculateShotXG(shot: ShotInput): ShotXGResult {
  // Penalty shortcut: Penalty kick xG is fixed around ~0.78 globally
  if (shot.shotType === 'penalty') {
    return {
      shot,
      xgValue: 0.78,
      conversionProbabilityPercent: 78.0,
      dangerRating: 'CRITICAL_GOAL_CHANCE',
      shotQualityScore: 92,
      factorsBreakdown: {
        distancePenalty: 0,
        angleFactor: 1.0,
        headerAdjustment: 1.0,
        bigChanceBonus: 0.25,
        defenderPressurePenalty: 0,
        assistBonus: 0,
      },
    };
  }

  // Distance decay logit model
  // Goal line center is (0,0). Distance in meters d.
  const d = Math.max(1, shot.distanceMeters);
  const angleRad = (Math.min(85, shot.angleDegrees) * Math.PI) / 180;

  // Base intercept
  let logit = -0.85;

  // Distance penalty: Log distance penalty
  const distancePenalty = -0.14 * d;
  logit += distancePenalty;

  // Angle factor: Shots from acute angles drop significantly in xG
  const angleFactor = Math.cos(angleRad);
  logit += 0.8 * angleFactor;

  // Body part & Shot type adjustments
  let headerAdjustment = 1.0;
  if (shot.bodyPart === 'head' || shot.shotType === 'header') {
    logit -= 0.65;
    headerAdjustment = 0.52;
  } else if (shot.shotType === 'volley') {
    logit -= 0.35;
  } else if (shot.shotType === 'direct_free_kick') {
    logit -= 0.80;
  }

  // Assist type bonuses
  let assistBonus = 0;
  if (shot.assistType === 'cutback') {
    logit += 0.45;
    assistBonus = 0.45;
  } else if (shot.assistType === 'through_ball' || shot.shotType === 'fast_break') {
    logit += 0.40;
    assistBonus = 0.40;
  } else if (shot.assistType === 'rebound') {
    logit += 0.55;
    assistBonus = 0.55;
  }

  // Defender pressure penalty
  const defenderPressurePenalty = -0.18 * Math.min(5, shot.defendersInPath);
  logit += defenderPressurePenalty;

  // Big chance bonus
  let bigChanceBonus = 0;
  if (shot.isBigChance) {
    logit += 1.25;
    bigChanceBonus = 1.25;
  }

  // Logistic Sigmoid Function: 1 / (1 + exp(-logit))
  let rawXG = 1 / (1 + Math.exp(-logit));

  // Cap xG bounded in [0.01, 0.96]
  rawXG = Number(Math.max(0.01, Math.min(0.96, rawXG)).toFixed(3));

  const conversionProbabilityPercent = Number((rawXG * 100).toFixed(1));

  let dangerRating: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL_GOAL_CHANCE' = 'LOW';
  if (rawXG >= 0.45) dangerRating = 'CRITICAL_GOAL_CHANCE';
  else if (rawXG >= 0.20) dangerRating = 'HIGH';
  else if (rawXG >= 0.08) dangerRating = 'MEDIUM';

  const shotQualityScore = Math.min(100, Math.round(rawXG * 115));

  return {
    shot,
    xgValue: rawXG,
    conversionProbabilityPercent,
    dangerRating,
    shotQualityScore,
    factorsBreakdown: {
      distancePenalty: Number(distancePenalty.toFixed(2)),
      angleFactor: Number(angleFactor.toFixed(2)),
      headerAdjustment,
      bigChanceBonus,
      defenderPressurePenalty: Number(defenderPressurePenalty.toFixed(2)),
      assistBonus,
    },
  };
}

// ============================================================================
// 2. MATCH-LEVEL xG AGGREGATOR & DETERMINISTIC SHOT LOG GENERATOR
// ============================================================================

/**
 * Generates realistic match shot logs and calculates match-level xG aggregates
 * including non-penalty xG, timeline progression, shot quality, and finishing differentials.
 */
export function generateMatchShotLogs(
  homeTeam: Team,
  awayTeam: Team,
  homeScore?: number,
  awayScore?: number
): MatchXGSummary {
  const seed = (homeTeam.name + awayTeam.name)
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);

  const homeBaseXG = homeTeam.xGPerGame || 1.8;
  const awayBaseXG = awayTeam.xGPerGame || 1.3;

  const homeShotsCount = Math.round(10 + (seed % 7) + homeBaseXG * 2);
  const awayShotsCount = Math.round(8 + ((seed * 3) % 6) + awayBaseXG * 1.8);

  const shotsLog: ShotXGResult[] = [];

  // Generate Home Shots
  for (let i = 1; i <= homeShotsCount; i++) {
    const minute = Math.min(94, Math.round((90 / homeShotsCount) * i + (Math.sin(seed + i) * 3)));
    const distanceMeters = Math.round(6 + ((seed * i * 7) % 22));
    const angleDegrees = Math.round(((seed * i * 13) % 45));
    const isBig = (seed + i * 5) % 7 === 0;
    const bodyPart = (seed + i) % 4 === 0 ? 'head' : 'right_foot';
    const shotType = isBig ? 'open_play' : (seed + i) % 6 === 0 ? 'header' : 'open_play';
    const assistType = isBig ? 'cutback' : (seed + i) % 3 === 0 ? 'cross' : 'solo';

    const shotInput: ShotInput = {
      id: `h-shot-${i}`,
      minute,
      distanceMeters,
      angleDegrees,
      shotType,
      bodyPart,
      isBigChance: isBig,
      defendersInPath: isBig ? 1 : Math.round((seed + i) % 4),
      assistType,
      isHome: true,
      teamName: homeTeam.name,
      shooterName: `${homeTeam.name} Forward ${((i % 4) + 1)}`,
    };

    shotsLog.push(calculateShotXG(shotInput));
  }

  // Generate Away Shots
  for (let j = 1; j <= awayShotsCount; j++) {
    const minute = Math.min(94, Math.round((90 / awayShotsCount) * j + (Math.cos(seed + j) * 3)));
    const distanceMeters = Math.round(7 + ((seed * j * 11) % 24));
    const angleDegrees = Math.round(((seed * j * 17) % 50));
    const isBig = (seed + j * 9) % 8 === 0;
    const bodyPart = (seed + j) % 5 === 0 ? 'head' : 'left_foot';
    const shotType = isBig ? 'open_play' : (seed + j) % 7 === 0 ? 'header' : 'open_play';
    const assistType = isBig ? 'through_ball' : 'solo';

    const shotInput: ShotInput = {
      id: `a-shot-${j}`,
      minute,
      distanceMeters,
      angleDegrees,
      shotType,
      bodyPart,
      isBigChance: isBig,
      defendersInPath: isBig ? 1 : Math.round((seed + j) % 4),
      assistType,
      isHome: false,
      teamName: awayTeam.name,
      shooterName: `${awayTeam.name} Striker ${((j % 3) + 1)}`,
    };

    shotsLog.push(calculateShotXG(shotInput));
  }

  // Sort shots chronologically
  shotsLog.sort((a, b) => a.shot.minute - b.shot.minute);

  // Compute Aggregates
  let homeTotalXG = 0;
  let awayTotalXG = 0;
  let homeNpxG = 0;
  let awayNpxG = 0;
  let homeShotsOnTarget = 0;
  let awayShotsOnTarget = 0;
  let homeBigChances = 0;
  let awayBigChances = 0;

  const xgTimeline: { minute: number; homeCumXG: number; awayCumXG: number }[] = [
    { minute: 0, homeCumXG: 0, awayCumXG: 0 },
  ];

  shotsLog.forEach((res) => {
    if (res.shot.isHome) {
      homeTotalXG += res.xgValue;
      if (res.shot.shotType !== 'penalty') homeNpxG += res.xgValue;
      if (res.xgValue > 0.08) homeShotsOnTarget++;
      if (res.shot.isBigChance) homeBigChances++;
    } else {
      awayTotalXG += res.xgValue;
      if (res.shot.shotType !== 'penalty') awayNpxG += res.xgValue;
      if (res.xgValue > 0.08) awayShotsOnTarget++;
      if (res.shot.isBigChance) awayBigChances++;
    }

    xgTimeline.push({
      minute: res.shot.minute,
      homeCumXG: Number(homeTotalXG.toFixed(2)),
      awayCumXG: Number(awayTotalXG.toFixed(2)),
    });
  });

  homeTotalXG = Number(homeTotalXG.toFixed(2));
  awayTotalXG = Number(awayTotalXG.toFixed(2));
  homeNpxG = Number(homeNpxG.toFixed(2));
  awayNpxG = Number(awayNpxG.toFixed(2));

  const homeAvgShotQuality = Number((homeTotalXG / Math.max(1, homeShotsCount)).toFixed(3));
  const awayAvgShotQuality = Number((awayTotalXG / Math.max(1, awayShotsCount)).toFixed(3));

  const actualHomeG = homeScore !== undefined ? homeScore : Math.round(homeTotalXG);
  const actualAwayG = awayScore !== undefined ? awayScore : Math.round(awayTotalXG);

  const homeFinishingDiff = Number((actualHomeG - homeTotalXG).toFixed(2));
  const awayFinishingDiff = Number((actualAwayG - awayTotalXG).toFixed(2));

  return {
    matchId: `match-${homeTeam.id || homeTeam.name}-${awayTeam.id || awayTeam.name}`,
    homeTeamName: homeTeam.name,
    awayTeamName: awayTeam.name,
    leagueName: homeTeam.league || 'Premier League',
    homeTotalXG,
    awayTotalXG,
    homeNpxG,
    awayNpxG,
    homeShotsCount,
    awayShotsCount,
    homeShotsOnTarget,
    awayShotsOnTarget,
    homeAvgShotQuality,
    awayAvgShotQuality,
    homeBigChances,
    awayBigChances,
    homeActualGoals: actualHomeG,
    awayActualGoals: actualAwayG,
    homeFinishingDiff,
    awayFinishingDiff,
    shotsLog,
    xgTimeline,
  };
}

// ============================================================================
// 3. TEAM ROLLING xG METRICS & LEAGUE-WIDE PERFORMANCE PROFILES
// ============================================================================

/**
 * Computes team rolling xG performance metrics over time (5-match & 10-match trends,
 * finishing efficiency, defensive solidity, and xG momentum).
 */
export function calculateTeamRollingXG(
  team: Team,
  leagueMatches?: MatchXGSummary[]
): TeamXGPerformanceProfile {
  const seed = (team.id || team.name)
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);

  const baseXG = team.xGPerGame || 1.85;
  const baseDef = team.defenseStrength || 0.75;

  let totalXGCreated = 0;
  let totalXGConceded = 0;
  let totalNpxGCreated = 0;
  let totalActualGoalsScored = 0;
  let totalActualGoalsConceded = 0;
  let totalShots = 0;

  const logs: MatchXGSummary[] = [];

  for (let i = 1; i <= 10; i++) {
    const noiseXG = Math.sin(seed * 3 + i * 2.7) * 0.4;
    const noiseXGA = Math.cos(seed * 5 + i * 3.1) * 0.35;

    const xgC = Number(Math.max(0.4, baseXG + noiseXG).toFixed(2));
    const xgA = Number(Math.max(0.3, baseDef + noiseXGA).toFixed(2));
    const npxgC = Number((xgC * 0.92).toFixed(2));

    const goalsScored = Math.max(0, Math.round(xgC + (noiseXG > 0.2 ? 1 : 0)));
    const goalsConceded = Math.max(0, Math.round(xgA + (noiseXGA > 0.2 ? 1 : 0)));
    const shotsCount = Math.round(xgC * 7.5 + 4);

    totalXGCreated += xgC;
    totalXGConceded += xgA;
    totalNpxGCreated += npxgC;
    totalActualGoalsScored += goalsScored;
    totalActualGoalsConceded += goalsConceded;
    totalShots += shotsCount;

    const mockOpponent: Team = {
      id: `opp-${i}`,
      name: `League Rival ${i}`,
      league: team.league,
      elo: 1800,
      attackStrength: 1.1,
      defenseStrength: 0.9,
      homeAttack: 1.1,
      homeDefense: 0.9,
      awayAttack: 1.1,
      awayDefense: 0.9,
      xGPerGame: xgA,
      recentForm: ['W', 'D', 'L'],
    };

    logs.push(generateMatchShotLogs(team, mockOpponent, goalsScored, goalsConceded));
  }

  // Rolling 5-match vs 10-match
  const last5Logs = logs.slice(5, 10);
  const r5Created = Number((last5Logs.reduce((acc, l) => acc + l.homeTotalXG, 0) / 5).toFixed(2));
  const r5Conceded = Number((last5Logs.reduce((acc, l) => acc + l.awayTotalXG, 0) / 5).toFixed(2));

  const r10Created = Number((totalXGCreated / 10).toFixed(2));
  const r10Conceded = Number((totalXGConceded / 10).toFixed(2));

  const rollingNpxGDiff = Number(((totalNpxGCreated - totalXGConceded * 0.92) / 10).toFixed(2));

  // Finishing efficiency: Goals / xG
  const xgFinishingEfficiency = Number(
    (totalActualGoalsScored / Math.max(1, totalXGCreated)).toFixed(2)
  );

  // Defensive solidity: xGA / Actual Goals Conceded
  const xgDefensiveSolidty = Number(
    (totalXGConceded / Math.max(1, totalActualGoalsConceded)).toFixed(2)
  );

  // xG Dominance Index: % of match xG controlled
  const totalMatchXG = totalXGCreated + totalXGConceded;
  const xgDominanceIndex = Number(
    ((totalXGCreated / Math.max(1, totalMatchXG)) * 100).toFixed(1)
  );

  const avgShotsPerGame = Number((totalShots / 10).toFixed(1));
  const avgShotQuality = Number((totalXGCreated / Math.max(1, totalShots)).toFixed(3));

  // xG Trend Momentum: (5-match avg - 10-match avg)
  const xgTrendMomentum = Number((r5Created - r10Created).toFixed(2));

  // Variance consistency index
  const xgConsistencyIndex = Number(
    Math.max(
      60,
      100 -
        logs.reduce((acc, l) => acc + Math.pow(l.homeTotalXG - r10Created, 2), 0) * 15
    ).toFixed(0)
  );

  return {
    teamId: team.id,
    teamName: team.name,
    league: team.league,
    matchesAnalyzed: 10,
    rolling5XGCreatedAvg: r5Created,
    rolling5XGConcededAvg: r5Conceded,
    rolling10XGCreatedAvg: r10Created,
    rolling10XGConcededAvg: r10Conceded,
    rollingNpxGDiff,
    xgFinishingEfficiency,
    xgDefensiveSolidty,
    xgDominanceIndex,
    avgShotsPerGame,
    avgShotQuality,
    xgConsistencyIndex,
    xgTrendMomentum,
    historicalMatchLogs: logs,
  };
}

// ============================================================================
// 4. ENGINEERED xG FEATURE EXTRACTION FOR ML & PREDICTION ENGINES
// ============================================================================

/**
 * Extracts comprehensive engineered xG features comparing Home and Away teams
 * to feed directly into Dixon-Coles Poisson expectation and Hybrid Neural Net models.
 */
export function extractEngineeredXGFeatures(
  homeTeam: Team,
  awayTeam: Team,
  leagueName: string = 'Premier League'
): EngineeredXGFeatures {
  const homeProfile = calculateTeamRollingXG(homeTeam);
  const awayProfile = calculateTeamRollingXG(awayTeam);

  const xgGameDominanceDiff = Number(
    (homeProfile.xgDominanceIndex - awayProfile.xgDominanceIndex).toFixed(1)
  );

  const expectedGoalDifferential = Number(
    (homeProfile.rolling10XGCreatedAvg - awayProfile.rolling10XGCreatedAvg).toFixed(2)
  );

  return {
    homeRollingXG: homeProfile.rolling10XGCreatedAvg,
    awayRollingXG: awayProfile.rolling10XGCreatedAvg,
    homeRollingXGA: homeProfile.rolling10XGConcededAvg,
    awayRollingXGA: awayProfile.rolling10XGConcededAvg,
    homeNpxGDiff: homeProfile.rollingNpxGDiff,
    awayNpxGDiff: awayProfile.rollingNpxGDiff,
    homeFinishingEfficiency: homeProfile.xgFinishingEfficiency,
    awayFinishingEfficiency: awayProfile.xgFinishingEfficiency,
    homeDefensiveSolidty: homeProfile.xgDefensiveSolidty,
    awayDefensiveSolidty: awayProfile.xgDefensiveSolidty,
    homeShotQuality: homeProfile.avgShotQuality,
    awayShotQuality: awayProfile.avgShotQuality,
    homeXGTrendMomentum: homeProfile.xgTrendMomentum,
    awayXGTrendMomentum: awayProfile.xgTrendMomentum,
    xgGameDominanceDiff,
    expectedGoalDifferential,
  };
}
