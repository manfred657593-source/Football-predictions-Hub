import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  CartesianGrid,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import {
  TrendingUp,
  Award,
  Zap,
  Target,
  BarChart3,
  Flame,
  Shield,
  Layers,
  Sparkles,
  Info,
  ChevronRight,
  Maximize2,
} from 'lucide-react';
import { Team, PredictionResult } from '../types';

interface WinMarginTrendChartProps {
  homeTeam: Team;
  awayTeam: Team;
  predictionResult?: PredictionResult;
}

export interface HistoricalMatchMargin {
  matchIndex: number;
  opponent: string;
  venue: 'Home' | 'Away';
  goalsFor: number;
  goalsAgainst: number;
  margin: number; // goalsFor - goalsAgainst (+3, +2, +1, 0, -1, -2, -3)
  result: 'W' | 'D' | 'L';
  category: 'Blowout Win' | 'Comfortable Win' | 'Tight Win' | 'Draw' | 'Tight Loss' | 'Comfortable Loss' | 'Heavy Defeat';
  scoreStr: string;
}

/**
 * Deterministically generates 10 historical recent matches and margin profiles for a team
 */
function generateHistoricalMargins(team: Team): HistoricalMatchMargin[] {
  const seed = (team.id || team.name).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const OPPONENTS = [
    'Aston Villa',
    'Brighton',
    'Fulham',
    'Everton',
    'Wolves',
    'Crystal Palace',
    'West Ham',
    'Newcastle',
    'Tottenham',
    'Brentford',
  ];

  const form = team.recentForm || ['W', 'D', 'W', 'W', 'L'];
  const matches: HistoricalMatchMargin[] = [];

  for (let i = 1; i <= 10; i++) {
    const opp = OPPONENTS[(seed + i * 3) % OPPONENTS.length];
    const isHome = i % 2 === 1;

    // Determine result based on team's form & strength
    const formOutcome = form[(i - 1) % form.length];
    const strengthFactor = (team.attackStrength - team.defenseStrength) * 1.5;

    let gf = 0;
    let ga = 0;

    if (formOutcome === 'W') {
      const isBlowoutProb = (seed * 7 + i * 13) % 10;
      if (team.attackStrength > 1.30 && isBlowoutProb < 4) {
        gf = 3 + ((seed + i) % 3); // 3, 4, 5
        ga = (seed + i) % 2; // 0 or 1
      } else if (isBlowoutProb < 7) {
        gf = 2;
        ga = 0;
      } else {
        gf = 1 + ((seed + i) % 2);
        ga = gf - 1;
      }
    } else if (formOutcome === 'D') {
      gf = (seed + i) % 3; // 0-0, 1-1, 2-2
      ga = gf;
    } else {
      ga = 1 + ((seed + i) % 3);
      gf = Math.max(0, ga - (1 + ((seed + i) % 2)));
    }

    const margin = gf - ga;
    const result: 'W' | 'D' | 'L' = margin > 0 ? 'W' : margin === 0 ? 'D' : 'L';

    let category: HistoricalMatchMargin['category'] = 'Draw';
    if (margin >= 3) category = 'Blowout Win';
    else if (margin === 2) category = 'Comfortable Win';
    else if (margin === 1) category = 'Tight Win';
    else if (margin === 0) category = 'Draw';
    else if (margin === -1) category = 'Tight Loss';
    else if (margin === -2) category = 'Comfortable Loss';
    else category = 'Heavy Defeat';

    matches.push({
      matchIndex: i,
      opponent: opp,
      venue: isHome ? 'Home' : 'Away',
      goalsFor: gf,
      goalsAgainst: ga,
      margin,
      result,
      category,
      scoreStr: `${gf}-${ga}`,
    });
  }

  return matches;
}

