import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Calculator,
  RotateCcw,
  Sparkles,
  TrendingUp,
  Percent,
  DollarSign,
  Info,
  Check,
} from 'lucide-react';
import { PredictionResult, Team } from '../types';

interface InteractiveProbSliderProps {
  predictionResult: PredictionResult;
  homeTeamName: string;
  awayTeamName: string;
  className?: string;
}

// Convert decimal probability (0-1) to Decimal Odds (e.g. 2.50)
function probToDecimalOdds(prob: number, marginPercent: number = 0): string {
  if (prob <= 0) return '∞';
  // Adjust for bookmaker overround margin if applicable
  const adjustedProb = prob * (1 + marginPercent / 100);
  const odds = 1 / adjustedProb;
  if (odds > 999) return '999.00';
  return odds.toFixed(2);
}

// Convert decimal probability to American Odds (e.g. +150 or -200)
function probToAmericanOdds(prob: number): string {
  if (prob <= 0 || prob >= 1) return 'N/A';
  const dec = 1 / prob;
  if (dec >= 2.0) {
    const american = Math.round((dec - 1) * 100);
    return `+${american}`;
  } else {
    const american = Math.round(-100 / (dec - 1));
    return `${american}`;
  }
}

// Convert decimal probability to Fractional Odds string (e.g. 3/2)
function probToFractionalOdds(prob: number): string {
  if (prob <= 0 || prob >= 1) return 'N/A';
  const dec = 1 / prob;
  const num = dec - 1;
  
  // Approximate fraction with denominator up to 20
  let bestNum = 1;
  let bestDen = 1;
  let minErr = 999;

  for (let den = 1; den <= 20; den++) {
    const n = Math.round(num * den);
    const err = Math.abs(num - n / den);
    if (err < minErr) {
      minErr = err;
      bestNum = n;
      bestDen = den;
    }
  }

  if (bestNum === 0) return '1/100';
  return `${bestNum}/${bestDen}`;
}

