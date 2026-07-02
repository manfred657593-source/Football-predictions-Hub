import React, { useState } from 'react';
import {
  Flame,
  TrendingUp,
  Activity,
  BarChart2,
  Calendar,
  Layers,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Team } from '../types';

export interface MatchXGLog {
  matchNumber: number;
  opponent: string;
  isHome: boolean;
  xgCreated: number;
  xgConceded: number;
  xgDiff: number;
  actualGoals: number;
  actualConceded: number;
  result: 'W' | 'D' | 'L';
}

interface XGHeatmapProps {
  homeTeam: Team;
  awayTeam: Team;
  className?: string;
}

/**
 * Generates deterministic, realistic 10-match rolling xG history logs for any team
 */
export function generateTeamXGHistory(team: Team): MatchXGLog[] {
  const seed = (team.id || team.name)
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);

  const opponentsPool = [
    'Brighton',
    'West Ham',
    'Aston Villa',
    'Newcastle',
    'Tottenham',
    'Fulham',
    'Everton',
    'Wolves',
    'Brentford',
    'Crystal Palace',
    'Sevilla',
    'Atalanta',
    'Lazio',
    'Real Sociedad',
    'Villareal',
  ];

  const logs: MatchXGLog[] = [];
  const baseXG = team.xGPerGame || 1.85;
  const baseDef = team.defenseStrength || 0.75;

  for (let i = 1; i <= 10; i++) {
    const noise1 = Math.sin(seed * 7 + i * 3.3) * 0.45;
    const noise2 = Math.cos(seed * 11 + i * 5.1) * 0.35;
    const isHome = (seed + i) % 2 === 0;

    const xgCreated = Number(
      Math.max(0.4, baseXG + noise1 + (isHome ? 0.22 : -0.12)).toFixed(2)
    );
    const xgConceded = Number(
      Math.max(0.3, baseDef + noise2 + (isHome ? -0.12 : 0.22)).toFixed(2)
    );
    const xgDiff = Number((xgCreated - xgConceded).toFixed(2));

    const goalsScored = Math.max(
      0,
      Math.round(xgCreated + (noise2 > 0.15 ? 1 : noise2 < -0.25 ? -1 : 0))
    );
    const goalsConceded = Math.max(
      0,
      Math.round(xgConceded + (noise1 < -0.15 ? 1 : noise1 > 0.25 ? -1 : 0))
    );

    let result: 'W' | 'D' | 'L' = 'D';
    if (goalsScored > goalsConceded) result = 'W';
    else if (goalsScored < goalsConceded) result = 'L';

    const opponent = opponentsPool[(seed + i * 3) % opponentsPool.length];

    logs.push({
      matchNumber: i,
      opponent,
      isHome,
      xgCreated,
      xgConceded,
      xgDiff,
      actualGoals: goalsScored,
      actualConceded: goalsConceded,
      result,
    });
  }

  return logs;
}

