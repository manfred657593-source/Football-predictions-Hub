import React, { useState } from 'react';
import {
  Sparkles,
  TrendingUp,
  Percent,
  Calculator,
  Info,
  DollarSign,
  Sliders,
  ChevronDown,
  ChevronUp,
  Award,
  Zap,
} from 'lucide-react';
import { CorrectScore } from '../types';

interface CorrectScoreDistributionProps {
  correctScores: CorrectScore[];
  homeTeamName?: string;
  awayTeamName?: string;
  className?: string;
}

/**
 * Calculates Kelly Criterion multiplier and EV for a correct score prediction.
 * Formula: f* = (b * p - q) / b = (P_model * Odds_market - 1) / (Odds_market - 1)
 */
export function calculateScoreKelly(
  pModel: number,
  oMarket: number
): { evPercent: number; kellyFraction: number; quarterKellyPercent: number; isValueBet: boolean } {
  if (oMarket <= 1 || pModel <= 0) {
    return { evPercent: 0, kellyFraction: 0, quarterKellyPercent: 0, isValueBet: false };
  }

  const evPercent = (pModel * oMarket - 1) * 100;
  const b = oMarket - 1;
  const kellyFraction = (b * pModel - (1 - pModel)) / b;
  const quarterKellyPercent = Math.max(0, (kellyFraction / 4) * 100);

  // Value Bet threshold: Positive EV (> +2%) and positive Kelly multiplier (> 0.5%)
  const isValueBet = evPercent >= 2.0 && kellyFraction >= 0.005;

  return {
    evPercent,
    kellyFraction: Math.max(0, kellyFraction),
    quarterKellyPercent,
    isValueBet,
  };
}

