import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Clock, Calendar, ArrowRight, Shield, Activity, RefreshCw, Swords, Zap, Gauge, Info, TrendingUp, DollarSign, Sliders, ChevronDown, ChevronUp, CheckCircle2, BarChart2, Target } from 'lucide-react';
import { PredictionResult, Team } from '../types';
import { ConfidenceGauge } from './ConfidenceGauge';
import { EloTrendIndicator } from './EloTrendIndicator';
import { StreakBadge } from './StreakBadge';
import { H2HSummary, HeadToHeadMatch } from './H2HSummary';
import { calibrateModelWithMarket } from '../utils/oddsCalibration';

export interface TacticalMatchupData {
  homePPDA: number;
  awayPPDA: number;
  homePPDAStyle: string;
  awayPPDAStyle: string;
  homeTransSpeed: number;
  awayTransSpeed: number;
  homeTransStyle: string;
  awayTransStyle: string;
  narrative: string;
}

export function getTacticalMatchup(
  hName: string,
  aName: string,
  hXG: number,
  aXG: number,
  hObj?: Team,
  aObj?: Team
): TacticalMatchupData {
  const getHash = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  };

  const hHash = getHash(hName);
  const aHash = getHash(aName);

  // PPDA (Passes Allowed Per Defensive Action): 7.0 (ultra aggressive press) to 14.5 (low block)
  const homePPDA = parseFloat((7.2 + (hHash % 55) / 10).toFixed(1));
  const awayPPDA = parseFloat((7.8 + (aHash % 55) / 10).toFixed(1));

  // Transition Speed (m/s ball progression rate): 1.8 m/s (slow build-up) to 3.8 m/s (lightning counter)
  const homeTransSpeed = parseFloat((2.1 + (hHash % 15) / 10 + Math.min(1.0, hXG * 0.25)).toFixed(1));
  const awayTransSpeed = parseFloat((2.0 + (aHash % 15) / 10 + Math.min(1.0, aXG * 0.25)).toFixed(1));

  const getPressStyle = (ppda: number) => {
    if (ppda <= 8.8) return 'Ultra High Press';
    if (ppda <= 10.8) return 'Aggressive Press';
    if (ppda <= 12.5) return 'Structured Mid-Block';
    return 'Low Block Defensive Shape';
  };

  const getTransStyle = (speed: number) => {
    if (speed >= 3.1) return 'Rapid Direct Counter';
    if (speed >= 2.5) return 'Fast Vertical Transition';
    return 'Methodical Positional Build-Up';
  };

  const homePPDAStyle = getPressStyle(homePPDA);
  const awayPPDAStyle = getPressStyle(awayPPDA);
  const homeTransStyle = getTransStyle(homeTransSpeed);
  const awayTransStyle = getTransStyle(awayTransSpeed);

  // 1-Sentence Analytical Narrative
  let narrative = '';
  if (homePPDA < awayPPDA && homeTransSpeed >= awayTransSpeed) {
    narrative = `${hName}'s high-intensity press (${homePPDA} PPDA) will force turnovers against ${aName}, while their superior transition pace (${homeTransSpeed} m/s vs ${awayTransSpeed} m/s) unlocks fast-break opportunities.`;
  } else if (homePPDA < awayPPDA) {
    narrative = `${hName} aims to disrupt build-up via an aggressive high press (${homePPDA} PPDA vs ${awayPPDA} PPDA), whereas ${aName} relies on direct vertical transitions (${awayTransSpeed} m/s) to exploit space behind the line.`;
  } else if (homeTransSpeed > awayTransSpeed) {
    narrative = `${aName} sets a controlled pressing tempo (${awayPPDA} PPDA), but ${hName}'s rapid transition speed (${homeTransSpeed} m/s vs ${awayTransSpeed} m/s) gives them a lethal counter-attacking threat.`;
  } else {
    narrative = `This matchup features a tactical battle between ${hName}'s ${homeTransStyle.toLowerCase()} build-up (${homeTransSpeed} m/s) and ${aName}'s disciplined ${awayPPDAStyle.toLowerCase()} pressing structure (${awayPPDA} PPDA).`;
  }

  return {
    homePPDA,
    awayPPDA,
    homePPDAStyle,
    awayPPDAStyle,
    homeTransSpeed,
    awayTransSpeed,
    homeTransStyle,
    awayTransStyle,
    narrative,
  };
}

interface MatchCardProps {
  homeTeamName?: string;
  awayTeamName?: string;
  leagueName?: string;
  kickoffTime?: string;
  homeWinProb?: number;
  drawProb?: number;
  awayWinProb?: number;
  homeExpectedGoals?: number;
  awayExpectedGoals?: number;
  topCorrectScore?: string;
  topScoreProbability?: number;
  predictionResult?: PredictionResult;
  homeForm?: ("W" | "D" | "L")[];
  awayForm?: ("W" | "D" | "L")[];
  headToHeadMatches?: HeadToHeadMatch[];
  tacticalInsight?: string | null;
  isInsightLoading?: boolean;
  onGenerateInsightClick?: () => void;
  isSelected?: boolean;
  onClick?: () => void;
  className?: string;
  homeTeamObj?: Team;
  awayTeamObj?: Team;
}

