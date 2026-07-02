import React from 'react';
import { PredictionResult } from '../types';
import { ConfidenceGauge } from './ConfidenceGauge';

interface ProbMatrixProps {
  predictionResult: PredictionResult;
}

export const ProbMatrix: React.FC<ProbMatrixProps> = ({ predictionResult }) => {
  const { scoreMatrix, homeTeamName, awayTeamName } = predictionResult;
  const maxProb = Math.max(...scoreMatrix.flat());

  return (
    <div className="space-y-6">
      {/* Visual Confidence Gauge Section */}
      <ConfidenceGauge
        predictionResult={predictionResult}
        title={`MODEL CONFIDENCE GAUGE (${homeTeamName} vs ${awayTeamName})`}
      />

      {/* Probability Matrix Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 mb-4">
          <div>
            <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-slate-200">
              Poisson Score Probability Matrix (6x6)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Dixon-Coles bivariate goal distribution table
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 self-start sm:self-auto">
            <span className="text-emerald-400 font-semibold">Rows: {homeTeamName}</span>
            <span className="text-slate-600">|</span>
            <span className="text-cyan-400 font-semibold">Cols: {awayTeamName}</span>
          </div>
        </div>

        {/* Mobile horizontal scroll indicator (< md) */}
        <div className="md:hidden flex items-center justify-between text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg mb-3 font-mono">
          <span className="flex items-center gap-1.5">
            <span className="font-bold text-amber-300">↔</span>
            <span>Scroll horizontally to view 6x6 score matrix</span>
          </span>
          <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-1.5 py-0.5 rounded border border-amber-500/30">
            6x6 TABLE
          </span>
        </div>

        {/* Horizontal Scrollable Container */}
        <div className="overflow-x-auto min-w-full pb-2 touch-pan-x scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
          <table className="w-full min-w-[520px] border-collapse text-center font-mono text-xs">
            <thead>
              <tr>
                <th className="p-2 border border-slate-800 bg-slate-950 text-slate-400 font-bold sticky left-0 z-10 shadow-r min-w-[90px]">
                  {homeTeamName.slice(0, 3).toUpperCase()} \ {awayTeamName.slice(0, 3).toUpperCase()}
                </th>
                {[0, 1, 2, 3, 4, 5].map((awayGoals) => (
                  <th
                    key={awayGoals}
                    className="p-2 border border-slate-800 bg-slate-950 text-cyan-400 font-bold min-w-[65px]"
                  >
                    {awayGoals}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[0, 1, 2, 3, 4, 5].map((homeGoals) => (
                <tr key={homeGoals}>
                  <td className="p-2 border border-slate-800 bg-slate-950 text-emerald-400 font-bold sticky left-0 z-10 min-w-[90px]">
                    {homeGoals}
                  </td>
                  {[0, 1, 2, 3, 4, 5].map((awayGoals) => {
                    const prob = scoreMatrix[homeGoals]?.[awayGoals] || 0;
                    const pct = (prob * 100).toFixed(1);
                    const intensity = maxProb > 0 ? prob / maxProb : 0;

                    // Color mapping
                    let bgStyle = 'bg-slate-900 text-slate-400';
                    if (intensity > 0.7) {
                      bgStyle = 'bg-emerald-500/30 text-emerald-300 font-bold border-emerald-500/50';
                    } else if (intensity > 0.4) {
                      bgStyle = 'bg-emerald-500/20 text-emerald-400 font-semibold';
                    } else if (intensity > 0.2) {
                      bgStyle = 'bg-slate-800 text-slate-200';
                    }

                    return (
                      <td
                        key={awayGoals}
                        className={`p-2 sm:p-2.5 border border-slate-800/80 transition-colors whitespace-nowrap min-w-[65px] ${bgStyle}`}
                        title={`${homeTeamName} ${homeGoals} - ${awayGoals} ${awayTeamName}: ${pct}%`}
                      >
                        {pct}%
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View Alternative: Stacked Top Scorelines (< md) */}
        <div className="mt-4 pt-4 border-t border-slate-800 md:hidden">
          <h4 className="text-xs font-bold font-mono text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <span className="text-amber-400">🔥</span>
            <span>Top Score Probability Breakdown (Stacked View)</span>
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-xs">
            {predictionResult.correctScores.slice(0, 6).map((cs, idx) => (
              <div
                key={idx}
                className="bg-slate-950 border border-slate-800 rounded-lg p-2 flex items-center justify-between"
              >
                <span className="font-bold text-slate-200">
                  {cs.homeGoals} - {cs.awayGoals}
                </span>
                <span className="text-[11px] font-extrabold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">
                  {(cs.probability * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

