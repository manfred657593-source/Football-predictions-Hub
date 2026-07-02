import React, { useState } from 'react';
import {
  BrainCircuit,
  Info,
  ShieldAlert,
  Zap,
  Activity,
  ChevronDown,
  ChevronUp,
  Sliders,
  Sparkles,
  HelpCircle,
  BarChart2,
  Gauge
} from 'lucide-react';
import { PredictionResult } from '../types';
import { calculateEntropyAndConfidence, EntropyMetrics } from '../utils/entropy';

interface ConfidenceGaugeProps {
  predictionResult?: PredictionResult;
  homeWinProb?: number;
  drawProb?: number;
  awayWinProb?: number;
  scoreMatrix?: number[][];
  over25Prob?: number;
  variant?: 'full' | 'compact' | 'badge';
  title?: string;
  className?: string;
}

export const ConfidenceGauge: React.FC<ConfidenceGaugeProps> = ({
  predictionResult,
  homeWinProb = 0.52,
  drawProb = 0.26,
  awayWinProb = 0.22,
  scoreMatrix,
  over25Prob,
  variant = 'full',
  title = 'ENGINE PREDICTION CONFIDENCE GAUGE',
  className = '',
}) => {
  const [distributionType, setDistributionType] = useState<'1X2' | 'MATRIX' | 'TOTALS'>('1X2');
  const [showFormulaInfo, setShowFormulaInfo] = useState<boolean>(false);

  // Extract actual probabilities
  const hWin = predictionResult ? predictionResult.homeWinProb : homeWinProb;
  const dProb = predictionResult ? predictionResult.drawProb : drawProb;
  const aWin = predictionResult ? predictionResult.awayWinProb : awayWinProb;
  const matrix = predictionResult ? predictionResult.scoreMatrix : scoreMatrix;
  const ou25 = predictionResult ? predictionResult.over25Prob : (over25Prob ?? 0.55);

  // Determine active probabilities array based on tab
  let activeProbabilities: number[] = [hWin, dProb, aWin];
  let distributionLabel = '1X2 Outcome Distribution (N=3)';

  if (distributionType === 'MATRIX' && matrix && matrix.length > 0) {
    activeProbabilities = matrix.flat();
    distributionLabel = 'Scoreline Matrix Distribution (N=36)';
  } else if (distributionType === 'TOTALS') {
    activeProbabilities = [ou25, Math.max(0, 1 - ou25)];
    distributionLabel = 'Over/Under 2.5 Goals Distribution (N=2)';
  }

  const metrics: EntropyMetrics = calculateEntropyAndConfidence(activeProbabilities);

  // Calculate SVG arc parameters for the semi-circle gauge (180 deg)
  // Radius = 80, Center = (100, 90)
  const radius = 70;
  const cx = 100;
  const cy = 85;
  const circumference = Math.PI * radius; // 180 degrees arc length
  const strokeDashoffset = circumference * (1 - metrics.confidenceScore / 100);

  // Needle angle: -90 deg (0%) to +90 deg (100%)
  const needleAngle = -90 + (metrics.confidenceScore / 100) * 180;

  // Render Compact Badge Mode
  if (variant === 'badge') {
    return (
      <div
        id="confidence-badge-component"
        className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800 font-mono text-xs ${className}`}
        title={`Shannon Entropy: ${metrics.shannonEntropyNats} nats (${metrics.confidenceLabel})`}
      >
        <div
          className="w-2.5 h-2.5 rounded-full animate-pulse"
          style={{ backgroundColor: metrics.confidenceColor }}
        />
        <span className="text-slate-400 text-[10px] uppercase font-bold">CONFIDENCE:</span>
        <span className="font-bold text-slate-100" style={{ color: metrics.confidenceColor }}>
          {metrics.confidenceScore}%
        </span>
      </div>
    );
  }

  // Render Compact Card Mode
  if (variant === 'compact') {
    return (
      <div
        id="confidence-gauge-compact"
        className={`bg-slate-950 border border-slate-800/80 rounded-xl p-3 space-y-2 font-mono text-xs ${className}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
              Prediction Confidence
            </span>
          </div>
          <span
            className="px-2 py-0.5 rounded text-[10px] font-bold border"
            style={{
              backgroundColor: `${metrics.confidenceColor}15`,
              color: metrics.confidenceColor,
              borderColor: `${metrics.confidenceColor}40`,
            }}
          >
            {metrics.confidenceTier.replace('_', ' ')}
          </span>
        </div>

        {/* Horizontal Visual Gauge Meter */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] font-bold">
            <span className="text-slate-400">Entropy: {metrics.shannonEntropyNats} nats</span>
            <span style={{ color: metrics.confidenceColor }}>
              {metrics.confidenceScore}% Certainty
            </span>
          </div>

          <div className="w-full h-2.5 rounded-full bg-slate-900 border border-slate-800 overflow-hidden relative p-0.5">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${metrics.confidenceScore}%`,
                backgroundColor: metrics.confidenceColor,
                boxShadow: `0 0 10px ${metrics.confidenceColor}80`,
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  // Render Full Studio Gauge Component
  return (
    <div
      id="confidence-gauge-full-studio"
      className={`bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4 font-mono ${className}`}
    >
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Gauge className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
              {title}
            </h3>
            <p className="text-[11px] text-slate-400 font-sans">
              Calculates Information Entropy H(P) = -∑ P_i ln P_i over match outcome distributions
            </p>
          </div>
        </div>

        {/* Distribution Selector */}
        <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px]">
          <button
            id="btn-entropy-tab-1x2"
            onClick={() => setDistributionType('1X2')}
            className={`px-2.5 py-1 rounded font-bold cursor-pointer transition-colors ${
              distributionType === '1X2'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            1X2 Match
          </button>
          <button
            id="btn-entropy-tab-matrix"
            onClick={() => setDistributionType('MATRIX')}
            className={`px-2.5 py-1 rounded font-bold cursor-pointer transition-colors ${
              distributionType === 'MATRIX'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            6x6 Score Grid
          </button>
          <button
            id="btn-entropy-tab-totals"
            onClick={() => setDistributionType('TOTALS')}
            className={`px-2.5 py-1 rounded font-bold cursor-pointer transition-colors ${
              distributionType === 'TOTALS'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Over/Under 2.5
          </button>
        </div>
      </div>

      {/* Main Dial Gauge & Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
        {/* Semi-Circular SVG Dial Gauge (5 cols on md) */}
        <div className="md:col-span-5 flex flex-col items-center justify-center p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 relative overflow-hidden">
          <div className="relative w-56 h-36 flex items-end justify-center">
            <svg viewBox="0 0 200 115" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f43f5e" />
                  <stop offset="35%" stopColor="#f59e0b" />
                  <stop offset="65%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>

                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Background Arc Track */}
              <path
                d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
                fill="none"
                stroke="#1e293b"
                strokeWidth="16"
                strokeLinecap="round"
              />

              {/* Colored Gradient Active Arc */}
              <path
                d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
                fill="none"
                stroke="url(#gaugeGradient)"
                strokeWidth="16"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                filter="url(#glow)"
                className="transition-all duration-700 ease-out"
              />

              {/* Ticks & Labels */}
              <text x="22" y="102" fill="#64748b" fontSize="8" fontWeight="bold">0%</text>
              <text x="94" y="12" fill="#64748b" fontSize="8" fontWeight="bold">50%</text>
              <text x="168" y="102" fill="#64748b" fontSize="8" fontWeight="bold">100%</text>

              {/* Needle Indicator */}
              <g transform={`translate(${cx}, ${cy}) rotate(${needleAngle})`}>
                <line
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="-58"
                  stroke="#f8fafc"
                  strokeWidth="3"
                  strokeLinecap="round"
                  className="transition-transform duration-700 ease-out"
                />
                <circle cx="0" cy="0" r="6" fill="#f8fafc" stroke="#020617" strokeWidth="2" />
              </g>
            </svg>

            {/* Floating Percentage Readout */}
            <div className="absolute bottom-1 flex flex-col items-center">
              <span className="text-3xl font-extrabold text-slate-100 font-mono tracking-tight" style={{ color: metrics.confidenceColor }}>
                {metrics.confidenceScore}%
              </span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                ENGINE SURENESS
              </span>
            </div>
          </div>

          <div className="mt-2 text-center">
            <span
              className="inline-block px-2.5 py-0.5 rounded text-[11px] font-bold uppercase border"
              style={{
                backgroundColor: `${metrics.confidenceColor}15`,
                color: metrics.confidenceColor,
                borderColor: `${metrics.confidenceColor}40`,
              }}
            >
              {metrics.confidenceLabel}
            </span>
          </div>
        </div>

        {/* Detailed Entropy Metrics Breakdown (7 cols on md) */}
        <div className="md:col-span-7 space-y-3">
          <div className="text-xs text-slate-400 flex items-center justify-between border-b border-slate-800/80 pb-2">
            <span>Evaluating: <strong className="text-slate-200">{distributionLabel}</strong></span>
            <button
              id="btn-toggle-formula-info"
              onClick={() => setShowFormulaInfo(!showFormulaInfo)}
              className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{showFormulaInfo ? 'Hide Math' : 'How Entropy Works'}</span>
            </button>
          </div>

          {/* Math & Theory Info Panel */}
          {showFormulaInfo && (
            <div className="p-3 bg-slate-950 rounded-lg border border-cyan-500/30 text-xs space-y-1.5 text-slate-300 font-sans">
              <div className="flex items-center gap-1.5 text-cyan-400 font-mono font-bold text-[11px]">
                <BrainCircuit className="w-3.5 h-3.5" />
                <span>SHANNON ENTROPY IN FOOTBALL PREDICTION</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                In Information Theory, <strong>Shannon Entropy (H)</strong> measures the disorder or randomness of a probability distribution:
              </p>
              <div className="bg-slate-900 p-2 rounded text-center font-mono text-cyan-300 text-[11px] border border-slate-800">
                H(P) = - ∑ P(x_i) · ln P(x_i)
              </div>
              <ul className="text-[11px] space-y-1 list-disc list-inside text-slate-400">
                <li><strong>Max Entropy (ln N):</strong> Uniform distribution (33.3% each). Total uncertainty / coin toss.</li>
                <li><strong>Min Entropy (0):</strong> One outcome has 100% probability. Perfect prediction certainty.</li>
                <li><strong>Confidence Score:</strong> Computed as (1 - H(P) / ln N) × 100%.</li>
              </ul>
            </div>
          )}

          {/* Metrics Cards Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-500 uppercase block font-bold">SHANNON ENTROPY H(P)</span>
              <span className="text-base font-bold text-slate-100 block">
                {metrics.shannonEntropyNats} <span className="text-xs font-normal text-slate-500">nats</span>
              </span>
              <span className="text-[10px] text-slate-400 block">
                ({metrics.shannonEntropyBits} bits)
              </span>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-500 uppercase block font-bold">MAX UNCERTAINTY H_max</span>
              <span className="text-base font-bold text-slate-100 block">
                {metrics.maxEntropyNats} <span className="text-xs font-normal text-slate-500">nats</span>
              </span>
              <span className="text-[10px] text-slate-400 block">
                ln({metrics.numOutcomes}) for N={metrics.numOutcomes} outcomes
              </span>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-500 uppercase block font-bold">NORMALIZED UNCERTAINTY</span>
              <span className="text-base font-bold text-amber-400 block">
                {Math.round(metrics.normalizedEntropy * 100)}%
              </span>
              <span className="text-[10px] text-slate-400 block">
                Disorder ratio H / H_max
              </span>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-500 uppercase block font-bold">PREDICTION CERTAINTY</span>
              <span className="text-base font-bold text-emerald-400 block">
                {metrics.confidenceScore}%
              </span>
              <span className="text-[10px] text-slate-400 block">
                Engine conviction 1 - H/H_max
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfidenceGauge;
