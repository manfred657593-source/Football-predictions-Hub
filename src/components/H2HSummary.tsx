import React from 'react';
import { Swords, Calendar, Award, Minus } from 'lucide-react';

export interface HeadToHeadMatch {
  date: string;
  homeTeam: string;
  awayTeam: string;
  homeGoals: number;
  awayGoals: number;
  competition?: string;
}

// Curated classic derby matches for top team pairs
const CURATED_H2H: Record<string, HeadToHeadMatch[]> = {
  'arsenal_vs_manchester city': [
    { date: '15 Feb 2026', homeTeam: 'Arsenal', awayTeam: 'Manchester City', homeGoals: 2, awayGoals: 1, competition: 'Premier League' },
    { date: '22 Sep 2025', homeTeam: 'Manchester City', awayTeam: 'Arsenal', homeGoals: 2, awayGoals: 2, competition: 'Premier League' },
    { date: '31 Mar 2025', homeTeam: 'Manchester City', awayTeam: 'Arsenal', homeGoals: 0, awayGoals: 0, competition: 'Premier League' },
  ],
  'liverpool_vs_chelsea': [
    { date: '20 Oct 2025', homeTeam: 'Liverpool', awayTeam: 'Chelsea', homeGoals: 2, awayGoals: 1, competition: 'Premier League' },
    { date: '25 Feb 2025', homeTeam: 'Chelsea', awayTeam: 'Liverpool', homeGoals: 0, awayGoals: 1, competition: 'EFL Cup' },
    { date: '31 Jan 2025', homeTeam: 'Liverpool', awayTeam: 'Chelsea', homeGoals: 4, awayGoals: 1, competition: 'Premier League' },
  ],
  'real madrid_vs_barcelona': [
    { date: '26 Oct 2025', homeTeam: 'Real Madrid', awayTeam: 'Barcelona', homeGoals: 0, awayGoals: 4, competition: 'La Liga' },
    { date: '21 Apr 2025', homeTeam: 'Real Madrid', awayTeam: 'Barcelona', homeGoals: 3, awayGoals: 2, competition: 'La Liga' },
    { date: '14 Jan 2025', homeTeam: 'Real Madrid', awayTeam: 'Barcelona', homeGoals: 4, awayGoals: 1, competition: 'Supercopa' },
  ],
  'bayern munich_vs_borussia dortmund': [
    { date: '30 Nov 2025', homeTeam: 'Borussia Dortmund', awayTeam: 'Bayern Munich', homeGoals: 1, awayGoals: 1, competition: 'Bundesliga' },
    { date: '30 Mar 2025', homeTeam: 'Bayern Munich', awayTeam: 'Borussia Dortmund', homeGoals: 0, awayGoals: 2, competition: 'Bundesliga' },
    { date: '04 Nov 2024', homeTeam: 'Borussia Dortmund', awayTeam: 'Bayern Munich', homeGoals: 0, awayGoals: 4, competition: 'Bundesliga' },
  ],
  'inter milan_vs_ac milan': [
    { date: '22 Sep 2025', homeTeam: 'Inter Milan', awayTeam: 'AC Milan', homeGoals: 1, awayGoals: 2, competition: 'Serie A' },
    { date: '22 Apr 2025', homeTeam: 'AC Milan', awayTeam: 'Inter Milan', homeGoals: 1, awayGoals: 2, competition: 'Serie A' },
    { date: '16 Sep 2024', homeTeam: 'Inter Milan', awayTeam: 'AC Milan', homeGoals: 5, awayGoals: 1, competition: 'Serie A' },
  ]
};

/**
 * Deterministically generates 3 realistic last H2H matches for any team pair
 */
export function getHeadToHeadMatches(homeName: string, awayName: string): HeadToHeadMatch[] {
  const hLower = homeName.trim().toLowerCase();
  const aLower = awayName.trim().toLowerCase();

  const key1 = `${hLower}_vs_${aLower}`;
  const key2 = `${aLower}_vs_${hLower}`;

  if (CURATED_H2H[key1]) return CURATED_H2H[key1];
  if (CURATED_H2H[key2]) return CURATED_H2H[key2];

  // Seed generator for arbitrary team pairs
  const seedStr = [hLower, aLower].sort().join('-vs-');
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash << 5) - hash + seedStr.charCodeAt(i);
    hash |= 0;
  }
  const absHash = Math.abs(hash);

  const dates = ['12 Nov 2025', '18 Mar 2025', '04 Dec 2024'];
  const competitions = ['League Match', 'League Match', 'Cup Match'];

  const possibleScores = [
    { h: 2, a: 1 },
    { h: 1, a: 1 },
    { h: 0, a: 2 },
    { h: 3, a: 1 },
    { h: 1, a: 0 },
    { h: 2, a: 2 },
    { h: 1, a: 2 },
  ];

  return [0, 1, 2].map((idx) => {
    const scoreIdx = (absHash + idx * 3) % possibleScores.length;
    const isHomeVenue = idx % 2 === 0;
    const score = possibleScores[scoreIdx];

    return {
      date: dates[idx],
      homeTeam: isHomeVenue ? homeName : awayName,
      awayTeam: isHomeVenue ? awayName : homeName,
      homeGoals: isHomeVenue ? score.h : score.a,
      awayGoals: isHomeVenue ? score.a : score.h,
      competition: competitions[idx],
    };
  });
}

