import React from 'react';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  Tooltip,
} from 'recharts';
import { Shield, Zap, Activity, Award, BarChart3 } from 'lucide-react';
import { Team } from '../types';

interface TeamRadarChartProps {
  homeTeam: Team;
  awayTeam: Team;
  className?: string;
}

export const TeamRadarChart: React.FC<TeamRadarChartProps> = ({
  homeTeam,
  awayTeam,
  className = '',
}) => {
  // Helper to compute 5 normalized dimension metrics (0 to 100)
  const computeTeamDimensions = (team: Team, isHome: boolean) => {
    // 1. Attack Score (based on attack strength, home/away attack, xG per game)
    const attackVal = isHome ? team.homeAttack : team.awayAttack;
    const attackScore = Math.min(
      100,
      Math.max(20, Math.round(((attackVal + team.xGPerGame / 2) / 2.2) * 100))
    );

    // 2. Defense Score (inverted defense strength so lower goals conceded = higher score)
    const defVal = isHome ? team.homeDefense : team.awayDefense;
    const defenseScore = Math.min(
      100,
      Math.max(20, Math.round(((1.6 - defVal) / 1.1) * 100))
    );

    // 3. Elo Rating Score (Elo 1400 mapped to 30, Elo 2050 mapped to 100)
    const eloScore = Math.min(
      100,
      Math.max(20, Math.round(((team.elo - 1400) / 650) * 100))
    );

    // 4. Recent Form Score (Points from last 5 matches: W=3, D=1, L=0 out of max 15)
    const formPoints = (team.recentForm || []).reduce(
      (acc, res) => acc + (res === 'W' ? 3 : res === 'D' ? 1 : 0),
      0
    );
    const formScore = Math.min(
      100,
      Math.max(15, Math.round((formPoints / 15) * 100))
    );

    // 5. Possession & Territory Index (Estimated domain dominance)
    const possessionScore = Math.min(
      100,
      Math.max(
        30,
        Math.round(50 + (team.elo - 1850) / 20 + (team.attackStrength - 1.0) * 35)
      )
    );

    return {
      attack: attackScore,
      defense: defenseScore,
      elo: eloScore,
      form: formScore,
      possession: possessionScore,
    };
  };

  const homeMetrics = computeTeamDimensions(homeTeam, true);
  const awayMetrics = computeTeamDimensions(awayTeam, false);

  const radarData = [
    {
      dimension: 'Attack',
      [homeTeam.name]: homeMetrics.attack,
      [awayTeam.name]: awayMetrics.attack,
      fullMark: 100,
    },
    {
      dimension: 'Defense',
      [homeTeam.name]: homeMetrics.defense,
      [awayTeam.name]: awayMetrics.defense,
      fullMark: 100,
    },
    {
      dimension: 'Elo Rating',
      [homeTeam.name]: homeMetrics.elo,
      [awayTeam.name]: awayMetrics.elo,
      fullMark: 100,
    },
    {
      dimension: 'Recent Form',
      [homeTeam.name]: homeMetrics.form,
      [awayTeam.name]: awayMetrics.form,
      fullMark: 100,
    },
    {
      dimension: 'Possession Index',
      [homeTeam.name]: homeMetrics.possession,
      [awayTeam.name]: awayMetrics.possession,
      fullMark: 100,
    },
  ];

  return (
    <div
      id="team-radar-comparison-card"
      className={`bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4 font-mono ${className}`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
              5-Dimension Tactical Radar Comparison
            </h3>
            <p className="text-[11px] text-slate-400 font-sans">
              Normalizes Attack, Defense, Elo, Recent Form & Possession on a 0–100 scale
            </p>
          </div>
        </div>

        {/* Legend / Team Labels */}
        <div className="flex items-center gap-4 text-xs font-bold">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
            {homeTeam.name} (Home)
          </span>
          <span className="flex items-center gap-1.5 text-purple-400">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" />
            {awayTeam.name} (Away)
          </span>
        </div>
      </div>

      {/* Main Grid: Radar Chart + Metric Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Recharts Radar Chart (7 Cols) */}
        <div className="lg:col-span-7 h-72 w-full flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
              <PolarGrid stroke="#334155" />
              <PolarAngleAxis
                dataKey="dimension"
                stroke="#cbd5e1"
                fontSize={11}
                fontWeight="bold"
              />
              <PolarRadiusAxis
                angle={30}
                domain={[0, 100]}
                stroke="#475569"
                fontSize={9}
              />
              <Radar
                name={homeTeam.name}
                dataKey={homeTeam.name}
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.35}
                strokeWidth={2}
              />
              <Radar
                name={awayTeam.name}
                dataKey={awayTeam.name}
                stroke="#c084fc"
                fill="#c084fc"
                fillOpacity={0.35}
                strokeWidth={2}
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
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Breakdown Table (5 Cols) */}
        <div className="lg:col-span-5 space-y-2 text-xs">
          <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider mb-2">
            DIMENSION RATINGS BREAKDOWN (0–100)
          </span>

          {[
            { label: 'Attack Power', home: homeMetrics.attack, away: awayMetrics.attack },
            { label: 'Defensive Solidity', home: homeMetrics.defense, away: awayMetrics.defense },
            { label: 'Elo Rating Index', home: homeMetrics.elo, away: awayMetrics.elo },
            { label: 'Recent Form Index', home: homeMetrics.form, away: awayMetrics.form },
            { label: 'Possession Control', home: homeMetrics.possession, away: awayMetrics.possession },
          ].map((item, idx) => {
            const hBetter = item.home >= item.away;
            return (
              <div
                key={idx}
                className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 flex items-center justify-between"
              >
                <span className="text-slate-300 font-bold text-[11px]">{item.label}</span>
                <div className="flex items-center gap-3 font-bold">
                  <span className={hBetter ? 'text-emerald-400 font-extrabold' : 'text-slate-400'}>
                    {item.home}
                  </span>
                  <span className="text-slate-600">vs</span>
                  <span className={!hBetter ? 'text-purple-400 font-extrabold' : 'text-slate-400'}>
                    {item.away}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TeamRadarChart;