export const CorrectScoreDistribution: React.FC<CorrectScoreDistributionProps> = ({
  correctScores,
  homeTeamName = 'Home',
  awayTeamName = 'Away',
  className = '',
}) => {
  // Market Margin setting for benchmark market odds estimation (e.g. 10% vig)
  const [marketVig, setMarketVig] = useState<number>(10);
  const [expandedScoreIndex, setExpandedScoreIndex] = useState<number | null>(null);
  
  // Custom user-overridden market odds for specific score items
  const [customOddsMap, setCustomOddsMap] = useState<Record<string, number>>({});

  const topScores = correctScores.slice(0, 8);

  const toggleExpand = (idx: number) => {
    setExpandedScoreIndex(expandedScoreIndex === idx ? null : idx);
  };

  const handleCustomOddsChange = (scoreKey: string, newOddsStr: string) => {
    const val = parseFloat(newOddsStr);
    if (!isNaN(val) && val > 1) {
      setCustomOddsMap((prev) => ({ ...prev, [scoreKey]: val }));
    } else if (newOddsStr === '') {
      const copy = { ...customOddsMap };
      delete copy[scoreKey];
      setCustomOddsMap(copy);
    }
  };

  return (
    <div
      id="correct-score-distribution-panel"
      className={`bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg font-mono space-y-4 ${className}`}
    >
      {/* Header & Market Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-100 flex items-center gap-2">
            <Award className="w-4 h-4 text-emerald-400" />
            Correct Score Distribution & Value Bets
          </h3>
          <p className="text-[11px] text-slate-400 font-sans mt-0.5">
            Kelly Criterion (+EV) analysis identifying mispriced scorelines vs market implied odds
          </p>
        </div>

        {/* Market Vig Selector */}
        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-lg border border-slate-800 text-[11px]">
          <span className="text-slate-400 font-sans">Market Vig:</span>
          {[5, 10, 15].map((vig) => (
            <button
              key={vig}
              onClick={() => setMarketVig(vig)}
              className={`px-2 py-0.5 rounded font-bold cursor-pointer transition-colors ${
                marketVig === vig
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {vig}%
            </button>
          ))}
        </div>
      </div>

      {/* Score List */}
      <div className="space-y-2">
        {topScores.map((cs, idx) => {
          const scoreKey = `${cs.homeGoals}-${cs.awayGoals}`;
          const pModel = cs.probability;
          const oFair = 1 / pModel;

          // Benchmark Market Odds estimation:
          // In real markets, bookies add overround, but certain scores have market variance.
          // We apply a slight realistic skew based on score index to simulate real market lines.
          const marketSkew = idx % 2 === 1 ? 1.12 : 0.94;
          const defaultMarketOdds = Number((oFair * (1 - marketVig / 100) * marketSkew).toFixed(2));
          const oMarket = customOddsMap[scoreKey] ?? Math.max(1.05, defaultMarketOdds);

          const { evPercent, kellyFraction, quarterKellyPercent, isValueBet } = calculateScoreKelly(
            pModel,
            oMarket
          );

          const isExpanded = expandedScoreIndex === idx;

          return (
            <div
              key={scoreKey}
              id={`score-card-${scoreKey}`}
              className={`rounded-lg border transition-all duration-200 ${
                isValueBet
                  ? 'bg-slate-950/90 border-amber-500/50 shadow-md shadow-amber-950/20 ring-1 ring-amber-500/20'
                  : 'bg-slate-950/60 border-slate-800/90 hover:border-slate-700'
              }`}
            >
              {/* Row Main Header */}
              <div
                onClick={() => toggleExpand(idx)}
                className="p-2.5 flex items-center justify-between cursor-pointer select-none"
              >
                {/* Score & Rank */}
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-slate-500 w-5">#{idx + 1}</span>
                  <span className="font-extrabold text-slate-100 text-sm w-12">
                    {cs.homeGoals} - {cs.awayGoals}
                  </span>

                  {/* Value Bet Pill Badge */}
                  {isValueBet && (
                    <span className="inline-flex items-center gap-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider animate-pulse">
                      <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
                      VALUE BET
                    </span>
                  )}
                </div>

                {/* Metrics */}
                <div className="flex items-center gap-3 text-xs">
                  {/* Model Probability */}
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 uppercase block font-sans">Prob</span>
                    <span className="text-emerald-400 font-extrabold">
                      {(pModel * 100).toFixed(1)}%
                    </span>
                  </div>

                  {/* Market Odds */}
                  <div className="text-right hidden sm:block">
                    <span className="text-[10px] text-slate-500 uppercase block font-sans">Mkt Odds</span>
                    <span className="text-slate-200 font-extrabold">@{oMarket.toFixed(2)}</span>
                  </div>

                  {/* Kelly Stake Multiplier */}
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 uppercase block font-sans">Kelly Rec</span>
                    <span
                      className={`font-extrabold ${
                        isValueBet ? 'text-amber-400' : evPercent > 0 ? 'text-emerald-400' : 'text-slate-500'
                      }`}
                    >
                      {quarterKellyPercent > 0 ? `${quarterKellyPercent.toFixed(1)}%` : '0%'}
                    </span>
                  </div>

                  {/* EV Return % */}
                  <div className="text-right hidden md:block">
                    <span className="text-[10px] text-slate-500 uppercase block font-sans">Expected EV</span>
                    <span
                      className={`font-extrabold ${
                        evPercent > 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {evPercent > 0 ? `+${evPercent.toFixed(1)}%` : `${evPercent.toFixed(1)}%`}
                    </span>
                  </div>

                  {/* Toggle Chevron */}
                  <button className="text-slate-500 hover:text-slate-300 ml-1">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Expanded Kelly Math & Custom Odds Input Drawer */}
              {isExpanded && (
                <div className="p-3 bg-slate-900/90 border-t border-slate-800 space-y-3 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Model Fair Odds */}
                    <div className="bg-slate-950 p-2 rounded border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase block">Model Fair Odds</span>
                      <span className="text-sm font-bold text-emerald-400">@{oFair.toFixed(2)}</span>
                      <span className="text-[10px] text-slate-400 block font-sans mt-0.5">
                        Implied Prob: {(pModel * 100).toFixed(2)}%
                      </span>
                    </div>

                    {/* Custom Market Odds Input */}
                    <div className="bg-slate-950 p-2 rounded border border-slate-800 space-y-1">
                      <span className="text-[10px] text-slate-500 uppercase block">Bookie Market Odds</span>
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400 font-bold">@</span>
                        <input
                          type="number"
                          step="0.1"
                          min="1.01"
                          max="500"
                          value={customOddsMap[scoreKey] ?? oMarket}
                          onChange={(e) => handleCustomOddsChange(scoreKey, e.target.value)}
                          className="bg-slate-900 border border-slate-700 text-slate-100 font-bold px-2 py-0.5 rounded w-20 text-xs focus:outline-none focus:border-emerald-500"
                          placeholder="e.g. 9.5"
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 block font-sans">
                        Market Implied: {((1 / oMarket) * 100).toFixed(2)}%
                      </span>
                    </div>

                    {/* Kelly Criterion Breakdown */}
                    <div className="bg-slate-950 p-2 rounded border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase block">Kelly Criterion (1/4 Bankroll)</span>
                      <span className="text-sm font-bold text-amber-400">
                        {quarterKellyPercent.toFixed(2)}% Stake
                      </span>
                      <span className="text-[10px] text-slate-400 block font-sans mt-0.5">
                        Full Kelly: {(kellyFraction * 100).toFixed(2)}%
                      </span>
                    </div>
                  </div>

                  {/* Kelly Formula Context Footnote */}
                  <div className="bg-slate-950/60 p-2 rounded border border-slate-800/80 text-[10px] text-slate-400 font-sans flex items-start gap-1.5">
                    <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                    <div>
                      <strong>Kelly Math:</strong> f* = (({oMarket.toFixed(2)} - 1) × {(pModel).toFixed(3)} - {(1 - pModel).toFixed(3)}) / ({oMarket.toFixed(2)} - 1) = {(kellyFraction * 100).toFixed(2)}%.
                      {isValueBet ? (
                        <span className="text-amber-300 font-bold ml-1">
                          Model probability is significantly higher than market implied odds!
                        </span>
                      ) : (
                        <span className="text-slate-500 ml-1">
                          No significant edge detected at current odds line.
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CorrectScoreDistribution;