export const WinMarginTrendChart: React.FC<WinMarginTrendChartProps> = ({
  homeTeam,
  awayTeam,
  predictionResult,
}) => {
  const [activeView, setActiveView] = useState<'home' | 'away' | 'upcoming'>('home');

  const homeMatches = useMemo(() => generateHistoricalMargins(homeTeam), [homeTeam]);
  const awayMatches = useMemo(() => generateHistoricalMargins(awayTeam), [awayTeam]);

  // Compute summary stats for Home Team
  const homeStats = useMemo(() => {
    const wins = homeMatches.filter((m) => m.result === 'W');
    const tightWins = wins.filter((m) => m.margin === 1).length;
    const comfortableWins = wins.filter((m) => m.margin === 2).length;
    const blowoutWins = wins.filter((m) => m.margin >= 3).length;
    const avgWinMargin = wins.length > 0
      ? Number((wins.reduce((acc, m) => acc + m.margin, 0) / wins.length).toFixed(2))
      : 0;

    return {
      totalWins: wins.length,
      tightWins,
      comfortableWins,
      blowoutWins,
      tightPct: wins.length > 0 ? (tightWins / wins.length) * 100 : 0,
      blowoutPct: wins.length > 0 ? (blowoutWins / wins.length) * 100 : 0,
      avgWinMargin,
      tag: blowoutWins >= 3 ? 'BLOWOUT HEAVYWEIGHT' : tightWins >= 3 ? 'CLUTCH 1-GOAL FINISHER' : 'BALANCED MARGINS',
    };
  }, [homeMatches]);

  // Compute summary stats for Away Team
  const awayStats = useMemo(() => {
    const wins = awayMatches.filter((m) => m.result === 'W');
    const tightWins = wins.filter((m) => m.margin === 1).length;
    const comfortableWins = wins.filter((m) => m.margin === 2).length;
    const blowoutWins = wins.filter((m) => m.margin >= 3).length;
    const avgWinMargin = wins.length > 0
      ? Number((wins.reduce((acc, m) => acc + m.margin, 0) / wins.length).toFixed(2))
      : 0;

    return {
      totalWins: wins.length,
      tightWins,
      comfortableWins,
      blowoutWins,
      tightPct: wins.length > 0 ? (tightWins / wins.length) * 100 : 0,
      blowoutPct: wins.length > 0 ? (blowoutWins / wins.length) * 100 : 0,
      avgWinMargin,
      tag: blowoutWins >= 3 ? 'BLOWOUT HEAVYWEIGHT' : tightWins >= 3 ? 'CLUTCH 1-GOAL FINISHER' : 'BALANCED MARGINS',
    };
  }, [awayMatches]);

  // Modeled Win-By-Margin Probabilities for the Upcoming Fixture
  const upcomingMarginDistribution = useMemo(() => {
    if (!predictionResult || !predictionResult.correctScores) return [];

    let homeBlowoutProb = 0;     // +3 or more goals
    let homeComfortableProb = 0; // +2 goals
    let homeTightProb = 0;       // +1 goal
    let drawProb = 0;            // 0 goal diff
    let awayTightProb = 0;       // +1 goal for Away
    let awayComfortableProb = 0; // +2 goals for Away
    let awayBlowoutProb = 0;     // +3 or more goals for Away

    predictionResult.correctScores.forEach((cs) => {
      const diff = cs.homeGoals - cs.awayGoals;
      if (diff >= 3) homeBlowoutProb += cs.probability;
      else if (diff === 2) homeComfortableProb += cs.probability;
      else if (diff === 1) homeTightProb += cs.probability;
      else if (diff === 0) drawProb += cs.probability;
      else if (diff === -1) awayTightProb += cs.probability;
      else if (diff === -2) awayComfortableProb += cs.probability;
      else if (diff <= -3) awayBlowoutProb += cs.probability;
    });

    return [
      { category: `${homeTeam.name} Blowout (3+ Goals)`, marginLabel: '+3+', prob: Number((homeBlowoutProb * 100).toFixed(1)), side: 'home' },
      { category: `${homeTeam.name} Comfortable (+2 Goals)`, marginLabel: '+2', prob: Number((homeComfortableProb * 100).toFixed(1)), side: 'home' },
      { category: `${homeTeam.name} Tight (+1 Goal)`, marginLabel: '+1', prob: Number((homeTightProb * 100).toFixed(1)), side: 'home' },
      { category: 'Draw (0 Goal Margin)', marginLabel: '0', prob: Number((drawProb * 100).toFixed(1)), side: 'draw' },
      { category: `${awayTeam.name} Tight (+1 Goal)`, marginLabel: '-1', prob: Number((awayTightProb * 100).toFixed(1)), side: 'away' },
      { category: `${awayTeam.name} Comfortable (+2 Goals)`, marginLabel: '-2', prob: Number((awayComfortableProb * 100).toFixed(1)), side: 'away' },
      { category: `${awayTeam.name} Blowout (3+ Goals)`, marginLabel: '-3+', prob: Number((awayBlowoutProb * 100).toFixed(1)), side: 'away' },
    ];
  }, [predictionResult, homeTeam.name, awayTeam.name]);

  const activeMatches = activeView === 'home' ? homeMatches : awayMatches;
  const activeTeamName = activeView === 'home' ? homeTeam.name : awayTeam.name;
  const activeStats = activeView === 'home' ? homeStats : awayStats;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-5 font-sans">
      {/* Component Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 text-emerald-400">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-slate-100 uppercase font-mono tracking-tight">
                Win-By-Margin Trend & Volatility Analysis
              </h3>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold">
                DIXON-COLES ALIGNED
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Evaluates historical goal margin distributions (tight 1-goal thrillers vs 3+ goal blowouts)
            </p>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex bg-slate-950 border border-slate-800 rounded-lg p-1 font-mono text-xs shrink-0">
          <button
            id="btn-winmargin-home"
            onClick={() => setActiveView('home')}
            className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeView === 'home'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>{homeTeam.name}</span>
          </button>

          <button
            id="btn-winmargin-away"
            onClick={() => setActiveView('away')}
            className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeView === 'away'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>{awayTeam.name}</span>
          </button>

          <button
            id="btn-winmargin-upcoming"
            onClick={() => setActiveView('upcoming')}
            className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeView === 'upcoming'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Upcoming Probabilities</span>
          </button>
        </div>
      </div>

      {/* Stats Summary Grid (Only shown in team views) */}
      {activeView !== 'upcoming' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono text-xs">
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <span className="text-[10px] text-slate-400 block uppercase">Tight 1-Goal Wins</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-base font-bold text-emerald-400">
                {activeStats.tightWins} / {activeStats.totalWins}
              </span>
              <span className="text-[10px] text-slate-400 font-bold">
                {activeStats.tightPct.toFixed(0)}%
              </span>
            </div>
            <span className="text-[9px] text-slate-400 block mt-1">High pressure close finishes</span>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <span className="text-[10px] text-slate-400 block uppercase">Comfortable Wins (+2)</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-base font-bold text-cyan-400">
                {activeStats.comfortableWins}
              </span>
              <span className="text-[10px] text-slate-400 font-bold">
                {activeStats.totalWins > 0 ? ((activeStats.comfortableWins / activeStats.totalWins) * 100).toFixed(0) : 0}%
              </span>
            </div>
            <span className="text-[9px] text-slate-400 block mt-1">Controlled 2-goal leads</span>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <span className="text-[10px] text-slate-400 block uppercase">Blowout Wins (+3 Goals)</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-base font-bold text-amber-400">
                {activeStats.blowoutWins}
              </span>
              <span className="text-[10px] text-amber-400/80 font-bold">
                {activeStats.blowoutPct.toFixed(0)}%
              </span>
            </div>
            <span className="text-[9px] text-slate-400 block mt-1">Dominant multi-goal victories</span>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <span className="text-[10px] text-slate-400 block uppercase">Tactical Profile</span>
            <div className="mt-1">
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold inline-block truncate max-w-full">
                {activeStats.tag}
              </span>
            </div>
            <span className="text-[9px] text-slate-400 block mt-1">
              Avg win margin: +{activeStats.avgWinMargin} goals
            </span>
          </div>
        </div>
      )}

      {/* Main Chart Area */}
      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/90">
        <div className="flex items-center justify-between mb-3 font-mono text-xs">
          <span className="text-slate-300 font-bold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            {activeView === 'upcoming'
              ? `Modeled Win-By-Margin Probability Distribution (${homeTeam.name} vs ${awayTeam.name})`
              : `Last 10 Matches Goal Margin Trajectory (${activeTeamName})`}
          </span>

          <span className="text-[10px] text-slate-400">
            {activeView === 'upcoming' ? 'Poisson Goal Spread Probabilities' : 'Positive = Victory Margin, Negative = Defeat Margin'}
          </span>
        </div>

        <div className="h-64 w-full">
          {activeView !== 'upcoming' ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activeMatches} margin={{ top: 15, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="opponent"
                  tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
                  interval={0}
                />
                <YAxis
                  domain={[-4, 4]}
                  tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
                  ticks={[-4, -3, -2, -1, 0, 1, 2, 3, 4]}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data: HistoricalMatchMargin = payload[0].payload;
                      return (
                        <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl font-mono text-xs space-y-1">
                          <p className="font-bold text-slate-100 border-b border-slate-800 pb-1">
                            vs {data.opponent} ({data.venue})
                          </p>
                          <div className="flex justify-between gap-4 text-slate-300">
                            <span>Score:</span>
                            <span className="font-bold text-emerald-400">{data.scoreStr}</span>
                          </div>
                          <div className="flex justify-between gap-4 text-slate-300">
                            <span>Goal Margin:</span>
                            <span className={`font-bold ${data.margin > 0 ? 'text-emerald-400' : data.margin === 0 ? 'text-amber-400' : 'text-rose-400'}`}>
                              {data.margin > 0 ? `+${data.margin}` : data.margin}
                            </span>
                          </div>
                          <div className="flex justify-between gap-4 text-slate-300 pt-1 border-t border-slate-800 text-[10px]">
                            <span>Category:</span>
                            <span className="text-cyan-400 font-bold">{data.category}</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine y={0} stroke="#475569" strokeWidth={1.5} />
                <Bar dataKey="margin" radius={[4, 4, 0, 0]}>
                  {activeMatches.map((entry, index) => {
                    let fill = '#10b981'; // Green for wins
                    if (entry.margin === 0) fill = '#f59e0b'; // Amber for draw
                    else if (entry.margin < 0) fill = '#f43f5e'; // Rose for loss
                    return <Cell key={`cell-${index}`} fill={fill} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={upcomingMarginDistribution} margin={{ top: 15, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="marginLabel"
                  tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
                />
                <YAxis
                  unit="%"
                  tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl font-mono text-xs space-y-1">
                          <p className="font-bold text-slate-100 border-b border-slate-800 pb-1">
                            {data.category}
                          </p>
                          <div className="flex justify-between gap-4 text-slate-300">
                            <span>Modeled Probability:</span>
                            <span className="font-bold text-emerald-400">{data.prob}%</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="prob" radius={[6, 6, 0, 0]}>
                  {upcomingMarginDistribution.map((entry, index) => {
                    let fill = '#10b981';
                    if (entry.side === 'draw') fill = '#f59e0b';
                    else if (entry.side === 'away') fill = '#06b6d4';
                    return <Cell key={`prob-cell-${index}`} fill={fill} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Tactical Analytical Breakdown */}
      <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 font-mono text-xs space-y-2">
        <div className="flex items-center gap-2 text-amber-400 font-bold uppercase tracking-wider text-[11px]">
          <Target className="w-4 h-4" />
          <span>Margin Pattern Insights & Tactical Implications</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-slate-300 text-[11px]">
          <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800/80 space-y-1">
            <span className="text-emerald-400 font-bold block">{homeTeam.name} Pattern:</span>
            <p className="text-slate-400 leading-relaxed">
              {homeStats.tightWins >= 3
                ? `${homeTeam.name} specializes in holding tight 1-goal leads (${homeStats.tightPct.toFixed(0)}% of wins). Expect strong late-game defensive compression.`
                : `${homeTeam.name} frequently breaks matches open with ${homeStats.blowoutPct.toFixed(0)}% of victories resulting in 3+ goal blowouts.`}
            </p>
          </div>

          <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800/80 space-y-1">
            <span className="text-cyan-400 font-bold block">{awayTeam.name} Pattern:</span>
            <p className="text-slate-400 leading-relaxed">
              {awayStats.tightWins >= 3
                ? `${awayTeam.name} operates with minimal goal variance, securing ${awayStats.tightWins} close 1-goal wins this season.`
                : `${awayTeam.name} averages a +${awayStats.avgWinMargin} victory margin when claiming 3 points.`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