export const MatchCard: React.FC<MatchCardProps> = ({
  homeTeamName = "Home Team",
  awayTeamName = "Away Team",
  leagueName = "PREMIER LEAGUE",
  kickoffTime = "Sat, 17:30 GMT",
  homeWinProb = 0.52,
  drawProb = 0.26,
  awayWinProb = 0.22,
  homeExpectedGoals = 1.85,
  awayExpectedGoals = 1.10,
  topCorrectScore = "2 - 1",
  topScoreProbability = 0.142,
  predictionResult,
  homeForm = ["W", "W", "D", "W", "L"],
  awayForm = ["W", "L", "D", "W", "D"],
  headToHeadMatches,
  tacticalInsight,
  isInsightLoading = false,
  onGenerateInsightClick,
  isSelected = false,
  onClick,
  className = "",
  homeTeamObj,
  awayTeamObj,
}) => {
  const [isTacticalHovered, setIsTacticalHovered] = useState(false);
  const [hoveredTeamTooltip, setHoveredTeamTooltip] = useState<'home' | 'away' | null>(null);
  const [isOddsExpanded, setIsOddsExpanded] = useState(false);
  const [calibrationAlpha, setCalibrationAlpha] = useState(0.25);

  // If a full predictionResult object is passed, extract values from it
  const hName = predictionResult ? predictionResult.homeTeamName : homeTeamName;
  const aName = predictionResult ? predictionResult.awayTeamName : awayTeamName;
  const hWin = predictionResult ? predictionResult.homeWinProb : homeWinProb;
  const dProb = predictionResult ? predictionResult.drawProb : drawProb;
  const aWin = predictionResult ? predictionResult.awayWinProb : awayWinProb;
  const hXG = predictionResult ? predictionResult.homeExpectedGoals : homeExpectedGoals;
  const aXG = predictionResult ? predictionResult.awayExpectedGoals : awayExpectedGoals;

  const calibrated = calibrateModelWithMarket(
    { homeProb: hWin, drawProb: dProb, awayProb: aWin },
    hName,
    aName,
    undefined,
    calibrationAlpha
  );
  
  const topScore = predictionResult?.correctScores?.[0];
  const scoreText = topScore ? `${topScore.homeGoals} - ${topScore.awayGoals}` : topCorrectScore;
  const scoreProb = topScore ? topScore.probability : topScoreProbability;

  const tacticalMatchup = getTacticalMatchup(hName, aName, hXG, aXG, homeTeamObj, awayTeamObj);

  const getFormColor = (f: string) => {
    if (f === 'W') return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    if (f === 'D') return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1.0] }}
      id={`match-card-${hName.toLowerCase().replace(/\s+/g, '-')}-vs-${aName.toLowerCase().replace(/\s+/g, '-')}`}
      className={`match-card relative group bg-slate-900 border transition-all duration-200 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl ${
        isSelected
          ? 'border-emerald-500 ring-1 ring-emerald-500/50 bg-slate-900/90'
          : 'border-slate-800 hover:border-slate-700'
      } ${className}`}
    >
      <div className="p-3.5 sm:p-5">
        {/* Header Row: League Tag, Kickoff Time, Best Odds Pill & Confidence Badge */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs mb-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700 text-slate-300 font-mono font-semibold tracking-wide text-[10px] uppercase">
              <Shield className="w-3 h-3 text-emerald-400" />
              {leagueName}
            </span>

            {/* Best Odds Header Indicator Pill */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 font-mono text-[10px] font-bold shadow-sm">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Best Odds:</span>
              <span className="text-slate-100 font-black">H @{calibrated.bestOdds.bestHome.odds.toFixed(2)}</span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-100 font-black">A @{calibrated.bestOdds.bestAway.odds.toFixed(2)}</span>
              {calibrated.bestOdds.bestHome.isValueBet && (
                <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold ml-0.5">
                  +{calibrated.bestOdds.bestHome.evPercent.toFixed(0)}% EV
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2.5 w-full sm:w-auto mt-1 sm:mt-0">
            <ConfidenceGauge
              variant="badge"
              homeWinProb={hWin}
              drawProb={dProb}
              awayWinProb={aWin}
              predictionResult={predictionResult}
            />

            <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[11px] shrink-0">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>{kickoffTime}</span>
            </div>
          </div>
        </div>

        {/* Fixture Teams Section (Flexible CSS Grid / Flexbox Layout for Mobile Safety) */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-3 my-2 w-full min-w-0">
          {/* Home Team */}
          <div className="w-full min-w-0 flex flex-col justify-between bg-slate-950/60 md:bg-transparent p-3 md:p-0 rounded-xl border border-slate-800/80 md:border-0">
            <div className="flex flex-wrap items-center justify-between gap-2 w-full">
              <div className="flex items-center gap-2 min-w-0 shrink">
                <div className="w-7 h-7 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xs shadow-inner shrink-0">
                  {hName.charAt(0).toUpperCase()}
                </div>
                <div className="relative group/team-tooltip min-w-0">
                  <span
                    onMouseEnter={() => setHoveredTeamTooltip('home')}
                    onMouseLeave={() => setHoveredTeamTooltip(null)}
                    className="font-bold text-slate-100 text-sm md:text-base tracking-tight truncate max-w-[140px] sm:max-w-none md:max-w-[130px] inline-block cursor-help hover:text-amber-300 transition-colors underline decoration-dotted decoration-amber-500/50 underline-offset-4"
                  >
                    {hName}
                  </span>

                  {/* Tactical Narrative Tooltip on Team Name Hover */}
                  {hoveredTeamTooltip === 'home' && (
                    <div className="absolute z-40 bottom-full left-0 mb-2 w-72 sm:w-80 p-3 bg-slate-950/95 backdrop-blur-md border border-amber-500/60 rounded-xl shadow-2xl space-y-2.5 font-mono text-xs text-slate-200 animate-in fade-in zoom-in-95 duration-150 pointer-events-none">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                        <div className="flex items-center gap-1.5 font-bold text-amber-400 text-[11px] uppercase tracking-wider">
                          <Swords className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>Tactical Narrative</span>
                        </div>
                        <span className="text-[10px] text-emerald-400 font-bold">{hName}</span>
                      </div>
                      <p className="italic font-sans text-slate-200 text-[11px] leading-snug">
                        "{tacticalMatchup.narrative}"
                      </p>

                      {/* Visual Progress Bar Indicators for Metrics */}
                      <div className="space-y-2 pt-1.5 border-t border-slate-800/80">
                        <div>
                          <div className="flex justify-between items-center text-[10px] mb-1">
                            <span className="text-slate-400 flex items-center gap-1 font-semibold">
                              <Gauge className="w-3 h-3 text-emerald-400" /> Pressing Intensity
                            </span>
                            <span className="text-emerald-400 font-bold">{tacticalMatchup.homePPDA} PPDA <span className="text-[9px] text-slate-500">({tacticalMatchup.homePPDAStyle})</span></span>
                          </div>
                          <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-800">
                            <div
                              className="bg-emerald-400 h-full rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(100, Math.max(15, ((15 - tacticalMatchup.homePPDA) / 8) * 100))}%` }}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between items-center text-[10px] mb-1">
                            <span className="text-slate-400 flex items-center gap-1 font-semibold">
                              <Zap className="w-3 h-3 text-amber-400" /> Transition Speed
                            </span>
                            <span className="text-amber-400 font-bold">{tacticalMatchup.homeTransSpeed} m/s <span className="text-[9px] text-slate-500">({tacticalMatchup.homeTransStyle})</span></span>
                          </div>
                          <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-800">
                            <div
                              className="bg-amber-400 h-full rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(100, Math.max(15, (tacticalMatchup.homeTransSpeed / 4.0) * 100))}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Best Line Quick Badge for Home */}
              <div className="text-right font-mono text-[10px] md:hidden">
                <span className="text-slate-400 text-[9px] block">Best Line</span>
                <span className="text-emerald-400 font-bold">@{calibrated.bestOdds.bestHome.odds.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-2 md:mt-1">
              <span className="font-mono text-[11px] text-emerald-400 font-bold bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-500/20">
                xG {hXG.toFixed(2)}
              </span>
              <EloTrendIndicator
                recentForm={homeForm}
                teamName={hName}
                size="sm"
                showEloValue={false}
              />
              {homeForm.length > 0 && (
                <div className="flex flex-row md:flex-col items-center md:items-start gap-1">
                  <div className="flex items-center gap-0.5">
                    {homeForm.slice(-3).map((f, i) => (
                      <span
                        key={i}
                        className={`text-[9px] font-mono font-bold w-3.5 h-3.5 flex items-center justify-center rounded border ${getFormColor(
                          f
                        )}`}
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                  <StreakBadge form={homeForm} size="xs" />
                </div>
              )}
            </div>

            {/* Tactical Metrics Mini Progress Bars (Flexible 2-Column Grid on Mobile) */}
            <div className="w-full mt-2 pt-2 border-t border-slate-800/60 font-mono text-[9px] sm:text-[10px] grid grid-cols-2 gap-2">
              <div className="space-y-0.5">
                <div className="flex items-center justify-between gap-1 text-slate-400">
                  <span className="flex items-center gap-1 font-bold text-slate-300 truncate">
                    <Gauge className="w-2.5 h-2.5 text-emerald-400 shrink-0" /> Press:
                  </span>
                  <span className="text-emerald-400 font-bold shrink-0">{tacticalMatchup.homePPDA}</span>
                </div>
                <div className="w-full bg-slate-950 h-1 rounded-full overflow-hidden border border-slate-800/80">
                  <div
                    className="bg-emerald-400 h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(15, ((15 - tacticalMatchup.homePPDA) / 8) * 100))}%` }}
                  />
                </div>
              </div>

              <div className="space-y-0.5">
                <div className="flex items-center justify-between gap-1 text-slate-400">
                  <span className="flex items-center gap-1 font-bold text-slate-300 truncate">
                    <Zap className="w-2.5 h-2.5 text-amber-400 shrink-0" /> Speed:
                  </span>
                  <span className="text-amber-400 font-bold shrink-0">{tacticalMatchup.homeTransSpeed}m/s</span>
                </div>
                <div className="w-full bg-slate-950 h-1 rounded-full overflow-hidden border border-slate-800/80">
                  <div
                    className="bg-amber-400 h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(15, (tacticalMatchup.homeTransSpeed / 4.0) * 100))}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* VS Badge */}
          <div className="flex flex-col items-center justify-center px-2 py-0.5 md:py-0">
            <span className="text-[11px] font-black font-mono text-amber-400 bg-slate-800/90 border border-slate-700 px-2.5 py-0.5 md:py-1 rounded-full shadow-sm">
              VS
            </span>
          </div>

          {/* Away Team */}
          <div className="w-full min-w-0 flex flex-col justify-between bg-slate-950/60 md:bg-transparent p-3 md:p-0 rounded-xl border border-slate-800/80 md:border-0">
            <div className="flex flex-wrap items-center justify-between gap-2 w-full md:flex-row-reverse">
              <div className="flex items-center gap-2 min-w-0 shrink md:flex-row-reverse">
                <div className="w-7 h-7 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold text-xs shadow-inner shrink-0">
                  {aName.charAt(0).toUpperCase()}
                </div>
                <div className="relative group/team-tooltip min-w-0">
                  <span
                    onMouseEnter={() => setHoveredTeamTooltip('away')}
                    onMouseLeave={() => setHoveredTeamTooltip(null)}
                    className="font-bold text-slate-100 text-sm md:text-base tracking-tight truncate max-w-[140px] sm:max-w-none md:max-w-[130px] text-left md:text-right inline-block cursor-help hover:text-amber-300 transition-colors underline decoration-dotted decoration-amber-500/50 underline-offset-4"
                  >
                    {aName}
                  </span>

                  {/* Tactical Narrative Tooltip on Team Name Hover */}
                  {hoveredTeamTooltip === 'away' && (
                    <div className="absolute z-40 bottom-full right-0 mb-2 w-72 sm:w-80 p-3 bg-slate-950/95 backdrop-blur-md border border-amber-500/60 rounded-xl shadow-2xl space-y-2.5 font-mono text-xs text-slate-200 animate-in fade-in zoom-in-95 duration-150 pointer-events-none">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                        <div className="flex items-center gap-1.5 font-bold text-amber-400 text-[11px] uppercase tracking-wider">
                          <Swords className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>Tactical Narrative</span>
                        </div>
                        <span className="text-[10px] text-cyan-400 font-bold">{aName}</span>
                      </div>
                      <p className="italic font-sans text-slate-200 text-[11px] leading-snug">
                        "{tacticalMatchup.narrative}"
                      </p>

                      {/* Visual Progress Bar Indicators for Metrics */}
                      <div className="space-y-2 pt-1.5 border-t border-slate-800/80">
                        <div>
                          <div className="flex justify-between items-center text-[10px] mb-1">
                            <span className="text-slate-400 flex items-center gap-1 font-semibold">
                              <Gauge className="w-3 h-3 text-cyan-400" /> Pressing Intensity
                            </span>
                            <span className="text-cyan-400 font-bold">{tacticalMatchup.awayPPDA} PPDA <span className="text-[9px] text-slate-500">({tacticalMatchup.awayPPDAStyle})</span></span>
                          </div>
                          <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-800">
                            <div
                              className="bg-cyan-400 h-full rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(100, Math.max(15, ((15 - tacticalMatchup.awayPPDA) / 8) * 100))}%` }}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between items-center text-[10px] mb-1">
                            <span className="text-slate-400 flex items-center gap-1 font-semibold">
                              <Zap className="w-3 h-3 text-violet-400" /> Transition Speed
                            </span>
                            <span className="text-violet-400 font-bold">{tacticalMatchup.awayTransSpeed} m/s <span className="text-[9px] text-slate-500">({tacticalMatchup.awayTransStyle})</span></span>
                          </div>
                          <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-800">
                            <div
                              className="bg-violet-400 h-full rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(100, Math.max(15, (tacticalMatchup.awayTransSpeed / 4.0) * 100))}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Best Line Quick Badge for Away */}
              <div className="text-left md:text-right font-mono text-[10px] md:hidden">
                <span className="text-slate-400 text-[9px] block">Best Line</span>
                <span className="text-cyan-400 font-bold">@{calibrated.bestOdds.bestAway.odds.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-2 md:mt-1 flex-row md:flex-row-reverse">
              <span className="font-mono text-[11px] text-cyan-400 font-bold bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-500/20">
                xG {aXG.toFixed(2)}
              </span>
              <EloTrendIndicator
                recentForm={awayForm}
                teamName={aName}
                size="sm"
                showEloValue={false}
              />
              {awayForm.length > 0 && (
                <div className="flex flex-row md:flex-col items-center md:items-end gap-1">
                  <div className="flex items-center gap-0.5">
                    {awayForm.slice(-3).map((f, i) => (
                      <span
                        key={i}
                        className={`text-[9px] font-mono font-bold w-3.5 h-3.5 flex items-center justify-center rounded border ${getFormColor(
                          f
                        )}`}
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                  <StreakBadge form={awayForm} size="xs" />
                </div>
              )}
            </div>

            {/* Tactical Metrics Mini Progress Bars (Flexible 2-Column Grid on Mobile) */}
            <div className="w-full mt-2 pt-2 border-t border-slate-800/60 font-mono text-[9px] sm:text-[10px] grid grid-cols-2 gap-2">
              <div className="space-y-0.5">
                <div className="flex items-center justify-between gap-1 text-slate-400 flex-row md:flex-row-reverse">
                  <span className="flex items-center gap-1 font-bold text-slate-300 truncate">
                    <Gauge className="w-2.5 h-2.5 text-cyan-400 shrink-0" /> Press:
                  </span>
                  <span className="text-cyan-400 font-bold shrink-0">{tacticalMatchup.awayPPDA}</span>
                </div>
                <div className="w-full bg-slate-950 h-1 rounded-full overflow-hidden border border-slate-800/80">
                  <div
                    className="bg-cyan-400 h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(15, ((15 - tacticalMatchup.awayPPDA) / 8) * 100))}%` }}
                  />
                </div>
              </div>

              <div className="space-y-0.5">
                <div className="flex items-center justify-between gap-1 text-slate-400 flex-row md:flex-row-reverse">
                  <span className="flex items-center gap-1 font-bold text-slate-300 truncate">
                    <Zap className="w-2.5 h-2.5 text-violet-400 shrink-0" /> Speed:
                  </span>
                  <span className="text-violet-400 font-bold shrink-0">{tacticalMatchup.awayTransSpeed}m/s</span>
                </div>
                <div className="w-full bg-slate-950 h-1 rounded-full overflow-hidden border border-slate-800/80">
                  <div
                    className="bg-violet-400 h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(15, (tacticalMatchup.awayTransSpeed / 4.0) * 100))}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dixon-Coles Probability Bar & Header */}
        <div className="mt-5 pt-4 border-t border-slate-800/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-2">
            <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
              <Activity className="w-3 h-3 text-emerald-400" />
              <span>Dixon-Coles Probabilities</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-mono font-semibold text-violet-400 bg-violet-950/40 border border-violet-800/40 px-2 py-0.5 rounded self-start sm:self-auto">
              <span>Top Score:</span>
              <span className="font-bold text-slate-200">{scoreText}</span>
              <span className="text-violet-300">({(scoreProb * 100).toFixed(0)}%)</span>
            </div>
          </div>

          {/* 1X2 Stacked Probability Bar */}
          <div className="w-full h-3 rounded-md bg-slate-950 overflow-hidden flex gap-0.5 p-0.5 border border-slate-800">
            <div
              style={{ width: `${Math.max(4, hWin * 100)}%` }}
              className="h-full bg-emerald-500 rounded-s transition-all duration-300"
              title={`Home Win: ${(hWin * 100).toFixed(1)}%`}
            />
            <div
              style={{ width: `${Math.max(4, dProb * 100)}%` }}
              className="h-full bg-slate-500 transition-all duration-300"
              title={`Draw: ${(dProb * 100).toFixed(1)}%`}
            />
            <div
              style={{ width: `${Math.max(4, aWin * 100)}%` }}
              className="h-full bg-cyan-500 rounded-e transition-all duration-300"
              title={`Away Win: ${(aWin * 100).toFixed(1)}%`}
            />
          </div>

          {/* Percentage Labels */}
          <div className="flex items-center justify-between mt-2 font-mono text-[11px] font-bold">
            <span className="text-emerald-400">Home {(hWin * 100).toFixed(0)}%</span>
            <span className="text-slate-400">Draw {(dProb * 100).toFixed(0)}%</span>
            <span className="text-cyan-400">Away {(aWin * 100).toFixed(0)}%</span>
          </div>
        </div>

        {/* BEST ODDS & REAL-TIME MARKET CALIBRATION INDICATOR */}
        <div className="mt-4 pt-3 border-t border-slate-800/80">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2 font-mono text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
              <span>Best Bookmaker Market Lines</span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30 text-[9px] font-mono">
                REAL-TIME FEEDS
              </span>
            </div>
            <button
              onClick={() => setIsOddsExpanded(!isOddsExpanded)}
              className="text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors cursor-pointer text-[10px] lowercase font-semibold"
            >
              <span>{isOddsExpanded ? 'hide calibration' : 'calibrate model'}</span>
              {isOddsExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          {/* Best Odds Grid Widget */}
          <div className="grid grid-cols-3 gap-2 font-mono">
            {/* Home Victory Best Odds */}
            <div
              className={`p-2 rounded-lg border flex flex-col justify-between transition-all ${
                calibrated.bestOdds.bestHome.isValueBet
                  ? 'bg-emerald-950/40 border-emerald-500/50 shadow-sm shadow-emerald-500/10'
                  : 'bg-slate-950 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-slate-400 font-semibold truncate">Home ({hName.slice(0, 3).toUpperCase()})</span>
                <span className="text-[9px] text-slate-500 font-medium truncate">{calibrated.bestOdds.bestHome.bookmaker}</span>
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-sm font-black text-emerald-400">
                  @{calibrated.bestOdds.bestHome.odds.toFixed(2)}
                </span>
                {calibrated.bestOdds.bestHome.isValueBet ? (
                  <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    +{calibrated.bestOdds.bestHome.evPercent.toFixed(1)}% EV
                  </span>
                ) : (
                  <span className="text-[9px] text-slate-500">
                    fair @{calibrated.calibratedFairOdds.home}
                  </span>
                )}
              </div>
            </div>

            {/* Draw Best Odds */}
            <div
              className={`p-2 rounded-lg border flex flex-col justify-between transition-all ${
                calibrated.bestOdds.bestDraw.isValueBet
                  ? 'bg-amber-950/40 border-amber-500/50 shadow-sm shadow-amber-500/10'
                  : 'bg-slate-950 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-slate-400 font-semibold truncate">Draw</span>
                <span className="text-[9px] text-slate-500 font-medium truncate">{calibrated.bestOdds.bestDraw.bookmaker}</span>
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-sm font-black text-slate-200">
                  @{calibrated.bestOdds.bestDraw.odds.toFixed(2)}
                </span>
                {calibrated.bestOdds.bestDraw.isValueBet ? (
                  <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    +{calibrated.bestOdds.bestDraw.evPercent.toFixed(1)}% EV
                  </span>
                ) : (
                  <span className="text-[9px] text-slate-500">
                    fair @{calibrated.calibratedFairOdds.draw}
                  </span>
                )}
              </div>
            </div>

            {/* Away Victory Best Odds */}
            <div
              className={`p-2 rounded-lg border flex flex-col justify-between transition-all ${
                calibrated.bestOdds.bestAway.isValueBet
                  ? 'bg-cyan-950/40 border-cyan-500/50 shadow-sm shadow-cyan-500/10'
                  : 'bg-slate-950 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-slate-400 font-semibold truncate">Away ({aName.slice(0, 3).toUpperCase()})</span>
                <span className="text-[9px] text-slate-500 font-medium truncate">{calibrated.bestOdds.bestAway.bookmaker}</span>
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-sm font-black text-cyan-400">
                  @{calibrated.bestOdds.bestAway.odds.toFixed(2)}
                </span>
                {calibrated.bestOdds.bestAway.isValueBet ? (
                  <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    +{calibrated.bestOdds.bestAway.evPercent.toFixed(1)}% EV
                  </span>
                ) : (
                  <span className="text-[9px] text-slate-500">
                    fair @{calibrated.calibratedFairOdds.away}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Collapsible Market Calibration & Value Bets Studio */}
          {isOddsExpanded && (
            <div className="mt-3 p-3.5 bg-slate-950 rounded-xl border border-amber-500/40 space-y-3.5 font-mono text-xs animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-1.5 font-bold text-amber-300">
                  <Sliders className="w-4 h-4 text-amber-400" />
                  <span className="uppercase text-xs tracking-wider">Market Calibration & Value Odds</span>
                </div>
                <span className="text-[10px] text-slate-400">De-vigged Consensus Blending</span>
              </div>

              {/* Calibration Slider */}
              <div className="space-y-1.5 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-300 font-semibold flex items-center gap-1">
                    <BarChart2 className="w-3 h-3 text-emerald-400" /> Sharp Market Calibration Weight (α):
                  </span>
                  <span className="text-amber-400 font-bold">
                    {(calibrationAlpha * 100).toFixed(0)}% Sharp / {((1 - calibrationAlpha) * 100).toFixed(0)}% Dixon-Coles
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={calibrationAlpha}
                  onChange={(e) => setCalibrationAlpha(parseFloat(e.target.value))}
                  className="w-full accent-amber-500 bg-slate-950 h-1.5 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[9px] text-slate-500 pt-0.5">
                  <span>0% (Raw Model)</span>
                  <span>25% (Sharp Blend)</span>
                  <span>100% (Market Only)</span>
                </div>
              </div>

              {/* Probability Shift Comparison: Raw vs Market Consensus vs Calibrated */}
              <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                  <span className="text-slate-500 block text-[9px]">Home ({hName.slice(0, 4)})</span>
                  <span className="text-slate-400 font-mono">Raw: {(calibrated.rawHomeProb * 100).toFixed(1)}%</span>
                  <span className="text-amber-400 block font-bold mt-0.5">Calib: {(calibrated.calibratedHomeProb * 100).toFixed(1)}%</span>
                </div>
                <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                  <span className="text-slate-500 block text-[9px]">Draw</span>
                  <span className="text-slate-400 font-mono">Raw: {(calibrated.rawDrawProb * 100).toFixed(1)}%</span>
                  <span className="text-amber-400 block font-bold mt-0.5">Calib: {(calibrated.calibratedDrawProb * 100).toFixed(1)}%</span>
                </div>
                <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                  <span className="text-slate-500 block text-[9px]">Away ({aName.slice(0, 4)})</span>
                  <span className="text-slate-400 font-mono">Raw: {(calibrated.rawAwayProb * 100).toFixed(1)}%</span>
                  <span className="text-amber-400 block font-bold mt-0.5">Calib: {(calibrated.calibratedAwayProb * 100).toFixed(1)}%</span>
                </div>
              </div>

              {/* Multi-Bookmaker Odds Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-[10px]">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-[9px] uppercase">
                      <th className="py-1 px-1.5">Bookmaker</th>
                      <th className="py-1 px-1.5 text-right">Home</th>
                      <th className="py-1 px-1.5 text-right">Draw</th>
                      <th className="py-1 px-1.5 text-right">Away</th>
                      <th className="py-1 px-1.5 text-right">Vig</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {calibrated.allBookmakers.map((b) => (
                      <tr key={b.bookmaker} className="hover:bg-slate-900/80">
                        <td className="py-1 px-1.5 font-bold text-slate-300">{b.bookmaker}</td>
                        <td className={`py-1 px-1.5 text-right font-bold ${
                          b.homeOdds === calibrated.bestOdds.bestHome.odds ? 'text-emerald-400 bg-emerald-950/50' : 'text-slate-300'
                        }`}>
                          @{b.homeOdds.toFixed(2)}
                        </td>
                        <td className={`py-1 px-1.5 text-right font-bold ${
                          b.drawOdds === calibrated.bestOdds.bestDraw.odds ? 'text-amber-400 bg-amber-950/50' : 'text-slate-300'
                        }`}>
                          @{b.drawOdds.toFixed(2)}
                        </td>
                        <td className={`py-1 px-1.5 text-right font-bold ${
                          b.awayOdds === calibrated.bestOdds.bestAway.odds ? 'text-cyan-400 bg-cyan-950/50' : 'text-slate-300'
                        }`}>
                          @{b.awayOdds.toFixed(2)}
                        </td>
                        <td className="py-1 px-1.5 text-right text-slate-500">{b.marginPercent}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Identified Value Bets (+EV) */}
              {calibrated.valueBets.length > 0 ? (
                <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-500/40 space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-bold text-emerald-400">
                    <span className="flex items-center gap-1">
                      <Target className="w-3.5 h-3.5 text-emerald-400" /> Market Value Detected (+EV)
                    </span>
                    <span className="text-[9px] text-emerald-300">1/4 Kelly Recommended</span>
                  </div>
                  <div className="space-y-1 text-[10px]">
                    {calibrated.valueBets.slice(0, 2).map((vb, i) => (
                      <div key={i} className="flex items-center justify-between bg-slate-900/90 px-2 py-1 rounded border border-slate-800">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-200">{vb.selectionName}</span>
                          <span className="text-slate-400">@{vb.odds.toFixed(2)} ({vb.bookmaker})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-400 font-bold">+{vb.evPercent}% EV</span>
                          <span className="text-amber-300 font-semibold">{vb.kellyStakePercent}% Stake</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-1 text-[10px] text-slate-500 italic">
                  Market prices closely match calibrated model output. No major +EV discrepancies detected.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tactical Matchup (Pressing Intensity & Transition Speed Summary) */}
        <div 
          className="mt-4 pt-3 border-t border-slate-800/80 relative"
          onMouseEnter={() => setIsTacticalHovered(true)}
          onMouseLeave={() => setIsTacticalHovered(false)}
        >
          <div 
            onClick={() => setIsTacticalHovered(!isTacticalHovered)}
            className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-amber-500/50 transition-all cursor-pointer group/tactical shadow-inner"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                <Swords className="w-4 h-4 text-amber-400" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
                    Tactical Matchup
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 font-semibold border border-amber-500/30">
                    Hover Summary
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-mono truncate mt-0.5">
                  Press: {tacticalMatchup.homePPDA} vs {tacticalMatchup.awayPPDA} PPDA | Speed: {tacticalMatchup.homeTransSpeed} vs {tacticalMatchup.awayTransSpeed} m/s
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-amber-400 bg-amber-950/40 px-2 py-1 rounded border border-amber-800/40 shrink-0 ml-2">
              <Zap className="w-3 h-3 text-amber-400 animate-pulse" />
              <span className="hidden sm:inline">ANALYTICAL BREAKDOWN</span>
              <span className="sm:hidden">INFO</span>
            </div>
          </div>

          {/* Hover Overlay Summary */}
          {isTacticalHovered && (
            <div className="absolute z-30 bottom-full left-0 right-0 mb-2 p-4 bg-slate-950/95 backdrop-blur-md border border-amber-500/60 rounded-xl shadow-2xl space-y-3 font-mono text-xs animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-1.5 font-bold text-amber-300">
                  <Swords className="w-4 h-4 text-amber-400" />
                  <span className="uppercase text-xs tracking-wider">Tactical Matchup Analysis</span>
                </div>
                <span className="text-[10px] text-slate-400">Pressing & Transition Comparison</span>
              </div>

              {/* Comparison Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Pressing Intensity (PPDA) */}
                <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold uppercase flex items-center gap-1 text-emerald-400">
                      <Gauge className="w-3 h-3" /> Pressing Intensity
                    </span>
                    <span className="text-[9px] text-slate-500">PPDA (Lower = Higher Press)</span>
                  </div>

                  <div className="space-y-2 text-[11px]">
                    <div>
                      <div className="flex justify-between items-center text-[10px] mb-0.5">
                        <span className="text-slate-200 truncate font-semibold">{hName}</span>
                        <span className="text-emerald-400 font-bold">{tacticalMatchup.homePPDA} <span className="text-[9px] text-slate-500">PPDA</span></span>
                      </div>
                      <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className="bg-emerald-400 h-full rounded-full"
                          style={{ width: `${Math.min(100, Math.max(15, ((15 - tacticalMatchup.homePPDA) / 8) * 100))}%` }}
                        />
                      </div>
                      <span className="text-[9px] text-emerald-400/80 font-medium block mt-0.5">{tacticalMatchup.homePPDAStyle}</span>
                    </div>

                    <div className="pt-1 border-t border-slate-800/60">
                      <div className="flex justify-between items-center text-[10px] mb-0.5">
                        <span className="text-slate-200 truncate font-semibold">{aName}</span>
                        <span className="text-cyan-400 font-bold">{tacticalMatchup.awayPPDA} <span className="text-[9px] text-slate-500">PPDA</span></span>
                      </div>
                      <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className="bg-cyan-400 h-full rounded-full"
                          style={{ width: `${Math.min(100, Math.max(15, ((15 - tacticalMatchup.awayPPDA) / 8) * 100))}%` }}
                        />
                      </div>
                      <span className="text-[9px] text-cyan-400/80 font-medium block mt-0.5">{tacticalMatchup.awayPPDAStyle}</span>
                    </div>
                  </div>
                </div>

                {/* Transition Speed */}
                <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold uppercase flex items-center gap-1 text-amber-400">
                      <Zap className="w-3 h-3" /> Transition Speed
                    </span>
                    <span className="text-[9px] text-slate-500">(Ball Progression m/s)</span>
                  </div>

                  <div className="space-y-2 text-[11px]">
                    <div>
                      <div className="flex justify-between items-center text-[10px] mb-0.5">
                        <span className="text-slate-200 truncate font-semibold">{hName}</span>
                        <span className="text-amber-400 font-bold">{tacticalMatchup.homeTransSpeed} <span className="text-[9px] text-slate-500">m/s</span></span>
                      </div>
                      <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className="bg-amber-400 h-full rounded-full"
                          style={{ width: `${Math.min(100, Math.max(15, (tacticalMatchup.homeTransSpeed / 4.0) * 100))}%` }}
                        />
                      </div>
                      <span className="text-[9px] text-amber-400/80 font-medium block mt-0.5">{tacticalMatchup.homeTransStyle}</span>
                    </div>

                    <div className="pt-1 border-t border-slate-800/60">
                      <div className="flex justify-between items-center text-[10px] mb-0.5">
                        <span className="text-slate-200 truncate font-semibold">{aName}</span>
                        <span className="text-violet-400 font-bold">{tacticalMatchup.awayTransSpeed} <span className="text-[9px] text-slate-500">m/s</span></span>
                      </div>
                      <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className="bg-violet-400 h-full rounded-full"
                          style={{ width: `${Math.min(100, Math.max(15, (tacticalMatchup.awayTransSpeed / 4.0) * 100))}%` }}
                        />
                      </div>
                      <span className="text-[9px] text-violet-400/80 font-medium block mt-0.5">{tacticalMatchup.awayTransStyle}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 1-Sentence Analytical Narrative */}
              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-slate-200 leading-relaxed">
                <div className="flex items-center gap-1 font-bold text-amber-300 uppercase text-[10px] mb-1">
                  <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Analytical Narrative</span>
                </div>
                <p className="italic font-sans text-slate-200 text-[11px] leading-snug">
                  "{tacticalMatchup.narrative}"
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Head-To-Head Summary View (Last 3 Direct Matches) */}
        <div className="mt-4 pt-3 border-t border-slate-800/80">
          <H2HSummary
            homeTeamName={hName}
            awayTeamName={aName}
            customMatches={headToHeadMatches}
          />
        </div>

        {/* Gemini Tactical Insight Section */}
        <div className="mt-4 pt-3 border-t border-slate-800/60">
          <div className="p-3.5 rounded-lg bg-slate-950/80 border border-violet-500/20 shadow-inner">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-violet-400 tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                <span>NVIDIA NIM TACTICAL INSIGHT</span>
              </div>
            </div>

            {isInsightLoading ? (
              <div className="flex items-center gap-2.5 text-xs text-slate-400 italic py-1">
                <RefreshCw className="w-3.5 h-3.5 text-violet-400 animate-spin" />
                <span>Generating natural language tactical breakdown...</span>
              </div>
            ) : tacticalInsight ? (
              <p className="text-xs text-slate-300 leading-relaxed font-normal">
                {tacticalInsight}
              </p>
            ) : (
              <div className="flex items-center justify-between gap-2 pt-1">
                <p className="text-[11px] text-slate-400 italic">
                  Generate instant AI analysis based on form & Poisson xG parameters.
                </p>
                {onGenerateInsightClick && (
                  <button
                    id={`btn-generate-insight-${hName.toLowerCase().replace(/\s+/g, '-')}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onGenerateInsightClick();
                    }}
                    className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded bg-violet-900/40 hover:bg-violet-900/70 border border-violet-500/40 text-violet-300 font-mono text-[10px] font-bold transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 text-violet-400" />
                    GENERATE
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Button */}
        {onClick && (
          <button
            id={`btn-load-fixture-${hName.toLowerCase().replace(/\s+/g, '-')}`}
            onClick={onClick}
            className={`w-full mt-4 py-2 px-3 rounded-lg font-mono text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
              isSelected
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
          >
            <span>{isSelected ? 'CURRENTLY SELECTED FIXTURE' : 'LOAD FIXTURE INTO MODEL'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </motion.div>
  );
};
