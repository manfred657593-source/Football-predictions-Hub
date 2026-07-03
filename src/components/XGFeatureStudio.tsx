import React, { useState, useMemo } from 'react';
import {
  Target,
  Sparkles,
  Flame,
  TrendingUp,
  Activity,
  Layers,
  BarChart2,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Gauge,
  Swords,
  Shield,
  Award,
  Maximize2,
  Info,
  ChevronRight,
  RefreshCw,
  Globe,
  HelpCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
  Cell,
} from 'recharts';
import { Team } from '../types';
import { TEAMS_DATABASE } from '../data/teams';
import {
  ShotInput,
  calculateShotXG,
  generateMatchShotLogs,
  calculateTeamRollingXG,
  extractEngineeredXGFeatures,
} from '../utils/xgFeatureEngineering';
import { DEFAULT_LEAGUE_PRESETS } from '../utils/machineLearningModel';

interface XGFeatureStudioProps {
  selectedHomeTeam?: Team;
  selectedAwayTeam?: Team;
  className?: string;
}

export const XGFeatureStudio: React.FC<XGFeatureStudioProps> = ({
  selectedHomeTeam,
  selectedAwayTeam,
  className = '',
}) => {
  // Navigation tabs within xG Studio
  const [activeTab, setActiveTab] = useState<'shot_calculator' | 'match_timeline' | 'team_rolling' | 'ml_importance'>('shot_calculator');

  // League and team selection for performance analysis
  const availableLeagues = Object.keys(TEAMS_DATABASE);
  const [selectedLeague, setSelectedLeague] = useState<string>(availableLeagues[0]);

  const leagueTeams = TEAMS_DATABASE[selectedLeague] || TEAMS_DATABASE['Premier League'];
  const [currentTeam, setCurrentTeam] = useState<Team>(
    selectedHomeTeam || leagueTeams[0] || TEAMS_DATABASE['Premier League'][0]
  );
  const [opponentTeam, setOpponentTeam] = useState<Team>(
    selectedAwayTeam || leagueTeams[1] || TEAMS_DATABASE['Premier League'][1]
  );

  // --------------------------------------------------------------------------
  // SHOT CALCULATOR STATE
  // --------------------------------------------------------------------------
  const [calcDistance, setCalcDistance] = useState<number>(12); // meters
  const [calcAngle, setCalcAngle] = useState<number>(15);       // degrees
  const [calcShotType, setCalcShotType] = useState<ShotInput['shotType']>('open_play');
  const [calcBodyPart, setCalcBodyPart] = useState<ShotInput['bodyPart']>('right_foot');
  const [calcIsBigChance, setCalcIsBigChance] = useState<boolean>(false);
  const [calcDefenders, setCalcDefenders] = useState<number>(2);
  const [calcAssistType, setCalcAssistType] = useState<ShotInput['assistType']>('through_ball');

  // Calculate live shot xG
  const calculatedShotResult = useMemo(() => {
    const shotInput: ShotInput = {
      minute: 65,
      distanceMeters: calcDistance,
      angleDegrees: calcAngle,
      shotType: calcShotType,
      bodyPart: calcBodyPart,
      isBigChance: calcIsBigChance,
      defendersInPath: calcDefenders,
      assistType: calcAssistType,
      isHome: true,
      teamName: currentTeam.name,
      shooterName: 'Custom Shot Simulation',
    };
    return calculateShotXG(shotInput);
  }, [calcDistance, calcAngle, calcShotType, calcBodyPart, calcIsBigChance, calcDefenders, calcAssistType, currentTeam.name]);

  // --------------------------------------------------------------------------
  // MATCH SHOT LOGS & TIMELINE ANALYSIS
  // --------------------------------------------------------------------------
  const matchXGSummary = useMemo(() => {
    return generateMatchShotLogs(currentTeam, opponentTeam);
  }, [currentTeam, opponentTeam]);

  // --------------------------------------------------------------------------
  // TEAM ROLLING xG PROFILE
  // --------------------------------------------------------------------------
  const teamRollingProfile = useMemo(() => {
    return calculateTeamRollingXG(currentTeam);
  }, [currentTeam]);

  // --------------------------------------------------------------------------
  // ENGINEERED xG COMPARISON FEATURES
  // --------------------------------------------------------------------------
  const engineeredXGComparison = useMemo(() => {
    return extractEngineeredXGFeatures(currentTeam, opponentTeam, selectedLeague);
  }, [currentTeam, opponentTeam, selectedLeague]);

  // Chart data for team rolling trends
  const rollingTrendChartData = useMemo(() => {
    return teamRollingProfile.historicalMatchLogs.map((log, idx) => ({
      match: `M${idx + 1}`,
      xgCreated: log.homeTotalXG,
      xgConceded: log.awayTotalXG,
      npxG: log.homeNpxG,
      goalsScored: log.homeActualGoals,
      goalsConceded: log.awayActualGoals,
    }));
  }, [teamRollingProfile]);

  return (
    <div id="xg-feature-studio" className={`space-y-6 ${className}`}>
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-950 border border-slate-800 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <Target className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
                Expected Goals (xG) Feature Engineering Studio
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  v3.8 Multi-League
                </span>
              </h2>
            </div>
            <p className="text-xs text-slate-400 font-mono max-w-2xl leading-relaxed">
              Calculate shot-level probabilities, store match aggregates, track rolling team performance trends over time, and inspect feature-engineered xG inputs across all supported leagues.
            </p>
          </div>

          {/* Quick League & Team Selector */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-950/80 p-2 rounded-xl border border-slate-800 shrink-0">
            <div className="flex items-center gap-1.5 font-mono text-xs text-slate-400 px-1">
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
              <span>League:</span>
            </div>
            <select
              id="select-xg-league"
              value={selectedLeague}
              onChange={(e) => {
                const newLeague = e.target.value;
                setSelectedLeague(newLeague);
                const teams = TEAMS_DATABASE[newLeague] || [];
                if (teams.length >= 2) {
                  setCurrentTeam(teams[0]);
                  setOpponentTeam(teams[1]);
                }
              }}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs font-mono font-bold rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-400"
            >
              {availableLeagues.map((lg) => (
                <option key={lg} value={lg}>
                  {lg}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1.5 font-mono text-xs text-slate-400 pl-2">
              <span>Team:</span>
            </div>
            <select
              id="select-xg-team"
              value={currentTeam.id}
              onChange={(e) => {
                const found = leagueTeams.find((t) => t.id === e.target.value);
                if (found) setCurrentTeam(found);
              }}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs font-mono font-bold rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-400"
            >
              {leagueTeams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Studio Sub-Navigation Tabs */}
        <div className="flex items-center gap-1.5 mt-5 border-t border-slate-800/80 pt-3 overflow-x-auto no-scrollbar">
          {[
            { id: 'shot_calculator', label: 'Shot xG Calculator', icon: Target },
            { id: 'match_timeline', label: 'Match Shot Log & Timeline', icon: Activity },
            { id: 'team_rolling', label: 'Team Rolling Performance', icon: TrendingUp },
            { id: 'ml_importance', label: 'ML xG Model Features', icon: BrainCircuitIcon },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-xg-${tab.id}`}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* TAB 1: SHOT-LEVEL xG CALCULATOR                                      */}
      {/* -------------------------------------------------------------------- */}
      {activeTab === 'shot_calculator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls Panel */}
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 font-mono text-sm font-bold text-slate-200">
                <Sliders className="w-4 h-4 text-amber-400" />
                <span>Shot Geometry & Attribute Sliders</span>
              </div>
              <button
                id="btn-reset-shot-sim"
                onClick={() => {
                  setCalcDistance(12);
                  setCalcAngle(15);
                  setCalcShotType('open_play');
                  setCalcBodyPart('right_foot');
                  setCalcIsBigChance(false);
                  setCalcDefenders(2);
                  setCalcAssistType('through_ball');
                }}
                className="flex items-center gap-1 font-mono text-[11px] text-slate-400 hover:text-amber-400 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Reset Shot</span>
              </button>
            </div>

            {/* Slider 1: Distance */}
            <div className="space-y-2">
              <div className="flex justify-between items-center font-mono text-xs">
                <span className="text-slate-300 font-bold flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-emerald-400" />
                  Distance from Goal Line:
                </span>
                <span className="text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                  {calcDistance} meters
                </span>
              </div>
              <input
                id="input-shot-distance"
                type="range"
                min="2"
                max="35"
                step="1"
                value={calcDistance}
                onChange={(e) => setCalcDistance(Number(e.target.value))}
                className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-emerald-400"
              />
              <div className="flex justify-between font-mono text-[10px] text-slate-500">
                <span>2m (Tap-in)</span>
                <span>11m (Penalty Spot)</span>
                <span>20m (Edge of Box)</span>
                <span>35m (Long Range)</span>
              </div>
            </div>

            {/* Slider 2: Shot Angle */}
            <div className="space-y-2">
              <div className="flex justify-between items-center font-mono text-xs">
                <span className="text-slate-300 font-bold flex items-center gap-1.5">
                  <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
                  Shot Angle Offset:
                </span>
                <span className="text-amber-400 font-bold bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">
                  {calcAngle}° relative to center
                </span>
              </div>
              <input
                id="input-shot-angle"
                type="range"
                min="0"
                max="75"
                step="5"
                value={calcAngle}
                onChange={(e) => setCalcAngle(Number(e.target.value))}
                className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
              <div className="flex justify-between font-mono text-[10px] text-slate-500">
                <span>0° (Straight Center)</span>
                <span>35° (Wide Box)</span>
                <span>75° (Tight Baseline)</span>
              </div>
            </div>

            {/* Toggles: Shot Type */}
            <div className="space-y-2">
              <span className="font-mono text-xs font-bold text-slate-300 block">
                Shot Situation / Type:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'open_play', label: 'Open Play' },
                  { id: 'fast_break', label: 'Fast Break' },
                  { id: 'header', label: 'Header' },
                  { id: 'penalty', label: 'Penalty Kick' },
                  { id: 'direct_free_kick', label: 'Direct Free Kick' },
                  { id: 'volley', label: 'Volley' },
                ].map((type) => (
                  <button
                    key={type.id}
                    id={`btn-type-${type.id}`}
                    onClick={() => setCalcShotType(type.id as any)}
                    className={`px-3 py-2 rounded-xl text-xs font-mono font-bold border transition-all ${
                      calcShotType === type.id
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500 shadow-sm'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Body Part & Assist Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <span className="font-mono text-xs font-bold text-slate-300 block">
                  Body Part Used:
                </span>
                <select
                  id="select-body-part"
                  value={calcBodyPart}
                  onChange={(e) => setCalcBodyPart(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs font-mono font-bold rounded-xl px-3 py-2 focus:outline-none focus:border-amber-400"
                >
                  <option value="right_foot">Right Foot</option>
                  <option value="left_foot">Left Foot</option>
                  <option value="head">Head</option>
                  <option value="other">Other / Body</option>
                </select>
              </div>

              <div className="space-y-2">
                <span className="font-mono text-xs font-bold text-slate-300 block">
                  Assist Action:
                </span>
                <select
                  id="select-assist-type"
                  value={calcAssistType}
                  onChange={(e) => setCalcAssistType(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs font-mono font-bold rounded-xl px-3 py-2 focus:outline-none focus:border-amber-400"
                >
                  <option value="through_ball">Through Ball</option>
                  <option value="cutback">Cutback Cross</option>
                  <option value="cross">High Cross</option>
                  <option value="rebound">Rebound / Loose Ball</option>
                  <option value="solo">Solo Dribble / Unassisted</option>
                </select>
              </div>
            </div>

            {/* Defenders & Big Chance */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800/80">
              <div className="space-y-2">
                <span className="font-mono text-xs font-bold text-slate-300 block">
                  Defenders in Path:
                </span>
                <div className="flex items-center gap-1.5">
                  {[0, 1, 2, 3, 4, 5].map((num) => (
                    <button
                      key={num}
                      id={`btn-defenders-${num}`}
                      onClick={() => setCalcDefenders(num)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-bold border transition-all ${
                        calcDefenders === num
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500'
                          : 'bg-slate-950 text-slate-400 border-slate-800'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 flex flex-col justify-end">
                <button
                  id="btn-toggle-big-chance"
                  onClick={() => setCalcIsBigChance(!calcIsBigChance)}
                  className={`w-full py-2.5 px-3 rounded-xl text-xs font-mono font-bold border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    calcIsBigChance
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500 shadow-sm'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <Flame className={`w-4 h-4 ${calcIsBigChance ? 'text-rose-400' : 'text-slate-500'}`} />
                  <span>{calcIsBigChance ? 'Opta Big Chance Flagged' : 'Flag as Opta Big Chance'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Real-time Result Card */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 font-mono text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Calculated Shot xG Result</span>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold uppercase border ${
                    calculatedShotResult.dangerRating === 'CRITICAL_GOAL_CHANCE'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : calculatedShotResult.dangerRating === 'HIGH'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  }`}
                >
                  {calculatedShotResult.dangerRating.replace(/_/g, ' ')}
                </span>
              </div>

              {/* Display Big Gauge Number */}
              <div className="flex items-baseline justify-between bg-slate-950/80 p-4 rounded-xl border border-slate-800">
                <div>
                  <span className="text-slate-400 font-mono text-xs block">Expected Goal Value</span>
                  <span className="text-4xl font-black font-mono text-amber-400 tracking-tight">
                    {calculatedShotResult.xgValue.toFixed(3)}{' '}
                    <span className="text-sm font-normal text-slate-500">xG</span>
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 font-mono text-xs block">Conversion Prob</span>
                  <span className="text-2xl font-bold font-mono text-emerald-400">
                    {calculatedShotResult.conversionProbabilityPercent}%
                  </span>
                </div>
              </div>

              {/* Shot Quality Meter */}
              <div className="space-y-1.5">
                <div className="flex justify-between font-mono text-xs">
                  <span className="text-slate-400">Shot Quality Score:</span>
                  <span className="text-amber-400 font-bold">{calculatedShotResult.shotQualityScore}/100</span>
                </div>
                <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-500 h-full transition-all duration-300"
                    style={{ width: `${calculatedShotResult.shotQualityScore}%` }}
                  />
                </div>
              </div>

              {/* Factors Breakdown */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <span className="font-mono text-xs font-bold text-slate-300 block">
                  Model Logistic Logit Factors:
                </span>
                <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex justify-between">
                    <span className="text-slate-400">Distance Decay:</span>
                    <span className="text-rose-400 font-bold">{calculatedShotResult.factorsBreakdown.distancePenalty}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex justify-between">
                    <span className="text-slate-400">Angle Factor:</span>
                    <span className="text-emerald-400 font-bold">x{calculatedShotResult.factorsBreakdown.angleFactor}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex justify-between">
                    <span className="text-slate-400">Assist Boost:</span>
                    <span className="text-amber-400 font-bold">+{calculatedShotResult.factorsBreakdown.assistBonus}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex justify-between">
                    <span className="text-slate-400">Defender Pressure:</span>
                    <span className="text-rose-400 font-bold">{calculatedShotResult.factorsBreakdown.defenderPressurePenalty}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* TAB 2: MATCH SHOT LOG & TIMELINE                                     */}
      {/* -------------------------------------------------------------------- */}
      {activeTab === 'match_timeline' && (
        <div className="space-y-6">
          {/* Match Overview Header */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <span className="font-bold text-slate-100 text-lg">{currentTeam.name}</span>
                <span className="font-mono text-xs text-slate-500 font-bold">vs</span>
                <span className="font-bold text-slate-100 text-lg">{opponentTeam.name}</span>
              </div>
              <div className="flex items-center gap-3 font-mono text-xs">
                <span className="text-emerald-400 font-bold bg-emerald-950/60 px-3 py-1 rounded-lg border border-emerald-500/30">
                  {currentTeam.name} {matchXGSummary.homeTotalXG} xG ({matchXGSummary.homeActualGoals} G)
                </span>
                <span className="text-cyan-400 font-bold bg-cyan-950/60 px-3 py-1 rounded-lg border border-cyan-500/30">
                  {opponentTeam.name} {matchXGSummary.awayTotalXG} xG ({matchXGSummary.awayActualGoals} G)
                </span>
              </div>
            </div>

            {/* Cumulative xG Area Chart */}
            <div className="space-y-2">
              <span className="font-mono text-xs font-bold text-slate-400 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-amber-400" />
                Minute-by-Minute Cumulative xG Progression:
              </span>
              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={matchXGSummary.xgTimeline}>
                    <defs>
                      <linearGradient id="homeXGGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="awayXGGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="minute" stroke="#64748b" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                      labelStyle={{ color: '#cbd5e1', fontWeight: 'bold' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="homeCumXG"
                      name={currentTeam.name}
                      stroke="#10b981"
                      fillOpacity={1}
                      fill="url(#homeXGGrad)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="awayCumXG"
                      name={opponentTeam.name}
                      stroke="#06b6d4"
                      fillOpacity={1}
                      fill="url(#awayXGGrad)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Individual Shots Breakdown Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm font-bold text-slate-200 flex items-center gap-2">
                <Target className="w-4 h-4 text-amber-400" />
                Individual Shot Events & xG Value Storage ({matchXGSummary.shotsLog.length} shots)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-slate-400">
                    <th className="py-2.5 px-3">Min</th>
                    <th className="py-2.5 px-3">Team</th>
                    <th className="py-2.5 px-3">Shooter</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Dist</th>
                    <th className="py-2.5 px-3">Angle</th>
                    <th className="py-2.5 px-3">xG Value</th>
                    <th className="py-2.5 px-3">Rating</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {matchXGSummary.shotsLog.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2 px-3 text-amber-400 font-bold">{item.shot.minute}'</td>
                      <td className="py-2 px-3 font-semibold text-slate-200">
                        {item.shot.teamName}
                      </td>
                      <td className="py-2 px-3 text-slate-300">{item.shot.shooterName}</td>
                      <td className="py-2 px-3 text-slate-400 capitalize">
                        {item.shot.shotType.replace(/_/g, ' ')}
                      </td>
                      <td className="py-2 px-3 text-slate-300">{item.shot.distanceMeters}m</td>
                      <td className="py-2 px-3 text-slate-300">{item.shot.angleDegrees}°</td>
                      <td className="py-2 px-3 font-bold text-emerald-400">
                        {item.xgValue.toFixed(3)}
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.dangerRating === 'CRITICAL_GOAL_CHANCE'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : item.dangerRating === 'HIGH'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {item.dangerRating}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* TAB 3: TEAM ROLLING PERFORMANCE OVER TIME                             */}
      {/* -------------------------------------------------------------------- */}
      {activeTab === 'team_rolling' && (
        <div className="space-y-6">
          {/* Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
              <span className="font-mono text-xs text-slate-400 block">5-Match Rolling xG</span>
              <span className="font-mono text-2xl font-bold text-emerald-400">
                {teamRollingProfile.rolling5XGCreatedAvg}
              </span>
              <span className="font-mono text-[10px] text-slate-500 block">per game</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
              <span className="font-mono text-xs text-slate-400 block">10-Match Rolling xGA</span>
              <span className="font-mono text-2xl font-bold text-rose-400">
                {teamRollingProfile.rolling10XGConcededAvg}
              </span>
              <span className="font-mono text-[10px] text-slate-500 block">goals conceded exp</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
              <span className="font-mono text-xs text-slate-400 block">Finishing Efficiency</span>
              <span className="font-mono text-2xl font-bold text-amber-400">
                {teamRollingProfile.xgFinishingEfficiency}x
              </span>
              <span className="font-mono text-[10px] text-slate-500 block">Goals / xG Ratio</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
              <span className="font-mono text-xs text-slate-400 block">xG Dominance Share</span>
              <span className="font-mono text-2xl font-bold text-cyan-400">
                {teamRollingProfile.xgDominanceIndex}%
              </span>
              <span className="font-mono text-[10px] text-slate-500 block">match control</span>
            </div>
          </div>

          {/* Rolling Trend Chart */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
            <span className="font-mono text-sm font-bold text-slate-200 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              10-Match Rolling xG vs Actual Goals Scored ({currentTeam.name})
            </span>
            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rollingTrendChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="match" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                  />
                  <Bar dataKey="xgCreated" name="xG Created" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="goalsScored" name="Actual Goals" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* TAB 4: ML xG FEATURE IMPORTANCE & WEIGHTS                           */}
      {/* -------------------------------------------------------------------- */}
      {activeTab === 'ml_importance' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="font-mono text-sm font-bold text-slate-200 flex items-center gap-2">
                <BrainCircuitIcon className="w-4 h-4 text-amber-400" />
                Engineered xG Features Integrated into ML Prediction Engines
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-amber-400 font-bold block">1. Non-Penalty xG Differential (npxG)</span>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Strips away penalty variance to measure true open-play chance creation dominance over rolling 5 and 10 match windows.
                </p>
                <div className="text-emerald-400 font-bold text-[11px]">
                  Current Delta: {engineeredXGComparison.homeNpxGDiff > 0 ? '+' : ''}{engineeredXGComparison.homeNpxGDiff} npxG
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-amber-400 font-bold block">2. Finishing Efficiency Index</span>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Measures world-class finishing ability (Goals Scored / xG) versus underperforming streak luck.
                </p>
                <div className="text-emerald-400 font-bold text-[11px]">
                  Home Ratio: {engineeredXGComparison.homeFinishingEfficiency}x | Away Ratio: {engineeredXGComparison.awayFinishingEfficiency}x
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-amber-400 font-bold block">3. Shot Quality Rating (xG / Shot)</span>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Evaluates tactical shot selection — distinguishing high-value box penetrations from wasteful long-range attempts.
                </p>
                <div className="text-emerald-400 font-bold text-[11px]">
                  Average Shot Value: {engineeredXGComparison.homeShotQuality} xG/shot
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-amber-400 font-bold block">4. xG Momentum Velocity</span>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Calculates short-term 3-match xG surge compared to 10-match baseline to capture rapid tactical momentum shifts.
                </p>
                <div className="text-emerald-400 font-bold text-[11px]">
                  Momentum Vector: {engineeredXGComparison.homeXGTrendMomentum > 0 ? '+' : ''}{engineeredXGComparison.homeXGTrendMomentum}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function BrainCircuitIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.5 3.875 4 4 0 0 0 2.5 3.875A3 3 0 1 0 12 12a3 3 0 1 0 5.997-.125 4 4 0 0 0 2.5-3.875 4 4 0 0 0-2.5-3.875A3 3 0 1 0 12 5Z" />
      <path d="M12 12v9" />
      <path d="m16 16-4 4-4-4" />
    </svg>
  );
}
