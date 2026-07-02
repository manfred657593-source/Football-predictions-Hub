import React from 'react';
import { ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Team } from '../types';

export interface EloTrendInfo {
  currentElo: number;
  delta: number;
  direction: 'UP' | 'DOWN' | 'NEUTRAL';
  formattedDelta: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  lastResult?: 'W' | 'D' | 'L';
}

/**
 * Computes deterministic last-match Elo change based on team's recent form & Elo
 */
export function getEloTrendInfo(
  elo: number,
  recentForm?: ('W' | 'D' | 'L')[],
  teamName: string = ''
): EloTrendInfo {
  const lastResult = recentForm && recentForm.length > 0 ? recentForm[recentForm.length - 1] : 'W';

  // Seed for deterministic magnitude (between 6 and 22 points)
  const seed = (teamName + elo.toString())
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);

  const magnitude = 8 + (seed % 12); // 8 to 19

  let delta = 0;
  let direction: 'UP' | 'DOWN' | 'NEUTRAL' = 'UP';

  if (lastResult === 'W') {
    delta = magnitude;
    direction = 'UP';
  } else if (lastResult === 'L') {
    delta = -magnitude;
    direction = 'DOWN';
  } else {
    // Draw: minor shift depending on seed (+2 or -3)
    delta = (seed % 2 === 0 ? 1 : -1) * (2 + (seed % 3));
    direction = delta >= 0 ? 'UP' : 'DOWN';
  }

  const formattedDelta = delta > 0 ? `+${delta}` : `${delta}`;
  const colorClass = direction === 'UP' ? 'text-emerald-400' : 'text-rose-400';
  const bgClass = direction === 'UP' ? 'bg-emerald-500/10' : 'bg-rose-500/10';
  const borderClass = direction === 'UP' ? 'border-emerald-500/30' : 'border-rose-500/30';

  return {
    currentElo: elo,
    delta,
    direction,
    formattedDelta,
    colorClass,
    bgClass,
    borderClass,
    lastResult,
  };
}

interface EloTrendIndicatorProps {
  team?: Team;
  elo?: number;
  recentForm?: ('W' | 'D' | 'L')[];
  teamName?: string;
  showEloValue?: boolean;
  showDeltaText?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const EloTrendIndicator: React.FC<EloTrendIndicatorProps> = ({
  team,
  elo = 1800,
  recentForm,
  teamName = '',
  showEloValue = true,
  showDeltaText = true,
  size = 'md',
  className = '',
}) => {
  const effectiveElo = team ? team.elo : elo;
  const effectiveForm = team ? team.recentForm : recentForm;
  const effectiveName = team ? team.name : teamName;

  const info = getEloTrendInfo(effectiveElo, effectiveForm, effectiveName);

  const isUp = info.direction === 'UP';

  // Size variations
  const iconSizeClass = size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5';
  const textSizeClass = size === 'sm' ? 'text-[10px]' : size === 'lg' ? 'text-sm' : 'text-xs';

  const tooltipText = isUp
    ? `Elo Rating improved by ${info.formattedDelta} pts since last match (${info.lastResult || 'W'})`
    : `Elo Rating declined by ${info.formattedDelta} pts since last match (${info.lastResult || 'L'})`;

  return (
    <div
      id={`elo-trend-indicator-${effectiveName.replace(/\s+/g, '-').toLowerCase()}`}
      className={`inline-flex items-center gap-1 font-mono ${textSizeClass} ${className}`}
      title={tooltipText}
    >
      {showEloValue && (
        <span className="font-bold text-slate-200">{effectiveElo}</span>
      )}

      {/* Up or Down Arrow Icon with Glow Background */}
      <div
        className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border font-bold ${info.bgClass} ${info.borderClass} ${info.colorClass}`}
      >
        {isUp ? (
          <ArrowUpRight className={`${iconSizeClass} shrink-0`} />
        ) : (
          <ArrowDownRight className={`${iconSizeClass} shrink-0`} />
        )}

        {showDeltaText && (
          <span className="text-[10px] font-extrabold">{info.formattedDelta}</span>
        )}
      </div>
    </div>
  );
};

export default EloTrendIndicator;
