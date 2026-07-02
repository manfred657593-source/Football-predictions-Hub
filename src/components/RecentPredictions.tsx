import React, { useState } from 'react';
import {
  History,
  ArrowRight,
  Sparkles,
  Trash2,
  ChevronRight,
  TrendingUp,
  Activity,
  Award,
  Scale,
  ArrowLeftRight,
  BarChart2,
} from 'lucide-react';
import { Team, PredictionResult } from '../types';
import { getHeadToHeadMatches } from './H2HSummary';

export interface RecentPredictionEntry {
  id: string;
  timestamp: string;
  homeTeam: Team;
  awayTeam: Team;
  prediction: PredictionResult;
}

export interface HistoricalFixtureBaseline {
  sampleSize: number;
  histHomeWinProb: number;
  histDrawProb: number;
  histAwayWinProb: number;
  histHomeAvgGoals: number;
  histAwayAvgGoals: number;
  histTopScore: string;
}

/**
 * Computes historical fixture matchup baseline performance stats for a team pair
 */
export function computeHistoricalMatchupBaseline(
  homeTeam: Team,
  awayTeam: Team
): HistoricalFixtureBaseline {
  const hName = homeTeam.name;
  const aName = awayTeam.name;

  const h2hList = getHeadToHeadMatches(hName, aName);

  let totalHomeGoals = 0;
  let totalAwayGoals = 0;
  let homeWins = 0;
  let draws = 0;
  let awayWins = 0;

  h2hList.forEach((m) => {
    const isHomeInMatch = m.homeTeam.toLowerCase() === hName.toLowerCase();
    const hG = isHomeInMatch ? m.homeGoals : m.awayGoals;
    const aG = isHomeInMatch ? m.awayGoals : m.homeGoals;

    totalHomeGoals += hG;
    totalAwayGoals += aG;

    if (hG > aG) homeWins++;
    else if (hG === aG) draws++;
    else awayWins++;
  });

  const eloDiff = homeTeam.elo - awayTeam.elo;
  const baseHomeWin = Math.max(0.2, Math.min(0.75, 0.45 + eloDiff / 750));
  const baseDraw = 0.26;
  const baseAwayWin = Math.max(0.1, 1 - baseHomeWin - baseDraw);

  const len = Math.max(1, h2hList.length);
  const rawHomeWinProb = (homeWins / len) * 0.45 + baseHomeWin * 0.55;
  const rawDrawProb = (draws / len) * 0.35 + baseDraw * 0.65;
  const rawAwayWinProb = (awayWins / len) * 0.45 + baseAwayWin * 0.55;

  const sumP = rawHomeWinProb + rawDrawProb + rawAwayWinProb;
  const histHomeWinProb = rawHomeWinProb / sumP;
  const histDrawProb = rawDrawProb / sumP;
  const histAwayWinProb = rawAwayWinProb / sumP;

  const avgH2HHomeGoals = totalHomeGoals / len;
  const avgH2HAwayGoals = totalAwayGoals / len;

  const histHomeAvgGoals = Number(
    (avgH2HHomeGoals * 0.5 + homeTeam.attackStrength * 1.15 * 0.5).toFixed(2)
  );
  const histAwayAvgGoals = Number(
    (avgH2HAwayGoals * 0.5 + awayTeam.attackStrength * 0.95 * 0.5).toFixed(2)
  );

  const estH = Math.round(histHomeAvgGoals);
  const estA = Math.round(histAwayAvgGoals);
  const histTopScore = `${estH}-${estA}`;

  return {
    sampleSize: h2hList.length + 5,
    histHomeWinProb,
    histDrawProb,
    histAwayWinProb,
    histHomeAvgGoals,
    histAwayAvgGoals,
    histTopScore,
  };
}

interface RecentPredictionsProps {
  history: RecentPredictionEntry[];
  onSelectMatch: (homeTeam: Team, awayTeam: Team) => void;
  onClearHistory: () => void;
  currentMatchId?: string;
  className?: string;
}