export const XGHeatmap: React.FC<XGHeatmapProps> = ({
  homeTeam,
  awayTeam,
  className = '',
}) => {
  const [activeView, setActiveView] = useState<'matrix' | 'timeline'>('matrix');

  const homeLogs = generateTeamXGHistory(homeTeam);
  const awayLogs = generateTeamXGHistory(awayTeam);

  // Compute 10-match averages
  const calcAvg = (logs: MatchXGLog[], key: 'xgCreated' | 'xgConceded' | 'xgDiff') => {
    const sum = logs.reduce((acc, l) => acc + l[key], 0);
    return Number((sum / logs.length).toFixed(2));
  };

  const homeAvgCreated = calcAvg(homeLogs, 'xgCreated');
  const homeAvgConceded = calcAvg(homeLogs, 'xgConceded');
  const homeAvgDiff = calcAvg(homeLogs, 'xgDiff');

  const awayAvgCreated = calcAvg(awayLogs, 'xgCreated');
  const awayAvgConceded = calcAvg(awayLogs, 'xgConceded');
  const awayAvgDiff = calcAvg(awayLogs, 'xgDiff');

  // Heatmap Color Helper for xG created or Differential
  const getXGHeatmapBg = (val: number, type: 'created' | 'conceded' | 'diff') => {
    if (type === 'created') {
      if (val >= 2.2) return 'bg-emerald-500/35 text-emerald-300 font-bold border-emerald-500/50';
      if (val >= 1.5) return 'bg-emerald-500/20 text-emerald-400 font-semibold';
      if (val >= 1.0) return 'bg-slate-800 text-slate-300';
      return 'bg-rose-500/20 text-rose-300';
    }
    if (type === 'conceded') {
      if (val <= 0.7) return 'bg-emerald-500/30 text-emerald-300 font-bold border-emerald-500/50';
      if (val <= 1.2) return 'bg-emerald-500/15 text-slate-300';
      if (val <= 1.8) return 'bg-amber-500/20 text-amber-300';
      return 'bg-rose-500/30 text-rose-300 font-bold';
    }
    // diff
    if (val >= 1.0) return 'bg-emerald-500/40 text-emerald-200 font-bold border-emerald-500/60';
    if (val >= 0.2) return 'bg-emerald-500/20 text-emerald-400 font-semibold';
    if (val >= -0.2) return 'bg-slate-800 text-slate-300';
    return 'bg-rose-500/30 text-rose-300 font-bold';
  };

  // Recharts timeline combined data
  const chartData = homeLogs.map((hLog, idx) => {
    const aLog = awayLogs[idx];
    return {
      match: `M${hLog.matchNumber}`,
      [`${homeTeam.name} xG`]: hLog.xgCreated,
      [`${awayTeam.name} xG`]: aLog.xgCreated,
      [`${homeTeam.name} ΔxG`]: hLog.xgDiff,
      [`${awayTeam.name} ΔxG`]: aLog.xgDiff,
    };
  });

  return (
    <div
      id="xg-heatmap-container"
      className={`bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-5 font-mono ${className}`}
    >
      {/* Header & Mode Toggles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
              Rolling 10-Match Expected Goals (xG) Heatmap
            </h3>
            <p className="text-[11px] text-slate-400 font-sans">
              Measures shot quality created (xG), conceded (xGA), and net differential over recent matches
            </p>
          </div>
        </div>

        {/* View Switcher Buttons */}
        <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px]">
          <button
            id="btn-xg-view-matrix"
            onClick={() => setActiveView('matrix')}
            className={`px-3 py-1 rounded font-bold cursor-pointer transition-colors ${
              activeView === 'matrix'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Heatmap Matrix
          </button>
          <button
            id="btn-xg-view-timeline"
            onClick={() => setActiveView('timeline')}
            className={`px-3 py-1 rounded font-bold cursor-pointer transition-colors ${
              activeView === 'timeline'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Trend Timeline
          </button>
        </div>
      </div>

      {/* 10-Match Rolling Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-500 uppercase font-bold block">
            {homeTeam.name} Avg xG
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-base font-bold text-emerald-400">{homeAvgCreated}</span>
            <span className="text-[10px] text-slate-400">Created / match</span>
          </div>
          <span className="text-[10px] text-slate-400 block">
            Conceded: <strong className="text-slate-300">{homeAvgConceded}</strong>
          </span>
        </div>

        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-500 uppercase font-bold block">
            {homeTeam.name} Net xG Diff
          </span>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-base font-bold ${
                homeAvgDiff >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {homeAvgDiff >= 0 ? `+${homeAvgDiff}` : homeAvgDiff}
            </span>
            <span className="text-[10px] text-slate-400">ΔxG per game</span>
          </div>
          <span className="text-[10px] text-slate-400 block">Rolling 10-match dominance</span>
        </div>

        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-500 uppercase font-bold block">
            {awayTeam.name} Avg xG
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-base font-bold text-cyan-400">{awayAvgCreated}</span>
            <span className="text-[10px] text-slate-400">Created / match</span>
          </div>
          <span className="text-[10px] text-slate-400 block">
            Conceded: <strong className="text-slate-300">{awayAvgConceded}</strong>
          </span>
        </div>

        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-500 uppercase font-bold block">
            {awayTeam.name} Net xG Diff
          </span>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-base font-bold ${
                awayAvgDiff >= 0 ? 'text-cyan-400' : 'text-rose-400'
              }`}
            >
              {awayAvgDiff >= 0 ? `+${awayAvgDiff}` : awayAvgDiff}
            </span>
            <span className="text-[10px] text-slate-400">ΔxG per game</span>
          </div>
          <span className="text-[10px] text-slate-400 block">Rolling 10-match dominance</span>
        </div>
      </div>

      {/* MATRIX HEATMAP VIEW */}
      {activeView === 'matrix' && (
        <div className="space-y-5 overflow-x-auto">
          {/* Home Team Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-emerald-400 uppercase flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                {homeTeam.name} (Home) &mdash; Last 10 Matches xG Heatmap Matrix
              </span>
              <span className="text-slate-400 text-[11px]">xG Created vs Conceded</span>
            </div>

            <table className="w-full border-collapse text-center text-xs">
              <thead>
                <tr className="bg-slate-950 border border-slate-800 text-slate-400 font-bold text-[10px]">
                  <th className="p-2 text-left w-24">Match</th>
                  {homeLogs.map((log) => (
                    <th key={log.matchNumber} className="p-2 border-l border-slate-800">
                      M{log.matchNumber}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Row 1: Opponent */}
                <tr className="bg-slate-950/50 border-b border-slate-800 text-[10px] text-slate-400">
                  <td className="p-2 text-left font-bold text-slate-300">Opponent</td>
                  {homeLogs.map((log) => (
                    <td key={log.matchNumber} className="p-1.5 border-l border-slate-800 truncate max-w-[60px]" title={log.opponent}>
                      {log.opponent.slice(0, 5)}
                    </td>
                  ))}
                </tr>

                {/* Row 2: xG Created */}
                <tr className="border-b border-slate-800/80">
                  <td className="p-2 text-left font-bold text-slate-300">xG Created</td>
                  {homeLogs.map((log) => (
                    <td
                      key={log.matchNumber}
                      className={`p-2 border-l border-slate-800 ${getXGHeatmapBg(
                        log.xgCreated,
                        'created'
                      )}`}
                      title={`xG: ${log.xgCreated} (Actual Goals: ${log.actualGoals})`}
                    >
                      {log.xgCreated}
                    </td>
                  ))}
                </tr>

                {/* Row 3: xG Conceded */}
                <tr className="border-b border-slate-800/80">
                  <td className="p-2 text-left font-bold text-slate-300">xG Conceded</td>
                  {homeLogs.map((log) => (
                    <td
                      key={log.matchNumber}
                      className={`p-2 border-l border-slate-800 ${getXGHeatmapBg(
                        log.xgConceded,
                        'conceded'
                      )}`}
                      title={`xGA: ${log.xgConceded} (Actual Conceded: ${log.actualConceded})`}
                    >
                      {log.xgConceded}
                    </td>
                  ))}
                </tr>

                {/* Row 4: Net xG Diff */}
                <tr className="border-b border-slate-800">
                  <td className="p-2 text-left font-bold text-slate-300">Net ΔxG</td>
                  {homeLogs.map((log) => (
                    <td
                      key={log.matchNumber}
                      className={`p-2 border-l border-slate-800 ${getXGHeatmapBg(
                        log.xgDiff,
                        'diff'
                      )}`}
                      title={`Net xG Diff: ${log.xgDiff > 0 ? `+${log.xgDiff}` : log.xgDiff}`}
                    >
                      {log.xgDiff > 0 ? `+${log.xgDiff}` : log.xgDiff}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Away Team Section */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-cyan-400 uppercase flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 inline-block" />
                {awayTeam.name} (Away) &mdash; Last 10 Matches xG Heatmap Matrix
              </span>
              <span className="text-slate-400 text-[11px]">xG Created vs Conceded</span>
            </div>

            <table className="w-full border-collapse text-center text-xs">
              <thead>
                <tr className="bg-slate-950 border border-slate-800 text-slate-400 font-bold text-[10px]">
                  <th className="p-2 text-left w-24">Match</th>
                  {awayLogs.map((log) => (
                    <th key={log.matchNumber} className="p-2 border-l border-slate-800">
                      M{log.matchNumber}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Row 1: Opponent */}
                <tr className="bg-slate-950/50 border-b border-slate-800 text-[10px] text-slate-400">
                  <td className="p-2 text-left font-bold text-slate-300">Opponent</td>
                  {awayLogs.map((log) => (
                    <td key={log.matchNumber} className="p-1.5 border-l border-slate-800 truncate max-w-[60px]" title={log.opponent}>
                      {log.opponent.slice(0, 5)}
                    </td>
                  ))}
                </tr>

                {/* Row 2: xG Created */}
                <tr className="border-b border-slate-800/80">
                  <td className="p-2 text-left font-bold text-slate-300">xG Created</td>
                  {awayLogs.map((log) => (
                    <td
                      key={log.matchNumber}
                      className={`p-2 border-l border-slate-800 ${getXGHeatmapBg(
                        log.xgCreated,
                        'created'
                      )}`}
                      title={`xG: ${log.xgCreated} (Actual Goals: ${log.actualGoals})`}
                    >
                      {log.xgCreated}
                    </td>
                  ))}
                </tr>

                {/* Row 3: xG Conceded */}
                <tr className="border-b border-slate-800/80">
                  <td className="p-2 text-left font-bold text-slate-300">xG Conceded</td>
                  {awayLogs.map((log) => (
                    <td
                      key={log.matchNumber}
                      className={`p-2 border-l border-slate-800 ${getXGHeatmapBg(
                        log.xgConceded,
                        'conceded'
                      )}`}
                      title={`xGA: ${log.xgConceded} (Actual Conceded: ${log.actualConceded})`}
                    >
                      {log.xgConceded}
                    </td>
                  ))}
                </tr>

                {/* Row 4: Net xG Diff */}
                <tr className="border-b border-slate-800">
                  <td className="p-2 text-left font-bold text-slate-300">Net ΔxG</td>
                  {awayLogs.map((log) => (
                    <td
                      key={log.matchNumber}
                      className={`p-2 border-l border-slate-800 ${getXGHeatmapBg(
                        log.xgDiff,
                        'diff'
                      )}`}
                      title={`Net xG Diff: ${log.xgDiff > 0 ? `+${log.xgDiff}` : log.xgDiff}`}
                    >
                      {log.xgDiff > 0 ? `+${log.xgDiff}` : log.xgDiff}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TREND TIMELINE VIEW */}
      {activeView === 'timeline' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-bold uppercase">
              10-Match xG Rolling Trend Comparison
            </span>
            <div className="flex items-center gap-3 text-xs font-bold">
              <span className="text-emerald-400 flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                {homeTeam.name} xG
              </span>
              <span className="text-cyan-400 flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
                {awayTeam.name} xG
              </span>
            </div>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="homeXgGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="awayXgGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="match" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} domain={[0, 3.5]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#020617',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '11px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey={`${homeTeam.name} xG`}
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#homeXgGrad)"
                />
                <Area
                  type="monotone"
                  dataKey={`${awayTeam.name} xG`}
                  stroke="#06b6d4"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#awayXgGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default XGHeatmap;