export const InteractiveProbSlider: React.FC<InteractiveProbSliderProps> = ({
  predictionResult,
  homeTeamName,
  awayTeamName,
  className = '',
}) => {
  // Convert model base probs to percentages (0 to 100)
  const baseHome = Math.round(predictionResult.homeWinProb * 100);
  const baseDraw = Math.round(predictionResult.drawProb * 100);
  const baseAway = Math.round((1 - predictionResult.homeWinProb - predictionResult.drawProb) * 100);

  const [homePct, setHomePct] = useState<number>(baseHome);
  const [drawPct, setDrawPct] = useState<number>(baseDraw);
  const [awayPct, setAwayPct] = useState<number>(baseAway);
  const [bookmakerMargin, setBookmakerMargin] = useState<number>(0); // 0% fair, 5% standard
  const [oddsFormat, setOddsFormat] = useState<'decimal' | 'american' | 'fractional'>('decimal');

  // Update when active match prediction changes
  useEffect(() => {
    const h = Math.round(predictionResult.homeWinProb * 100);
    const d = Math.round(predictionResult.drawProb * 100);
    const a = Math.max(0, 100 - h - d);
    setHomePct(h);
    setDrawPct(d);
    setAwayPct(a);
  }, [predictionResult]);

  // Auto-balance probabilities when one slider moves
  const handleSliderChange = (changed: 'home' | 'draw' | 'away', newVal: number) => {
    const clampedVal = Math.min(98, Math.max(1, newVal));

    if (changed === 'home') {
      const remaining = 100 - clampedVal;
      const otherSum = drawPct + awayPct;
      let newDraw = 0;
      let newAway = 0;

      if (otherSum === 0) {
        newDraw = Math.round(remaining / 2);
        newAway = remaining - newDraw;
      } else {
        newDraw = Math.round((drawPct / otherSum) * remaining);
        newAway = remaining - newDraw;
      }

      setHomePct(clampedVal);
      setDrawPct(newDraw);
      setAwayPct(newAway);
    } else if (changed === 'draw') {
      const remaining = 100 - clampedVal;
      const otherSum = homePct + awayPct;
      let newHome = 0;
      let newAway = 0;

      if (otherSum === 0) {
        newHome = Math.round(remaining / 2);
        newAway = remaining - newHome;
      } else {
        newHome = Math.round((homePct / otherSum) * remaining);
        newAway = remaining - newHome;
      }

      setDrawPct(clampedVal);
      setHomePct(newHome);
      setAwayPct(newAway);
    } else {
      const remaining = 100 - clampedVal;
      const otherSum = homePct + drawPct;
      let newHome = 0;
      let newDraw = 0;

      if (otherSum === 0) {
        newHome = Math.round(remaining / 2);
        newDraw = remaining - newHome;
      } else {
        newHome = Math.round((homePct / otherSum) * remaining);
        newDraw = remaining - newHome;
      }

      setAwayPct(clampedVal);
      setHomePct(newHome);
      setDrawPct(newDraw);
    }
  };

  const handleReset = () => {
    const h = Math.round(predictionResult.homeWinProb * 100);
    const d = Math.round(predictionResult.drawProb * 100);
    const a = Math.max(0, 100 - h - d);
    setHomePct(h);
    setDrawPct(d);
    setAwayPct(a);
  };

  // Convert percentages back to 0-1 decimals
  const pHome = homePct / 100;
  const pDraw = drawPct / 100;
  const pAway = awayPct / 100;

  // Format odds helper
  const renderOdds = (prob: number) => {
    if (oddsFormat === 'decimal') return probToDecimalOdds(prob, bookmakerMargin);
    if (oddsFormat === 'american') return probToAmericanOdds(prob);
    return probToFractionalOdds(prob);
  };

  const isModified =
    Math.abs(homePct - baseHome) > 1 ||
    Math.abs(drawPct - baseDraw) > 1 ||
    Math.abs(awayPct - baseAway) > 1;

  return (
    <div
      id="interactive-probability-slider-card"
      className={`bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-5 font-mono ${className}`}
    >
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
              Interactive Outcome Probability & Odds Adjuster
              {isModified && (
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase">
                  Custom User Simulation
                </span>
              )}
            </h3>
            <p className="text-[11px] text-slate-400 font-sans">
              Manually adjust match probabilities to instantly calculate fair & bookmaker implied betting odds
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Format Selector */}
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px]">
            <button
              onClick={() => setOddsFormat('decimal')}
              className={`px-2 py-0.5 rounded font-bold cursor-pointer transition-colors ${
                oddsFormat === 'decimal'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Decimal
            </button>
            <button
              onClick={() => setOddsFormat('american')}
              className={`px-2 py-0.5 rounded font-bold cursor-pointer transition-colors ${
                oddsFormat === 'american'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              American
            </button>
            <button
              onClick={() => setOddsFormat('fractional')}
              className={`px-2 py-0.5 rounded font-bold cursor-pointer transition-colors ${
                oddsFormat === 'fractional'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Fractional
            </button>
          </div>

          {/* Reset Button */}
          <button
            id="btn-reset-prob-sliders"
            onClick={handleReset}
            disabled={!isModified}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors cursor-pointer ${
              isModified
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                : 'bg-slate-950 text-slate-600 border-slate-800 cursor-not-allowed'
            }`}
            title="Reset to Poisson & Elo model initial baseline probabilities"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Stacked Probability Bar Visualizer */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-bold text-slate-400">
          <span>100% Normalized Match Probability Distribution</span>
          <span className="text-slate-500 text-[10px]">Sum: {homePct + drawPct + awayPct}%</span>
        </div>
        <div className="w-full h-4 bg-slate-950 rounded-lg overflow-hidden flex border border-slate-800 p-0.5">
          <div
            style={{ width: `${homePct}%` }}
            className="h-full bg-emerald-500 transition-all duration-150 rounded-l flex items-center justify-center text-[9px] font-extrabold text-slate-950 overflow-hidden"
          >
            {homePct >= 10 && `${homePct}%`}
          </div>
          <div
            style={{ width: `${drawPct}%` }}
            className="h-full bg-amber-500 transition-all duration-150 flex items-center justify-center text-[9px] font-extrabold text-slate-950 overflow-hidden"
          >
            {drawPct >= 10 && `${drawPct}%`}
          </div>
          <div
            style={{ width: `${awayPct}%` }}
            className="h-full bg-cyan-500 transition-all duration-150 rounded-r flex items-center justify-center text-[9px] font-extrabold text-slate-950 overflow-hidden"
          >
            {awayPct >= 10 && `${awayPct}%`}
          </div>
        </div>
      </div>

      {/* Sliders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Home Win Slider */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              {homeTeamName} (Home)
            </span>
            <span className="text-base font-extrabold text-emerald-300">{homePct}%</span>
          </div>

          <input
            id="slider-home-prob"
            type="range"
            min="1"
            max="98"
            value={homePct}
            onChange={(e) => handleSliderChange('home', parseInt(e.target.value, 10))}
            className="w-full accent-emerald-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
          />

          <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">Implied Odds:</span>
            <span className="text-sm font-extrabold text-slate-100">{renderOdds(pHome)}</span>
          </div>
        </div>

        {/* Draw Slider */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
              Match Draw (X)
            </span>
            <span className="text-base font-extrabold text-amber-300">{drawPct}%</span>
          </div>

          <input
            id="slider-draw-prob"
            type="range"
            min="1"
            max="98"
            value={drawPct}
            onChange={(e) => handleSliderChange('draw', parseInt(e.target.value, 10))}
            className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
          />

          <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">Implied Odds:</span>
            <span className="text-sm font-extrabold text-slate-100">{renderOdds(pDraw)}</span>
          </div>
        </div>

        {/* Away Win Slider */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 inline-block" />
              {awayTeamName} (Away)
            </span>
            <span className="text-base font-extrabold text-cyan-300">{awayPct}%</span>
          </div>

          <input
            id="slider-away-prob"
            type="range"
            min="1"
            max="98"
            value={awayPct}
            onChange={(e) => handleSliderChange('away', parseInt(e.target.value, 10))}
            className="w-full accent-cyan-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
          />

          <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">Implied Odds:</span>
            <span className="text-sm font-extrabold text-slate-100">{renderOdds(pAway)}</span>
          </div>
        </div>
      </div>

      {/* Bookmaker Margin / Overround Setting */}
      <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-slate-400 shrink-0" />
          <div>
            <span className="font-bold text-slate-200">Bookmaker Margin / Vigorish Overround:</span>
            <span className="text-[11px] text-slate-400 ml-1 font-sans">
              (0% Fair Market, 5% Standard Commercial Margin)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {[0, 3, 5, 8].map((margin) => (
            <button
              key={margin}
              onClick={() => setBookmakerMargin(margin)}
              className={`px-2.5 py-1 rounded font-bold cursor-pointer text-[11px] transition-colors ${
                bookmakerMargin === margin
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {margin === 0 ? '0% Fair' : `${margin}% Vig`}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default InteractiveProbSlider;