export const RecentPredictions: React.FC<RecentPredictionsProps> = ({
  history,
  onSelectMatch,
  onClearHistory,
  currentMatchId = '',
  className = '',
}) => {
  const [viewMode, setViewMode] = useState<'dixon-coles' | 'historical' | 'comparison'>('dixon-coles');

  if (!history || history.length === 0) {
    return (
      <div
        id="recent-predictions-panel"
        className={`bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4 font-mono ${className}`}
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                Recent Predictions Tracking
              </h3>
              <p className="text-[11px] text-slate-400 font-sans">
                Tracks your last 5 analyzed match predictions for quick side-by-side comparisons
              </p>
            </div>
          </div>
        </div>

        <div className="bg-slate-950/60 p-6 rounded-lg border border-slate-800/80 text-center space-y-2">
          <Activity className="w-6 h-6 text-slate-600 mx-auto" />
          <p className="text-xs text-slate-400 font-sans">
            No recent match predictions tracked yet. Select different fixtures or adjust team parameters to build your comparison history.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      id="recent-predictions-panel"
      className={`bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4 font-mono ${className}`}
    >
      {/* Panel Header & Model Comparison Toggle */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
              Recent Predictions Panel
              <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[9px] px-1.5 py-0.5 rounded font-bold">
                {history.length} / 5 TRACKED
              </span>
            </h3>
            <p className="text-[11px] text-slate-400 font-sans">
              Compare Dixon-Coles Poisson model outputs against historical fixture averages & deltas
            </p>
          </div>
        </div>

        {/* View Mode Toggle Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-slate-950 border border-slate-800 rounded-lg p-1 font-mono text-[11px]">
            <button
              id="btn-recent-mode-dixon"
              onClick={() => setViewMode('dixon-coles')}
              className={`px-2.5 py-1 rounded font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'dixon-coles'
                  ? 'bg-indigo-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="View pure Dixon-Coles Poisson mathematical model output"
            >
              <Sparkles className="w-3 h-3" />
              <span>Dixon-Coles</span>
            </button>

            <button
              id="btn-recent-mode-historical"
              onClick={() => setViewMode('historical')}
              className={`px-2.5 py-1 rounded font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'historical'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="View multi-year historical H2H fixture average performance"
            >
              <History className="w-3 h-3" />
              <span>Historical H2H</span>
            </button>

            <button
              id="btn-recent-mode-comparison"
              onClick={() => setViewMode('comparison')}
              className={`px-2.5 py-1 rounded font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'comparison'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Side-by-side delta comparison of Dixon-Coles vs Historical Baseline"
            >
              <Scale className="w-3 h-3" />
              <span>Delta Compare</span>
            </button>
          </div>

          {/* Clear History Action */}
          <button
            id="btn-clear-recent-predictions"
            onClick={onClearHistory}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-950 hover:bg-rose-950/40 hover:text-rose-400 hover:border-rose-500/30 text-slate-400 text-xs font-bold transition-colors cursor-pointer"
            title="Clear recent prediction history log"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Grid of Last 5 Analyzed Matches */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {history.slice(0, 5).map((entry, idx) => {
          const isCurrent = entry.id === currentMatchId;

          // 1. Dixon-Coles Model Metrics
          const hProb = Math.round(entry.prediction.homeWinProb * 100);
          const dProb = Math.round(entry.prediction.drawProb * 100);
          const aProb = Math.round(
            (1 - entry.prediction.homeWinProb - entry.prediction.drawProb) * 100
          );

          const topScore = entry.prediction.correctScores?.[0];
          const topScoreText = topScore
            ? `${topScore.homeGoals}-${topScore.awayGoals}`
            : '1-0';

          // 2. Historical Fixture Baseline Metrics
          const hist = computeHistoricalMatchupBaseline(entry.homeTeam, entry.awayTeam);
          const histHProb = Math.round(hist.histHomeWinProb * 100);
          const histDProb = Math.round(hist.histDrawProb * 100);
          const histAProb = Math.round(hist.histAwayWinProb * 100);

          // 3. Delta Variance Metrics
          const deltaHomeWin = hProb - histHProb;
          const deltaDraw = dProb - histDProb;
          const deltaAwayWin = aProb - histAProb;
          const dcXgHome = entry.prediction.homeExpectedGoals;
          const dcXgAway = entry.prediction.awayExpectedGoals;
          const xgDeltaHome = (dcXgHome - hist.histHomeAvgGoals).toFixed(2);

          return (
            <div
              key={entry.id || idx}
              id={`recent-prediction-card-${idx}`}
              onClick={() => onSelectMatch(entry.homeTeam, entry.awayTeam)}
              className={`p-3 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-3 group ${
                isCurrent
                  ? 'bg-indigo-950/40 border-indigo-500/50 ring-1 ring-indigo-500/30 shadow-indigo-950/50'
                  : 'bg-slate-950 border-slate-800 hover:border-indigo-500/40 hover:bg-slate-900/80'
              }`}
            >
              {/* Header: Timestamp + Badge Mode */}
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-slate-500 font-bold uppercase">{entry.timestamp}</span>
                {isCurrent ? (
                  <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[9px] px-1.5 py-0.2 rounded font-extrabold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping inline-block" />
                    Active
                  </span>
                ) : (
                  <span className="text-slate-500 group-hover:text-indigo-400 transition-colors flex items-center gap-0.5">
                    Compare <ChevronRight className="w-3 h-3" />
                  </span>
                )}
              </div>

              {/* Match Teams Header */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-extrabold text-slate-100">
                  <span className="truncate max-w-[100px]" title={entry.homeTeam.name}>
                    {entry.homeTeam.name}
                  </span>
                  <span className="text-[10px] text-slate-500 font-normal">vs</span>
                  <span className="truncate max-w-[100px] text-right" title={entry.awayTeam.name}>
                    {entry.awayTeam.name}
                  </span>
                </div>

                {/* Elo Gap Badge */}
                <div className="flex justify-between items-center text-[10px] text-slate-400">
                  <span>Elo: {entry.homeTeam.elo}</span>
                  <span className="text-[9px] text-slate-500">
                    Δ {Math.abs(entry.homeTeam.elo - entry.awayTeam.elo)} pts
                  </span>
                  <span>Elo: {entry.awayTeam.elo}</span>
                </div>
              </div>

              {/* CARD BODY BASED ON TOGGLE MODE */}

              {/* 1. DIXON-COLES MODE */}
              {viewMode === 'dixon-coles' && (
                <>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[9px] text-indigo-300 font-bold uppercase tracking-tight">
                      <span>Dixon-Coles Model</span>
                      <span className="text-slate-500">1x2 Probs</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-900 rounded overflow-hidden flex border border-slate-800">
                      <div
                        style={{ width: `${hProb}%` }}
                        className="h-full bg-emerald-500"
                        title={`Home Win: ${hProb}%`}
                      />
                      <div
                        style={{ width: `${dProb}%` }}
                        className="h-full bg-amber-500"
                        title={`Draw: ${dProb}%`}
                      />
                      <div
                        style={{ width: `${aProb}%` }}
                        className="h-full bg-cyan-500"
                        title={`Away Win: ${aProb}%`}
                      />
                    </div>

                    <div className="flex justify-between text-[10px] font-bold">
                      <span className="text-emerald-400">{hProb}%</span>
                      <span className="text-amber-400">{dProb}%</span>
                      <span className="text-cyan-400">{aProb}%</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                    <div className="text-slate-400">
                      xG:{' '}
                      <strong className="text-slate-200">
                        {dcXgHome.toFixed(2)}–{dcXgAway.toFixed(2)}
                      </strong>
                    </div>
                    <div className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 text-indigo-300 font-bold">
                      Top: {topScoreText}
                    </div>
                  </div>
                </>
              )}

              {/* 2. HISTORICAL H2H BASELINE MODE */}
              {viewMode === 'historical' && (
                <>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[9px] text-cyan-300 font-bold uppercase tracking-tight">
                      <span>Historical Fixture Baseline</span>
                      <span className="text-slate-500">H2H Avg</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-900 rounded overflow-hidden flex border border-slate-800">
                      <div
                        style={{ width: `${histHProb}%` }}
                        className="h-full bg-emerald-500/80"
                        title={`Historical Home Win: ${histHProb}%`}
                      />
                      <div
                        style={{ width: `${histDProb}%` }}
                        className="h-full bg-amber-500/80"
                        title={`Historical Draw: ${histDProb}%`}
                      />
                      <div
                        style={{ width: `${histAProb}%` }}
                        className="h-full bg-cyan-500/80"
                        title={`Historical Away Win: ${histAProb}%`}
                      />
                    </div>

                    <div className="flex justify-between text-[10px] font-bold">
                      <span className="text-emerald-400">{histHProb}%</span>
                      <span className="text-amber-400">{histDProb}%</span>
                      <span className="text-cyan-400">{histAProb}%</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                    <div className="text-slate-400">
                      Hist Goals:{' '}
                      <strong className="text-cyan-300">
                        {hist.histHomeAvgGoals.toFixed(2)}–{hist.histAwayAvgGoals.toFixed(2)}
                      </strong>
                    </div>
                    <div className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 text-cyan-300 font-bold">
                      Hist: {hist.histTopScore}
                    </div>
                  </div>
                </>
              )}

              {/* 3. DELTA COMPARISON MODE */}
              {viewMode === 'comparison' && (
                <>
                  <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1.5 text-[10px]">
                    <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 border-b border-slate-800 pb-1">
                      <span>Home Win % Delta</span>
                      <span
                        className={`font-mono font-bold px-1.5 py-0.2 rounded ${
                          deltaHomeWin >= 0
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {deltaHomeWin >= 0 ? `+${deltaHomeWin}% DC Edge` : `${deltaHomeWin}% DC Lower`}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1 text-[9.5px]">
                      <div className="bg-slate-950 p-1 rounded border border-slate-800/80">
                        <span className="text-slate-500 block text-[8px] uppercase">Dixon-Coles</span>
                        <div className="text-indigo-300 font-bold">
                          {hProb}% | xG {dcXgHome.toFixed(1)}
                        </div>
                        <div className="text-[9px] text-slate-400">Score: {topScoreText}</div>
                      </div>

                      <div className="bg-slate-950 p-1 rounded border border-slate-800/80">
                        <span className="text-slate-500 block text-[8px] uppercase">Historical</span>
                        <div className="text-cyan-300 font-bold">
                          {histHProb}% | xG {hist.histHomeAvgGoals.toFixed(1)}
                        </div>
                        <div className="text-[9px] text-slate-400">Score: {hist.histTopScore}</div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-1 flex items-center justify-between text-[9px] text-slate-400">
                    <span>xG Model Δ:</span>
                    <span className="font-bold text-emerald-400 font-mono">
                      {Number(xgDeltaHome) >= 0 ? `+${xgDeltaHome}` : xgDeltaHome} vs H2H
                    </span>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RecentPredictions;
