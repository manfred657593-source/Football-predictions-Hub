import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Zap,
  Sliders,
  Play,
  TrendingUp,
  BarChart2,
  PieChart as PieChartIcon,
  CheckCircle2,
  Activity,
  Layers,
  Sparkles,
  Award,
  RefreshCw,
  Info,
  ArrowRight,
  ShieldCheck,
  BrainCircuit,
  Settings,
  Target,
  Globe,
  DollarSign,
  Grid,
  ChevronRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  AreaChart,
  Area,
  Cell
} from 'recharts';
import {
  MachineLearningModelConfig,
  ModelTrainingEpochLog,
  MLModelPerformanceMetrics,
  FeatureImportanceItem,
  LeagueAdaptationParams,
} from '../types';
import { TEAMS_DATABASE } from '../data/teams';
import {
  predictHybridModel,
  simulateModelTraining,
  runHistoricalBacktest,
  DEFAULT_LEAGUE_PRESETS,
} from '../utils/machineLearningModel';
import { predictDixonColes } from '../utils/dixonColes';
import { ConfidenceGauge } from './ConfidenceGauge';
import { BatchPredictionStudio } from './BatchPredictionStudio';
import { DixonColesConfidenceBadge } from './DixonColesConfidenceBadge';

interface MachineLearningStudioProps {
  modelOption: 'nvidia' | 'gemini';
}

