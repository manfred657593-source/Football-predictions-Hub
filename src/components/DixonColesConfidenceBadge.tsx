import React from 'react';
import { ShieldCheck, AlertTriangle, ShieldAlert, Activity, BarChart2 } from 'lucide-react';

export interface DixonColesConfidenceBadgeProps {
  confidenceLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  confidenceRating?: number;
  goalDiffStdDev?: number;
  totalGoalsStdDev?: number;
  outcomeStdDev?: number;
  showStdDevDetails?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const DixonColesConfidenceBadge: React.FC<DixonColesConfidenceBadgeProps> = ({
  confidenceLevel = 'MEDIUM',
  confidenceRating,
  goalDiffStdDev,
  totalGoalsStdDev,
  outcomeStdDev,
  showStdDevDetails = true,
  size = 'md',
  className = '',
}) => {
  // Configs based on confidenceLevel
  const levelConfig = {
    HIGH: {
      label: 'HIGH CONFIDENCE',
      shortLabel: 'HIGH',
      bgColor: 'bg-emerald-950/80',
      textColor: 'text-emerald-400',
      borderColor: 'border-emerald-500/40',
      badgeBg: 'bg-emerald-500/20',
      glowColor: 'shadow-emerald-950/50',
      icon: ShieldCheck,
      description: 'Clear Model Separation (Low Variance)',
    },
    MEDIUM: {
      label: 'MEDIUM CONFIDENCE',
      shortLabel: 'MEDIUM',
      bgColor: 'bg-amber-950/80',
      textColor: 'text-amber-400',
      borderColor: 'border-amber-500/40',
      badgeBg: 'bg-amber-500/20',
      glowColor: 'shadow-amber-950/50',
      icon: Activity,
      description: 'Moderate Outcome Dispersion',
    },
    LOW: {
      label: 'LOW CONFIDENCE',
      shortLabel: 'LOW',
      bgColor: 'bg-rose-950/80',
      textColor: 'text-rose-400',
      borderColor: 'border-rose-500/40',
      badgeBg: 'bg-rose-500/20',
      glowColor: 'shadow-rose-950/50',
      icon: ShieldAlert,
      description: 'High Dispersion / Toss-up Match',
    },
  };

  const config = levelConfig[confidenceLevel] || levelConfig.MEDIUM;
  const Icon = config.icon;

  if (size === 'sm') {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border font-mono text-[10px] font-bold ${config.bgColor} ${config.textColor} ${config.borderColor} ${className}`}
        title={`Dixon-Coles Model Output Std Dev: Goal Diff σ = ${goalDiffStdDev ?? 'N/A'}, 1X2 Outcome σ = ${outcomeStdDev ?? 'N/A'}`}
      >
        <Icon className="w-3 h-3 shrink-0" />
        <span className="font-black uppercase">{config.shortLabel}</span>
        {confidenceRating !== undefined && (
          <span className="opacity-80">({confidenceRating}%)</span>
        )}
      </div>
    );
  }

  return (
    <div
      className={`p-2.5 rounded-xl border font-mono text-xs shadow-md ${config.bgColor} ${config.borderColor} ${config.glowColor} ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${config.badgeBg} ${config.textColor}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className={`font-black uppercase text-xs ${config.textColor}`}>
                {config.label}
              </span>
              {confidenceRating !== undefined && (
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-extrabold ${config.badgeBg} ${config.textColor}`}>
                  {confidenceRating}% SURETY
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-400 font-sans block">
              {config.description}
            </span>
          </div>
        </div>

        {/* Standard Deviation Breakdown Pills */}
        {showStdDevDetails && (
          <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
            {goalDiffStdDev !== undefined && (
              <span className="px-2 py-0.5 bg-slate-900 border border-slate-800 rounded text-slate-300 font-bold" title="Standard Deviation of Goal Difference (x - y)">
                <span className="text-slate-500 mr-1">σ(ΔG):</span>
                <span className="text-cyan-400 font-mono">{goalDiffStdDev}</span>
              </span>
            )}

            {outcomeStdDev !== undefined && (
              <span className="px-2 py-0.5 bg-slate-900 border border-slate-800 rounded text-slate-300 font-bold" title="Standard Deviation across 1X2 outcome probabilities">
                <span className="text-slate-500 mr-1">σ(1X2):</span>
                <span className="text-indigo-400 font-mono">{outcomeStdDev}</span>
              </span>
            )}

            {totalGoalsStdDev !== undefined && (
              <span className="px-2 py-0.5 bg-slate-900 border border-slate-800 rounded text-slate-300 font-bold" title="Standard Deviation of Total Goals (x + y)">
                <span className="text-slate-500 mr-1">σ(Total):</span>
                <span className="text-emerald-400 font-mono">{totalGoalsStdDev}</span>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DixonColesConfidenceBadge;
