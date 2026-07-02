export interface Team {
  id: string;
  name: string;
  league: string;
  elo: number;
  attackStrength: number;
  defenseStrength: number;
  homeAttack: number;
  homeDefense: number;
  awayAttack: number;
  awayDefense: number;
  xGPerGame: number;
  recentForm: ("W" | "D" | "L")[];
  logoUrl?: string;
}

export interface CorrectScore {
  homeGoals: number;
  awayGoals: number;
  probability: number;
}

export interface PredictionResult {
  homeTeamName: string;
  awayTeamName: string;
  homeExpectedGoals: number;
  awayExpectedGoals: number;
  homeWinProb: number;
  drawProb: number;
  awayWinProb: number;
  over15Prob: number;
  over25Prob: number;
  over35Prob: number;
  under25Prob: number;
  bttsProb: number;
  scoreMatrix: number[][]; // 6x6 grid [home][away]
  correctScores: CorrectScore[];
  fairOddsHome: number;
  fairOddsDraw: number;
  fairOddsAway: number;
  // Dixon-Coles Standard Deviation & Confidence Metrics
  goalDiffStdDev?: number;
  totalGoalsStdDev?: number;
  outcomeStdDev?: number;
  confidenceLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  confidenceRating?: number;
}

export interface BookieOdds {
  bookmaker: string;
  homeOdds: number;
  drawOdds: number;
  awayOdds: number;
  isArb: boolean;
  homeEV: number;
  drawEV: number;
  awayEV: number;
}

export interface ArbitrageOpportunity {
  bestHomeBookmaker: string;
  bestHomeOdds: number;
  bestDrawBookmaker: string;
  bestDrawOdds: number;
  bestAwayBookmaker: string;
  bestAwayOdds: number;
  totalImpliedProbability: number; // sum(1/odds)
  profitPercentage: number;
  stakeDistribution: {
    home: number;
    draw: number;
    away: number;
  };
}

export interface ArbitrageNotification {
  id: string;
  fixtureId: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  profitMargin: number; // e.g. 3.42 (%)
  impliedSum: number;   // e.g. 0.966
  bestHome: { bookmaker: string; odds: number };
  bestDraw: { bookmaker: string; odds: number };
  bestAway: { bookmaker: string; odds: number };
  detectedAt: string;
  read: boolean;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  recommendedStake100?: {
    home: number;
    draw: number;
    away: number;
    payout: number;
  };
  homeTeamObj?: Team;
  awayTeamObj?: Team;
  isRealDataVerified?: boolean;
  oddsSource?: string;
}

export interface NotificationSettings {
  monitoredLeagues: string[];
  minProfitMargin: number;
  autoScanEnabled: boolean;
  enableToasts: boolean;
}

export interface SimulationSummary {
  simulationsRun: number;
  homeWins: number;
  draws: number;
  awayWins: number;
  homeWinPercent: number;
  drawPercent: number;
  awayWinPercent: number;
  avgHomeGoals: number;
  avgAwayGoals: number;
  mostFrequentScore: string;
  goalDistribution: { goals: number; count: number }[];
}

export interface LiveMatchEvent {
  id: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  minute: number;
  homeScore: number;
  awayScore: number;
  homeXg: number;
  awayXg: number;
  homeShotsOnTarget: number;
  awayShotsOnTarget: number;
  homePossession: number;
  liveStatus: "LIVE" | "HALFTIME" | "UPCOMING" | "FINISHED";
  source?: "sofascore" | "fotmob" | "understat" | "gemini_ai" | "custom" | "football-data.org" | "the_odds_api" | "statsbomb" | "sportmonks";
}

export interface MatchIntegrityReport {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  time: string;
  liveStatus: "LIVE" | "HALFTIME" | "UPCOMING" | "FINISHED";
  source?: string;
  integrityScore: number; // 0 (Extremely Suspicious/Volatile) to 100 (Verified Normal/Clean)
  riskLevel: "CLEAN" | "ELEVATED" | "HIGH_VOLATILITY" | "SUSPICIOUS_ANOMALY";
  oddsDriftPercent: number; // e.g. +14.5% or -18.2%
  sharpBookieDivergence: number; // e.g. 0.08
  xgGoalDivergence: number; // e.g. |actualGoals - xG|
  lateGoalPressureSpike: number; // 0-100 rating
  cardPenaltyAnomalyScore: number; // 0-100 rating
  suspiciousFlags: string[];
  aiAuditNotes: string;
  suggestedAction: "SAFE TO MODEL" | "MONITOR ODDS MOVEMENT" | "CAUTION: HIGH VOLATILITY" | "FLAGGED FOR AUDIT";
}

