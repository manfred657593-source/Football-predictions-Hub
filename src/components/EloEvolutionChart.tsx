import React, { useState } from 'react';
import {
  TrendingUp,
  Activity,
  LineChart as LineChartIcon,
  Zap,
  Shield,
  Award,
  Calendar,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { Team } from '../types';

export interface GameweekData {
  gw: number;
  label: string;
  homeElo: number;
  awayElo: number;
  homeAttack: number;
  awayAttack: number;
  homeDefense: number;
  awayDefense: number;
}

interface EloEvolutionChartProps {
  homeTeam: Team;
  awayTeam: Team;
  className?: string;
}

/**
 * Generates a realistic 20-Gameweek historical season evolution trajectory
 * ending at the current team metrics (Elo, Attack Strength, Defense Strength)
 */
export function generateSeasonEvolution(homeTeam: Team, awayTeam: Team): GameweekData[] {
  const getSeed = (team: Team) =>
    (team.id || team.name).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

  const homeSeed = getSeed(homeTeam);
  const awaySeed = getSeed(awayTeam);

  const totalGWs = 20;
  const data: GameweekData[] = [];

  // Generate initial baseline 20 gameweeks ago
  const homeStartElo = Math.round(homeTeam.elo - (Math.sin(homeSeed) * 40 + 20));
  const awayStartElo = Math.round(awayTeam.elo - (Math.sin(awaySeed) * 40 + 15));

  const homeStartAtt = Math.max(0.7, Number((homeTeam.attackStrength - 0.25).toFixed(2)));
  const awayStartAtt = Math.max(0.7, Number((awayTeam.attackStrength - 0.20).toFixed(2)));

  const homeStartDef = Math.max(0.6, Number((homeTeam.defenseStrength - 0.20).toFixed(2)));
  const awayStartDef = Math.max(0.6, Number((awayTeam.defenseStrength - 0.15).toFixed(2)));

  for (let gw = 1; gw <= totalGWs; gw++) {
    const progress = (gw - 1) / (totalGWs - 1); // 0.0 to 1.0

    // Smooth spline progression + slight wave variation
    const homeEloWave = Math.sin(homeSeed * 0.5 + gw * 0.7) * 18;
    const awayEloWave = Math.cos(awaySeed * 0.5 + gw * 0.6) * 18;

    const currHomeElo =
      gw === totalGWs
        ? homeTeam.elo
        : Math.round(homeStartElo + (homeTeam.elo - homeStartElo) * progress + homeEloWave);

    const currAwayElo =
      gw === totalGWs
        ? awayTeam.elo
        : Math.round(awayStartElo + (awayTeam.elo - awayStartElo) * progress + awayEloWave);

    // Attack Strength (0.80 to 2.20)
    const homeAttWave = Math.sin(homeSeed + gw * 0.4) * 0.12;
    const awayAttWave = Math.cos(awaySeed + gw * 0.5) * 0.12;

    const currHomeAtt =
      gw === totalGWs
        ? homeTeam.attackStrength
        : Number(
            Math.max(
              0.6,
              homeStartAtt + (homeTeam.attackStrength - homeStartAtt) * progress + homeAttWave
            ).toFixed(2)
          );

    const currAwayAtt =
      gw === totalGWs
        ? awayTeam.attackStrength
        : Number(
            Math.max(
              0.6,
              awayStartAtt + (awayTeam.attackStrength - awayStartAtt) * progress + awayAttWave
            ).toFixed(2)
          );

    // Defense Strength (inverted: lower goals conceded = better, mapped to solidity index 2.0 - value)
    const homeDefWave = Math.cos(homeSeed + gw * 0.3) * 0.10;
    const awayDefWave = Math.sin(awaySeed + gw * 0.4) * 0.10;

    const rawHomeDef =
      gw === totalGWs
        ? homeTeam.defenseStrength
        : Number(
            Math.max(
              0.4,
              homeStartDef + (homeTeam.defenseStrength - homeStartDef) * progress + homeDefWave
            ).toFixed(2)
          );

    const rawAwayDef =
      gw === totalGWs
        ? awayTeam.defenseStrength
        : Number(
            Math.max(
              0.4,
              awayStartDef + (awayTeam.defenseStrength - awayStartDef) * progress + awayDefWave
            ).toFixed(2)
          );

    // Convert raw defense strength (goals multiplier) into a positive "Defensive Solidity Index" (0 to 100)
    const currHomeDef = Number(Math.max(20, Math.min(98, (1.8 - rawHomeDef) * 55)).toFixed(1));
    const currAwayDef = Number(Math.max(20, Math.min(98, (1.8 - rawAwayDef) * 55)).toFixed(1));

    data.push({
      gw,
      label: `GW${gw}`,
      homeElo: currHomeElo,
      awayElo: currAwayElo,
      homeAttack: currHomeAtt,
      awayAttack: currAwayAtt,
      homeDefense: currHomeDef,
      awayDefense: currAwayDef,
    });
  }

  return data;
}

export const EloEvolutionChart: React.FC<EloEvolutionChartProps> = ({
  homeTeam,
  awayTeam,
  className = '',
}) => {
  const [metricMode, setMetricMode] = useState<'elo' | 'attack' | 'defense'>('elo');

  const evolutionData = generateSeasonEvolution(homeTeam, awayTeam);

  // Compute key historical metrics
  const homeElos = evolutionData.map((d) => d.homeElo);
  const awayElos = evolutionData.map((d) => d.awayElo);

  const homeMinElo = Math.min(...homeElos);
  const homeMaxElo = Math.max(...homeElos);
  const homeEloDelta = homeTeam.elo - evolutionData[0].homeElo;

  const awayMinElo = Math.min(...awayElos);
  const awayMaxElo = Math.max(...awayElos);
  const awayEloDelta = awayTeam.elo - evolutionData[0].awayElo;

  return (
    <div
      id="elo-season-evolution-card"
      className={`bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-5 font-mono ${className}`}
    >
      {/* Header & Metric Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <LineChartIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
              Season Evolution & Trajectory Analytics
            </h3>
            <p className="text-[11px] text-slate-400 font-sans">
              Tracks match-by-match Elo rating momentum, Attack rating, and Defense solidity across GW1–GW20
            </p>
          </div>
        </div>

        {/* Mode Selector Buttons */}
        <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px]">
          <button
            id="btn-elo-metric-elo"
            onClick={() => setMetricMode('elo')}
            className={`px-3 py-1 rounded font-bold cursor-pointer transition-colors ${
              metricMode === 'elo'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Elo Rating
          </button>
          <button
            id="btn-elo-metric-attack"
            onClick={() => setMetricMode('attack')}
            className={`px-3 py-1 rounded font-bold cursor-pointer transition-colors ${
              metricMode === 'attack'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Attack Rating
          </button>
          <button
            id="btn-elo-metric-defense"
            onClick={() => setMetricMode('defense')}
            className={`px-3 py-1 rounded font-bold cursor-pointer transition-colors ${
              metricMode === 'defense'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Defensive Solidity
          </button>
        </div>
      </div>

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-500 uppercase font-bold block">
            {homeTeam.name} Current Elo
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-base font-bold text-emerald-400">{homeTeam.elo}</span>
            <span
              className={`text-[10px] font-bold ${
                homeEloDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {homeEloDelta >= 0 ? `+${homeEloDelta}` : homeEloDelta} GW1–20
            </span>
          </div>
          <span className="text-[10px] text-slate-400 block">
            Peak: <strong className="text-slate-200">{homeMaxElo}</strong> | Min: <strong className="text-slate-200">{homeMinElo}</strong>
          </span>
        </div>

        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-500 uppercase font-bold block">
            {awayTeam.name} Current Elo
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-base font-bold text-purple-400">{awayTeam.elo}</span>
            <span
              className={`text-[10px] font-bold ${
                awayEloDelta >= 0 ? 'text-purple-400' : 'text-rose-400'
              }`}
            >
              {awayEloDelta >= 0 ? `+${awayEloDelta}` : awayEloDelta} GW1–20
            </span>
          </div>
          <span className="text-[10px] text-slate-400 block">
            Peak: <strong className="text-slate-200">{awayMaxElo}</strong> | Min: <strong className="text-slate-200">{awayMinElo}</strong>
          </span>
        </div>

        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-500 uppercase font-bold block">
            Elo Differential Edge
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-base font-bold text-cyan-400">
              {Math.abs(homeTeam.elo - awayTeam.elo)} pts
            </span>
            <span className="text-[10px] text-slate-400">
              {homeTeam.elo >= awayTeam.elo ? `${homeTeam.name} +` : `${awayTeam.name} +`}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 block">Current ranking gap</span>
        </div>

        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-500 uppercase font-bold block">
            Season Trajectory Mode
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-base font-bold text-amber-400 uppercase">
              {metricMode === 'elo'
                ? 'Elo Momentum'
                : metricMode === 'attack'
                ? 'Attack Index'
                : 'Defense Solidity'}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 block">GW1 through GW20</span>
        </div>
      </div>

      {/* Main Recharts Line Chart */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-slate-300 uppercase">
            {metricMode === 'elo' && 'Elo Rating Progression Curve'}
            {metricMode === 'attack' && 'Attack Strength Multiplier Trajectory'}
            {metricMode === 'defense' && 'Defensive Solidity Rating Index (0–100)'}
          </span>
          <div className="flex items-center gap-4 text-xs">
            <span className="text-emerald-400 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              {homeTeam.name}
            </span>
            <span className="text-purple-400 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" />
              {awayTeam.name}
            </span>
          </div>
        </div>

        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={evolutionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                domain={
                  metricMode === 'elo'
                    ? ['auto', 'auto']
                    : metricMode === 'attack'
                    ? [0.5, 2.5]
                    : [0, 100]
                }
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#020617',
                  borderColor: '#334155',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                }}
              />
              <Line
                type="monotone"
                dataKey={
                  metricMode === 'elo'
                    ? 'homeElo'
                    : metricMode === 'attack'
                    ? 'homeAttack'
                    : 'homeDefense'
                }
                name={`${homeTeam.name} (${metricMode.toUpperCase()})`}
                stroke="#10b981"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#10b981' }}
                activeDot={{ r: 6, fill: '#34d399' }}
              />
              <Line
                type="monotone"
                dataKey={
                  metricMode === 'elo'
                    ? 'awayElo'
                    : metricMode === 'attack'
                    ? 'awayAttack'
                    : 'awayDefense'
                }
                name={`${awayTeam.name} (${metricMode.toUpperCase()})`}
                stroke="#c084fc"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#c084fc' }}
                activeDot={{ r: 6, fill: '#e879f9' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default EloEvolutionChart;