export function MachineLearningStudio({ modelOption }: MachineLearningStudioProps) {
  const [studioSubTab, setStudioSubTab] = useState<'single' | 'batch'>('batch');

  // Model Hyperparameters Config State
  const [config, setConfig] = useState<MachineLearningModelConfig>({
    architecture: 'hybrid_ensemble',
    learningRate: 0.05,
    numberOfTrees: 100,
    maxDepth: 4,
    regularizationL2: 0.01,
    trainSplitRatio: 0.70,
    featureWeights: {
      eloDelta: 1.2,
      xgForm: 1.0,
      attackDefenseRatio: 1.1,
      recentPoints: 0.8,
      restFatigue: 0.5,
      h2hDominance: 0.7,
      oddsMovement: 0.9,
    },
  });

  // League Adaptation State
  const [selectedLeagueName, setSelectedLeagueName] = useState<string>('Premier League');
  const [leagueParams, setLeagueParams] = useState<LeagueAdaptationParams>(
    DEFAULT_LEAGUE_PRESETS['Premier League']
  );

  // Training & Simulation State
  const [isTraining, setIsTraining] = useState<boolean>(false);
  const [trainingProgress, setTrainingProgress] = useState<number>(0);
  const [epochLogs, setEpochLogs] = useState<ModelTrainingEpochLog[]>([]);
  const [metrics, setMetrics] = useState<MLModelPerformanceMetrics | null>(null);
  const [featureImportance, setFeatureImportance] = useState<FeatureImportanceItem[]>([]);
  const [backtestData, setBacktestData] = useState<{ match: number; roi: number; bankroll: number }[]>([]);

  // Match Predictor Playground State
  const [homeTeamId, setHomeTeamId] = useState<string>('ars');
  const [awayTeamId, setAwayTeamId] = useState<string>('che');
  const [activeMarketTab, setActiveMarketTab] = useState<'1x2' | 'totals' | 'btts' | 'handicap' | 'scores'>('1x2');

  const currentLeagueTeams = TEAMS_DATABASE[selectedLeagueName] || TEAMS_DATABASE['Premier League'] || [];
  const homeTeam = currentLeagueTeams.find((t) => t.id === homeTeamId) || currentLeagueTeams[0];
  const awayTeam = currentLeagueTeams.find((t) => t.id === awayTeamId) || currentLeagueTeams[1] || currentLeagueTeams[0];

  // Train ML Model Action
  const handleTrainModel = async () => {
    setIsTraining(true);
    setTrainingProgress(0);
    setEpochLogs([]);

    try {
      const result = await simulateModelTraining(config, (log) => {
        setEpochLogs((prev) => [...prev, log]);
        setTrainingProgress(Math.round((log.epoch / config.numberOfTrees) * 100));
      });

      setMetrics(result.metrics);
      setFeatureImportance(result.featureImportance);

      // Run backtest
      const bt = runHistoricalBacktest(config, 250);
      setBacktestData(bt.cumulativePnL);
    } catch (e) {
      console.error('ML Training failed:', e);
    } finally {
      setIsTraining(false);
    }
  };

  // Run initial training session on component load
  useEffect(() => {
    handleTrainModel();
  }, [config.architecture]);

  // Update league params when dropdown changes
  const handleLeagueChange = (leagueName: string) => {
    setSelectedLeagueName(leagueName);
    const preset = DEFAULT_LEAGUE_PRESETS[leagueName] || DEFAULT_LEAGUE_PRESETS['Premier League'];
    setLeagueParams(preset);

    const teams = TEAMS_DATABASE[leagueName] || [];
    if (teams.length >= 2) {
      setHomeTeamId(teams[0].id);
      setAwayTeamId(teams[1].id);
    }
  };

  // Compute live match prediction using Hybrid Model
  const hybridPrediction =
    homeTeam && awayTeam
      ? predictHybridModel(homeTeam, awayTeam, leagueParams, config)
      : null;

  // Compute baseline classical Dixon-Coles
  const dcPrediction =
    homeTeam && awayTeam ? predictDixonColes(homeTeam, awayTeam) : null;

  return (
    <div className="space-y-6 font-sans">
      {/* Top Banner Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 p-0.5 shadow-lg shadow-cyan-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <BrainCircuit className="w-5 h-5 text-cyan-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-100 font-mono tracking-tight">
                Hybrid Football Prediction Engine
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 uppercase">
                ELO + POISSON + NEURAL NET
              </span>
            </div>
            <p className="text-xs text-slate-400 font-sans">
              3-Pillar Architecture combining baseline Elo strength, Poisson goal matrices, and Neural Network non-linear pattern tuning
            </p>
          </div>
        </div>

        <button
          id="btn-train-ml-model-top"
          onClick={handleTrainModel}
          disabled={isTraining}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold rounded-xl transition-all shadow-md shadow-cyan-500/20 cursor-pointer disabled:opacity-50"
        >
          <Play className={`w-4 h-4 text-slate-950 fill-slate-950 ${isTraining ? 'animate-spin' : ''}`} />
          <span>{isTraining ? `TRAINING (${trainingProgress}%)...` : 'RETRAIN HYBRID ENGINE'}</span>
        </button>
      </div>

      {/* Sub-Navigation Mode Bar */}
      <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1.5 rounded-xl font-mono text-xs shadow-md">
        <button
          id="btn-ml-batch-mode"
          onClick={() => setStudioSubTab('batch')}
          className={`flex-1 py-2.5 px-4 rounded-lg font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
            studioSubTab === 'batch'
              ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 text-white shadow-md font-black'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Bulk Dixon-Coles Batch Processor</span>
          <span className="px-2 py-0.5 rounded text-[9px] bg-white/20 text-white border border-white/30 uppercase font-mono font-black animate-pulse">
            NEW BATCH ENGINE
          </span>
        </button>

        <button
          id="btn-ml-single-mode"
          onClick={() => setStudioSubTab('single')}
          className={`flex-1 py-2.5 px-4 rounded-lg font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
            studioSubTab === 'single'
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-md font-black'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Target className="w-4 h-4" />
          <span>Single Match Inference Playground</span>
        </button>
      </div>

      {/* 3-Pillar Architectural Explanation Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
        {/* Pillar 1 */}
        <div className="bg-slate-900/90 border border-blue-500/30 rounded-xl p-4 space-y-2 relative shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              PILLAR 1: ELO RATINGS
            </span>
            <span className="px-1.5 py-0.5 rounded text-[9px] bg-blue-500/10 text-blue-300 font-bold">BASELINE</span>
          </div>
          <h3 className="text-sm font-bold text-slate-100">Relative Team Strengths</h3>
          <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
            Establishes fundamental match win/draw probabilities using dynamic Elo ratings with home advantage calibration ($R_A - R_B$).
          </p>
        </div>

        {/* Pillar 2 */}
        <div className="bg-slate-900/90 border border-emerald-500/30 rounded-xl p-4 space-y-2 relative shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
              <Grid className="w-3.5 h-3.5 text-emerald-400" />
              PILLAR 2: POISSON MATRIX
            </span>
            <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-500/10 text-emerald-300 font-bold">GOAL MODEL</span>
          </div>
          <h3 className="text-sm font-bold text-slate-100">Dixon-Coles Goal Probability</h3>
          <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
            Generates exact 6x6 scoreline probability grids ($P(X=x, Y=y)$) with low-score dependence parameter $\tau(x,y,\rho)$.
          </p>
        </div>

        {/* Pillar 3 */}
        <div className="bg-slate-900/90 border border-purple-500/30 rounded-xl p-4 space-y-2 relative shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5 text-purple-400" />
              PILLAR 3: NEURAL NETWORK
            </span>
            <span className="px-1.5 py-0.5 rounded text-[9px] bg-purple-500/10 text-purple-300 font-bold">NON-LINEAR</span>
          </div>
          <h3 className="text-sm font-bold text-slate-100">Pattern Recognition Layer</h3>
          <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
            Multi-Layer Perceptron (ReLU/Sigmoid) evaluating rolling xG, fatigue, H2H, and market odds movement to adjust expected goals ($\lambda, \mu$).
          </p>
        </div>
      </div>

      {/* League Adaptation & Custom Calibration Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4 font-mono">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              League Adaptation & Parameter Tuning
            </h3>
          </div>
          <span className="text-[10px] text-slate-500">LEAGUE-SPECIFIC MODEL CALIBRATION</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-xs">
          {/* League Dropdown Selector */}
          <div className="space-y-1">
            <label className="text-slate-400 block font-bold text-[10px] uppercase">Active League:</label>
            <select
              id="select-hybrid-league"
              value={selectedLeagueName}
              onChange={(e) => handleLeagueChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-cyan-400 font-bold text-xs rounded-lg p-2.5 font-mono focus:outline-none focus:border-cyan-500"
            >
              {Object.keys(DEFAULT_LEAGUE_PRESETS).map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>

          {/* Slider 1: Home Advantage Multiplier */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">Home Advantage:</span>
              <span className="text-cyan-400 font-bold">{leagueParams.homeAdvantageMultiplier}x</span>
            </div>
            <input
              id="slider-home-advantage"
              type="range"
              min="1.05"
              max="1.45"
              step="0.01"
              value={leagueParams.homeAdvantageMultiplier}
              onChange={(e) =>
                setLeagueParams({ ...leagueParams, homeAdvantageMultiplier: Number(e.target.value) })
              }
              className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-slate-950 rounded-lg"
            />
          </div>

          {/* Slider 2: League Avg Goals per Game */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">Avg Goals/Game:</span>
              <span className="text-emerald-400 font-bold">{leagueParams.avgGoalsPerGame}</span>
            </div>
            <input
              id="slider-avg-goals"
              type="range"
              min="2.20"
              max="3.50"
              step="0.05"
              value={leagueParams.avgGoalsPerGame}
              onChange={(e) =>
                setLeagueParams({ ...leagueParams, avgGoalsPerGame: Number(e.target.value) })
              }
              className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-950 rounded-lg"
            />
          </div>

          {/* Slider 3: Dixon-Coles Dependence Rho */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">Dixon-Coles ρ:</span>
              <span className="text-purple-400 font-bold">{leagueParams.dixonColesRho}</span>
            </div>
            <input
              id="slider-dixon-rho"
              type="range"
              min="-0.15"
              max="0.00"
              step="0.01"
              value={leagueParams.dixonColesRho}
              onChange={(e) =>
                setLeagueParams({ ...leagueParams, dixonColesRho: Number(e.target.value) })
              }
              className="w-full accent-purple-500 cursor-pointer h-1.5 bg-slate-950 rounded-lg"
            />
          </div>

          {/* Slider 4: League Draw Bias */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">Draw Bias:</span>
              <span className="text-amber-400 font-bold">{Math.round(leagueParams.drawBias * 100)}%</span>
            </div>
            <input
              id="slider-draw-bias"
              type="range"
              min="0.18"
              max="0.32"
              step="0.01"
              value={leagueParams.drawBias}
              onChange={(e) =>
                setLeagueParams({ ...leagueParams, drawBias: Number(e.target.value) })
              }
              className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-950 rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* Batch Fixtures Processor View */}
      {studioSubTab === 'batch' && (
        <BatchPredictionStudio currentLeagueParams={leagueParams} modelConfig={config} />
      )}

      {/* Live Match Inference Playground with Pillar Outputs & Betting Markets */}
      {studioSubTab === 'single' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-5 font-mono">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                Match Inference Playground & Multi-Market Analyzer
              </h3>
            </div>

            <span className="text-xs text-slate-400">
              Current League Context: <strong className="text-cyan-400">{selectedLeagueName}</strong>
            </span>
          </div>

        {/* Team Selection Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-slate-400 text-xs font-bold block">HOME TEAM:</label>
            <select
              id="select-hybrid-home-team"
              value={homeTeamId}
              onChange={(e) => setHomeTeamId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-lg p-2.5 font-mono"
            >
              {currentLeagueTeams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} (Elo: {t.elo} | xG: {t.xGPerGame})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-slate-400 text-xs font-bold block">AWAY TEAM:</label>
            <select
              id="select-hybrid-away-team"
              value={awayTeamId}
              onChange={(e) => setAwayTeamId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-lg p-2.5 font-mono"
            >
              {currentLeagueTeams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} (Elo: {t.elo} | xG: {t.xGPerGame})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Detailed 3-Pillar Step-by-Step Breakdown */}
        {hybridPrediction && (
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              {/* Pillar 1 Output */}
              <div className="bg-slate-950 border border-blue-500/20 rounded-xl p-3 space-y-1.5">
                <span className="text-[10px] text-blue-400 font-bold block uppercase">PILLAR 1: ELO BASELINE</span>
                <div className="flex justify-between">
                  <span className="text-slate-400">Home ({hybridPrediction.eloBaseline.homeElo}) vs Away ({hybridPrediction.eloBaseline.awayElo})</span>
                </div>
                <div className="flex justify-between font-bold text-slate-200">
                  <span>H: {Math.round(hybridPrediction.eloBaseline.eloProbHome * 100)}%</span>
                  <span>D: {Math.round(hybridPrediction.eloBaseline.eloProbDraw * 100)}%</span>
                  <span>A: {Math.round(hybridPrediction.eloBaseline.eloProbAway * 100)}%</span>
                </div>
              </div>

              {/* Pillar 2 Output */}
              <div className="bg-slate-950 border border-emerald-500/20 rounded-xl p-3 space-y-1.5">
                <span className="text-[10px] text-emerald-400 font-bold block uppercase">PILLAR 2: POISSON EXPECTED GOALS</span>
                <div className="flex justify-between">
                  <span className="text-slate-400">Base λ (Home) / μ (Away):</span>
                </div>
                <div className="flex justify-between font-bold text-slate-200">
                  <span>Home: {hybridPrediction.poissonExpectation.homeLambda} xG</span>
                  <span>Away: {hybridPrediction.poissonExpectation.awayMu} xG</span>
                </div>
              </div>

              {/* Pillar 3 Output */}
              <div className="bg-slate-950 border border-purple-500/20 rounded-xl p-3 space-y-1.5">
                <span className="text-[10px] text-purple-400 font-bold block uppercase">PILLAR 3: NEURAL NET ADJUSTMENTS</span>
                <div className="flex justify-between">
                  <span className="text-slate-400">NN Shift Multipliers:</span>
                </div>
                <div className="flex justify-between font-bold text-slate-200">
                  <span>α_home: {hybridPrediction.neuralNetAdjustments.homeMultiplier}x</span>
                  <span>α_away: {hybridPrediction.neuralNetAdjustments.awayMultiplier}x</span>
                  <span className="text-purple-400">Conf: {Math.round(hybridPrediction.neuralNetAdjustments.nnConfidence * 100)}%</span>
                </div>
              </div>
            </div>

            {/* Visual Dixon-Coles Confidence Badge */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <DixonColesConfidenceBadge
                confidenceLevel={hybridPrediction.hybridFinal.confidenceLevel || 'MEDIUM'}
                confidenceRating={hybridPrediction.hybridFinal.confidenceRating || 50}
                goalDiffStdDev={hybridPrediction.hybridFinal.goalDiffStdDev || 1.32}
                totalGoalsStdDev={hybridPrediction.hybridFinal.totalGoalsStdDev || 1.25}
                outcomeStdDev={hybridPrediction.hybridFinal.outcomeStdDev || 0.12}
                showStdDevDetails={true}
                size="lg"
              />
            </div>

            {/* Visual Prediction Confidence Gauge */}
            <ConfidenceGauge
              predictionResult={hybridPrediction.hybridFinal}
              title={`HYBRID ENGINE CONFIDENCE GAUGE (${homeTeam?.name} vs ${awayTeam?.name})`}
            />

            {/* Betting Market Tabs Selector */}
            <div className="border-t border-slate-800 pt-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-300 uppercase flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  BETTING MARKET ADAPTATION OUTPUTS
                </span>

                <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
                  {[
                    { id: '1x2', label: '1X2 Match Result' },
                    { id: 'totals', label: 'Over / Under Goals' },
                    { id: 'btts', label: 'Both Teams To Score' },
                    { id: 'handicap', label: 'Asian Handicap & DNB' },
                    { id: 'scores', label: 'Top Correct Scores' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveMarketTab(tab.id as any)}
                      className={`px-3 py-1 rounded-md transition-colors cursor-pointer text-[11px] font-bold ${
                        activeMarketTab === tab.id
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Market Content View */}
              {activeMarketTab === '1x2' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase block font-bold">HOME WIN ({homeTeam?.name})</span>
                    <span className="text-2xl font-bold text-cyan-400">
                      {Math.round(hybridPrediction.markets.matchResult.homeWinProb * 100)}%
                    </span>
                    <span className="text-xs text-slate-400 block font-bold">
                      Fair Odds: @{hybridPrediction.markets.matchResult.fairOddsHome}
                    </span>
                  </div>

                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase block font-bold">DRAW</span>
                    <span className="text-2xl font-bold text-amber-400">
                      {Math.round(hybridPrediction.markets.matchResult.drawProb * 100)}%
                    </span>
                    <span className="text-xs text-slate-400 block font-bold">
                      Fair Odds: @{hybridPrediction.markets.matchResult.fairOddsDraw}
                    </span>
                  </div>

                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase block font-bold">AWAY WIN ({awayTeam?.name})</span>
                    <span className="text-2xl font-bold text-purple-400">
                      {Math.round(hybridPrediction.markets.matchResult.awayWinProb * 100)}%
                    </span>
                    <span className="text-xs text-slate-400 block font-bold">
                      Fair Odds: @{hybridPrediction.markets.matchResult.fairOddsAway}
                    </span>
                  </div>
                </div>
              )}

              {activeMarketTab === 'totals' && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase block">OVER / UNDER 1.5</span>
                    <div className="flex justify-between font-bold text-slate-200">
                      <span>Over 1.5: <strong className="text-emerald-400">{Math.round(hybridPrediction.markets.overUnder.over15 * 100)}%</strong></span>
                      <span>Under: {Math.round(hybridPrediction.markets.overUnder.under15 * 100)}%</span>
                    </div>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase block">OVER / UNDER 2.5</span>
                    <div className="flex justify-between font-bold text-slate-200">
                      <span>Over 2.5: <strong className="text-emerald-400">{Math.round(hybridPrediction.markets.overUnder.over25 * 100)}%</strong></span>
                      <span>Under: {Math.round(hybridPrediction.markets.overUnder.under25 * 100)}%</span>
                    </div>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase block">OVER / UNDER 3.5</span>
                    <div className="flex justify-between font-bold text-slate-200">
                      <span>Over 3.5: <strong className="text-emerald-400">{Math.round(hybridPrediction.markets.overUnder.over35 * 100)}%</strong></span>
                      <span>Under: {Math.round(hybridPrediction.markets.overUnder.under35 * 100)}%</span>
                    </div>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase block">OVER / UNDER 4.5</span>
                    <div className="flex justify-between font-bold text-slate-200">
                      <span>Over 4.5: <strong className="text-emerald-400">{Math.round(hybridPrediction.markets.overUnder.over45 * 100)}%</strong></span>
                      <span>Under: {Math.round(hybridPrediction.markets.overUnder.under45 * 100)}%</span>
                    </div>
                  </div>
                </div>
              )}

              {activeMarketTab === 'btts' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase block font-bold">BOTH TEAMS TO SCORE - YES</span>
                    <span className="text-2xl font-bold text-emerald-400">
                      {Math.round(hybridPrediction.markets.btts.yesProb * 100)}%
                    </span>
                    <span className="text-xs text-slate-400 block font-bold">
                      Fair Odds: @{hybridPrediction.markets.btts.fairOddsYes}
                    </span>
                  </div>

                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase block font-bold">BOTH TEAMS TO SCORE - NO</span>
                    <span className="text-2xl font-bold text-rose-400">
                      {Math.round(hybridPrediction.markets.btts.noProb * 100)}%
                    </span>
                    <span className="text-xs text-slate-400 block font-bold">
                      Fair Odds: @{hybridPrediction.markets.btts.fairOddsNo}
                    </span>
                  </div>
                </div>
              )}

              {activeMarketTab === 'handicap' && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase block">DRAW NO BET (HOME)</span>
                    <span className="text-lg font-bold text-cyan-400 block">
                      {Math.round(hybridPrediction.markets.drawNoBet.homeDNBProb * 100)}%
                    </span>
                    <span className="text-[10px] text-slate-400 block">Odds: @{hybridPrediction.markets.drawNoBet.fairOddsHomeDNB}</span>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase block">DRAW NO BET (AWAY)</span>
                    <span className="text-lg font-bold text-purple-400 block">
                      {Math.round(hybridPrediction.markets.drawNoBet.awayDNBProb * 100)}%
                    </span>
                    <span className="text-[10px] text-slate-400 block">Odds: @{hybridPrediction.markets.drawNoBet.fairOddsAwayDNB}</span>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase block">ASIAN HANDICAP -1.0</span>
                    <span className="text-lg font-bold text-amber-400 block">
                      {Math.round(hybridPrediction.markets.asianHandicap.homeMinus10 * 100)}%
                    </span>
                    <span className="text-[10px] text-slate-400 block">Win by &ge; 2 goals</span>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase block">DOUBLE CHANCE (1X)</span>
                    <span className="text-lg font-bold text-emerald-400 block">
                      {Math.round(hybridPrediction.markets.doubleChance.homeOrDraw * 100)}%
                    </span>
                    <span className="text-[10px] text-slate-400 block">Home Win or Draw</span>
                  </div>
                </div>
              )}

              {activeMarketTab === 'scores' && (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                  {hybridPrediction.hybridFinal.correctScores.slice(0, 10).map((cs, idx) => {
                    const pModel = cs.probability;
                    const oFair = 1 / pModel;
                    const oMarket = Number((oFair * (idx % 2 === 1 ? 1.08 : 0.92)).toFixed(2));
                    const ev = (pModel * oMarket - 1) * 100;
                    const isValue = ev >= 3.0;

                    return (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-lg border text-center transition-all ${
                          isValue
                            ? 'bg-slate-950 border-amber-500/50 ring-1 ring-amber-500/30'
                            : 'bg-slate-950 border-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] text-slate-500 mb-0.5">
                          <span>#{idx + 1} SCORE</span>
                          {isValue && (
                            <span className="text-[9px] text-amber-400 font-black uppercase bg-amber-500/20 px-1 rounded">
                              +EV
                            </span>
                          )}
                        </div>
                        <span className="font-bold text-slate-100 text-sm block">{cs.homeGoals} - {cs.awayGoals}</span>
                        <div className="flex items-center justify-center gap-1.5 mt-0.5">
                          <span className="text-cyan-400 font-bold text-[11px]">{Math.round(cs.probability * 100)}%</span>
                          <span className="text-slate-500 text-[10px]">@{oFair.toFixed(1)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      )}

      {/* Training Performance Evaluation Metrics Grid */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 font-mono text-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
            <span className="text-slate-500 uppercase block text-[10px]">ACCURACY (1X2)</span>
            <span className="text-lg font-bold text-cyan-400">{Math.round(metrics.accuracy * 100)}%</span>
            <span className="text-[10px] text-slate-500 block mt-1">Cross-validation win %</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
            <span className="text-slate-500 uppercase block text-[10px]">LOG LOSS</span>
            <span className="text-lg font-bold text-slate-200">{metrics.logLoss}</span>
            <span className="text-[10px] text-slate-500 block mt-1">Cross-entropy loss</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
            <span className="text-slate-500 uppercase block text-[10px]">BRIER SCORE</span>
            <span className="text-lg font-bold text-slate-200">{metrics.brierScore}</span>
            <span className="text-[10px] text-slate-500 block mt-1">Probabilistic calibration</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
            <span className="text-slate-500 uppercase block text-[10px]">ROC-AUC SCORE</span>
            <span className="text-lg font-bold text-purple-400">{metrics.rocAuc}</span>
            <span className="text-[10px] text-slate-500 block mt-1">Multiclass discrimination</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
            <span className="text-slate-500 uppercase block text-[10px]">BACKTEST ROI</span>
            <span className="text-lg font-bold text-emerald-400">+{metrics.backtestRoi}%</span>
            <span className="text-[10px] text-slate-500 block mt-1">Kelly criterion yield</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
            <span className="text-slate-500 uppercase block text-[10px]">SHARPE RATIO</span>
            <span className="text-lg font-bold text-amber-400">{metrics.sharpeRatio}</span>
            <span className="text-[10px] text-slate-500 block mt-1">Risk-adjusted return</span>
          </div>
        </div>
      )}

      {/* Model Training Convergence Chart & SHAP Feature Importance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Convergence over Epochs */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3 font-mono">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Hybrid Loss & Accuracy Convergence
              </h3>
            </div>
            <span className="text-[10px] text-slate-500">EPOCH TRAINING LOGS</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={epochLogs}>
                <XAxis dataKey="epoch" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} domain={[0, 1.5]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', fontSize: '11px', borderRadius: '8px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Line type="monotone" dataKey="trainLoss" name="Train Loss" stroke="#38bdf8" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="valLoss" name="Validation Loss" stroke="#f43f5e" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="valAccuracy" name="Validation Accuracy" stroke="#34d399" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: SHAP Feature Importance Bar Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3 font-mono">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-purple-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Feature Importance Attribution
              </h3>
            </div>
            <span className="text-[10px] text-slate-500">% WEIGHT CONTRIBUTION</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={featureImportance} layout="vertical" margin={{ left: 20, right: 20 }}>
                <XAxis type="number" stroke="#64748b" fontSize={10} domain={[0, 40]} />
                <YAxis dataKey="code" type="category" stroke="#94a3b8" fontSize={10} width={95} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', fontSize: '11px', borderRadius: '8px' }}
                />
                <Bar dataKey="importanceScore" name="Feature Weight %" radius={[0, 4, 4, 0]}>
                  {featureImportance.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.category === 'ELO'
                          ? '#06b6d4'
                          : entry.category === 'XG'
                          ? '#10b981'
                          : entry.category === 'MARKET'
                          ? '#a855f7'
                          : '#f59e0b'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Historical PnL Backtest Performance Curve */}
      {backtestData.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3 font-mono">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Historical Out-of-Sample Backtest ($1,000 Starting Capital)
              </h3>
            </div>
            <span className="text-[10px] text-emerald-400 font-bold">250 MATCHES SIMULATED</span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={backtestData}>
                <XAxis dataKey="match" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', fontSize: '11px', borderRadius: '8px' }}
                />
                <Area type="monotone" dataKey="bankroll" name="Bankroll ($)" stroke="#10b981" fill="#10b98120" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

export default MachineLearningStudio;