export interface MachineLearningModelConfig {
  architecture: "xgboost" | "neural_network" | "logistic_regression" | "hybrid_ensemble";
  learningRate: number; // e.g. 0.05
  numberOfTrees: number; // e.g. 100 trees / epochs
  maxDepth: number; // e.g. 4
  regularizationL2: number; // e.g. 0.01
  trainSplitRatio: number; // e.g. 0.70
  featureWeights: {
    eloDelta: number;
    xgForm: number;
    attackDefenseRatio: number;
    recentPoints: number;
    restFatigue: number;
    h2hDominance: number;
    oddsMovement: number;
  };
}

export interface ModelTrainingEpochLog {
  epoch: number;
  trainLoss: number;
  valLoss: number;
  trainAccuracy: number;
  valAccuracy: number;
}

export interface MLModelPerformanceMetrics {
  accuracy: number; // e.g. 0.684 (68.4%)
  logLoss: number; // e.g. 0.812
  brierScore: number; // e.g. 0.185
  rocAuc: number; // e.g. 0.824
  backtestRoi: number; // e.g. +14.8%
  sharpeRatio: number; // e.g. 1.82
  maxDrawdown: number; // e.g. -8.4%
  winCount: number;
  totalBets: number;
}

export interface FeatureImportanceItem {
  featureName: string;
  code: string;
  importanceScore: number; // 0 to 100
  shapContribution: string;
  category: "ELO" | "XG" | "FORM" | "MARKET" | "FATIGUE";
}

export interface LeagueAdaptationParams {
  leagueName: string;
  homeAdvantageMultiplier: number; // e.g. 1.22
  avgGoalsPerGame: number; // e.g. 2.85
  dixonColesRho: number; // e.g. -0.06
  drawBias: number; // e.g. 0.26
}

export interface BettingMarketOutputs {
  matchResult: {
    homeWinProb: number;
    drawProb: number;
    awayWinProb: number;
    fairOddsHome: number;
    fairOddsDraw: number;
    fairOddsAway: number;
  };
  overUnder: {
    over15: number;
    under15: number;
    over25: number;
    under25: number;
    over35: number;
    under35: number;
    over45: number;
    under45: number;
  };
  btts: {
    yesProb: number;
    noProb: number;
    fairOddsYes: number;
    fairOddsNo: number;
  };
  doubleChance: {
    homeOrDraw: number;
    homeOrAway: number;
    drawOrAway: number;
  };
  drawNoBet: {
    homeDNBProb: number;
    awayDNBProb: number;
    fairOddsHomeDNB: number;
    fairOddsAwayDNB: number;
  };
  asianHandicap: {
    homeMinus05: number;
    awayPlus05: number;
    homeMinus10: number;
    awayPlus10: number;
  };
}

export interface HybridModelPrediction {
  eloBaseline: {
    homeElo: number;
    awayElo: number;
    eloProbHome: number;
    eloProbDraw: number;
    eloProbAway: number;
  };
  poissonExpectation: {
    homeLambda: number;
    awayMu: number;
    totalXG: number;
  };
  neuralNetAdjustments: {
    homeMultiplier: number;
    awayMultiplier: number;
    nnConfidence: number;
  };
  hybridFinal: PredictionResult;
  markets: BettingMarketOutputs;
  leagueParams: LeagueAdaptationParams;
}

export interface BackgroundSchedulerConfig {
  enabled: boolean;
  refreshIntervalSeconds: number; // e.g. 15, 30, 60, 300
  apiSources: string[];
  targetFixturesCount: number;
}

export interface BackgroundJobLog {
  id: string;
  timestamp: string;
  status: 'SUCCESS' | 'WARNING' | 'FAILED';
  fixtureCount: number;
  bookmakerCount: number;
  arbitrageDetectedCount: number;
  oddsDriftDetected: boolean;
  message: string;
  executionDurationMs: number;
  sourceUsed: string;
}

export interface SchedulerStatusResponse {
  config: BackgroundSchedulerConfig;
  isRunning: boolean;
  lastRunTimestamp: string | null;
  nextRunCountdownSeconds: number;
  totalRunCount: number;
  totalOddsUpdates: number;
  activeArbitrageOpportunities: number;
  recentLogs: BackgroundJobLog[];
}

export interface GoogleAppsScriptConfig {
  deploymentId: string;
  webAppUrl: string;
  status: 'CONNECTED' | 'ERROR' | 'UNTESTED';
  lastSyncTimestamp: string | null;
  lastError: string | null;
}

export interface BatchFixtureInput {
  id: string;
  homeTeamName: string;
  awayTeamName: string;
  rawInput?: string;
  league?: string;
}

export interface BatchFixturePrediction {
  id: string;
  homeTeam: Team;
  awayTeam: Team;
  prediction: PredictionResult;
  modelType: 'dixon_coles' | 'hybrid';
  valueEdgeEv: number;
  confidenceScore: number;
  confidenceLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  goalDiffStdDev: number;
  outcomeStdDev: number;
  recommendedPick: 'HOME' | 'DRAW' | 'AWAY';
}