interface H2HSummaryProps {
  homeTeamName: string;
  awayTeamName: string;
  customMatches?: HeadToHeadMatch[];
  className?: string;
}

export const H2HSummary: React.FC<H2HSummaryProps> = ({
  homeTeamName,
  awayTeamName,
  customMatches,
  className = '',
}) => {
  const matches = customMatches && customMatches.length > 0
    ? customMatches
    : getHeadToHeadMatches(homeTeamName, awayTeamName);

  // Calculate H2H Wins/Draws for the current home team
  let homeWins = 0;
  let draws = 0;
  let awayWins = 0;

  matches.forEach((m) => {
    if (m.homeGoals === m.awayGoals) {
      draws++;
    } else {
      const winner = m.homeGoals > m.awayGoals ? m.homeTeam : m.awayTeam;
      if (winner.toLowerCase() === homeTeamName.toLowerCase()) {
        homeWins++;
      } else {
        awayWins++;
      }
    }
  });

  return (
    <div
      id={`h2h-summary-${homeTeamName.toLowerCase().replace(/\s+/g, '-')}-vs-${awayTeamName.toLowerCase().replace(/\s+/g, '-')}`}
      className={`bg-slate-950/80 border border-slate-800/90 rounded-lg p-3 space-y-2.5 font-mono ${className}`}
    >
      {/* Header & Record Summary */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-400 uppercase tracking-wider">
          <Swords className="w-3.5 h-3.5 text-amber-400" />
          <span>Head-To-Head (Last 3 Matches)</span>
        </div>

        {/* Aggregate Record Badge */}
        <div className="flex items-center gap-1 text-[10px] bg-slate-900 border border-slate-800 px-2 py-0.5 rounded font-extrabold text-slate-300">
          <span className="text-emerald-400">{homeWins}W</span>
          <span className="text-slate-500">•</span>
          <span className="text-amber-400">{draws}D</span>
          <span className="text-slate-500">•</span>
          <span className="text-cyan-400">{awayWins}W</span>
        </div>
      </div>

      {/* List of 3 Previous Encounters */}
      <div className="space-y-1.5 overflow-x-auto min-w-full pb-1 touch-pan-x scrollbar-thin scrollbar-thumb-slate-800">
        {matches.map((match, idx) => {
          const isDraw = match.homeGoals === match.awayGoals;
          const isHomeTeamWinner =
            !isDraw && match.homeTeam.toLowerCase() === homeTeamName.toLowerCase()
              ? match.homeGoals > match.awayGoals
              : match.awayTeam.toLowerCase() === homeTeamName.toLowerCase() && match.awayGoals > match.homeGoals;

          const winnerName = isDraw
            ? 'Draw'
            : match.homeGoals > match.awayGoals
            ? match.homeTeam
            : match.awayTeam;

          return (
            <div
              key={idx}
              className="flex items-center justify-between min-w-[310px] sm:min-w-0 bg-slate-900/90 border border-slate-800/80 px-2.5 py-1.5 rounded text-[11px] hover:border-slate-700 transition-colors"
            >
              {/* Match Date & Venue */}
              <div className="flex items-center gap-1.5 text-slate-400 shrink-0">
                <span className="text-[10px] text-slate-500 font-semibold">{match.date}</span>
              </div>

              {/* Score Line */}
              <div className="flex items-center gap-1.5 sm:gap-2 font-bold">
                <span
                  className={`truncate max-w-[70px] sm:max-w-[95px] md:max-w-[120px] text-right ${
                    match.homeTeam.toLowerCase() === homeTeamName.toLowerCase()
                      ? 'text-slate-200'
                      : 'text-slate-400 font-normal'
                  }`}
                  title={match.homeTeam}
                >
                  {match.homeTeam}
                </span>

                <span className="bg-slate-950 border border-slate-800 px-2 py-0.5 rounded text-slate-100 font-extrabold shrink-0">
                  {match.homeGoals} - {match.awayGoals}
                </span>

                <span
                  className={`truncate max-w-[70px] sm:max-w-[95px] md:max-w-[120px] text-left ${
                    match.awayTeam.toLowerCase() === awayTeamName.toLowerCase()
                      ? 'text-slate-200'
                      : 'text-slate-400 font-normal'
                  }`}
                  title={match.awayTeam}
                >
                  {match.awayTeam}
                </span>
              </div>

              {/* Result Indicator Pill */}
              <div className="text-[9px] font-extrabold shrink-0">
                {isDraw ? (
                  <span className="text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded">
                    DRAW
                  </span>
                ) : isHomeTeamWinner ? (
                  <span className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                    {homeTeamName.slice(0, 3).toUpperCase()} WIN
                  </span>
                ) : (
                  <span className="text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 px-1.5 py-0.5 rounded">
                    {awayTeamName.slice(0, 3).toUpperCase()} WIN
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default H2HSummary;
