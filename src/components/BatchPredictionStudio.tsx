import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Layers,
  Upload,
  Play,
  Download,
  FileCode,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  RefreshCw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Table,
  Check,
  TrendingUp,
  ArrowRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ShieldAlert,
  BrainCircuit,
  Grid,
  Zap,
  Copy,
  Info,
  DollarSign
} from 'lucide-react';
import {
  Team,
  PredictionResult,
  BatchFixtureInput,
  BatchFixturePrediction,
  LeagueAdaptationParams,
  MachineLearningModelConfig,
} from '../types';
import { TEAMS_DATABASE } from '../data/teams';
import { predictDixonColes } from '../utils/dixonColes';
import { predictHybridModel, DEFAULT_LEAGUE_PRESETS } from '../utils/machineLearningModel';
import { DixonColesConfidenceBadge } from './DixonColesConfidenceBadge';

interface BatchPredictionStudioProps {
  currentLeagueParams?: LeagueAdaptationParams;
  modelConfig?: MachineLearningModelConfig;
  className?: string;
}

const ALL_TEAMS: Team[] = Object.values(TEAMS_DATABASE).flat();

function findTeamByName(query: string, defaultLeague = 'Premier League'): Team {
  const q = query.trim().toLowerCase();
  if (!q) {
    const fallbackList = TEAMS_DATABASE[defaultLeague] || TEAMS_DATABASE['Premier League'] || ALL_TEAMS;
    return fallbackList[0];
  }

  const aliasMap: Record<string, string> = {
    'man city': 'Manchester City',
    mancity: 'Manchester City',
    'man utd': 'Manchester United',
    'man united': 'Manchester United',
    manutd: 'Manchester United',
    spurs: 'Tottenham Hotspur',
    tottenham: 'Tottenham Hotspur',
    barca: 'Barcelona',
    real: 'Real Madrid',
    atletico: 'Atletico Madrid',
    atleti: 'Atletico Madrid',
    inter: 'Inter Milan',
    'inter milan': 'Inter Milan',
    'ac milan': 'AC Milan',
    milan: 'AC Milan',
    bayern: 'Bayern Munich',
    bvb: 'Borussia Dortmund',
    dortmund: 'Borussia Dortmund',
    leverkusen: 'Bayer Leverkusen',
    psg: 'Paris Saint-Germain',
    paris: 'Paris Saint-Germain',
    juve: 'Juventus',
    wolves: 'Wolverhampton Wanderers',
    wolverhampton: 'Wolverhampton Wanderers',
    villa: 'Aston Villa',
    'west ham': 'West Ham United',
    brighton: 'Brighton & Hove Albion',
  };

  const targetName = aliasMap[q] || q;

  // 1. Exact match
  const exact = ALL_TEAMS.find((t) => t.name.toLowerCase() === targetName);
  if (exact) return exact;

  // 2. Contains match
  const contains = ALL_TEAMS.find(
    (t) => t.name.toLowerCase().includes(targetName) || targetName.includes(t.name.toLowerCase())
  );
  if (contains) return contains;

  // 3. Fallback Team if unknown
  return {
    id: `custom_${q.replace(/\s+/g, '_')}`,
    name: query.trim(),
    league: defaultLeague,
    elo: 1650,
    attackStrength: 1.1,
    defenseStrength: 0.95,
    homeAttack: 1.15,
    homeDefense: 0.9,
    awayAttack: 1.05,
    awayDefense: 1.0,
    xGPerGame: 1.5,
    recentForm: ['W', 'D', 'W', 'L', 'D'],
  };
}

/**
 * Checks if a team query matches an existing team in TEAMS_DATABASE (exact or via alias)
 */
function checkTeamExists(query: string): { exists: boolean; matchedTeam?: Team; query: string } {
  const q = query.trim().toLowerCase();
  if (!q) return { exists: false, query };

  const aliasMap: Record<string, string> = {
    'man city': 'Manchester City',
    mancity: 'Manchester City',
    'man utd': 'Manchester United',
    'man united': 'Manchester United',
    manutd: 'Manchester United',
    spurs: 'Tottenham Hotspur',
    tottenham: 'Tottenham Hotspur',
    barca: 'Barcelona',
    real: 'Real Madrid',
    atletico: 'Atletico Madrid',
    atleti: 'Atletico Madrid',
    inter: 'Inter Milan',
    'inter milan': 'Inter Milan',
    'ac milan': 'AC Milan',
    milan: 'AC Milan',
    bayern: 'Bayern Munich',
    bvb: 'Borussia Dortmund',
    dortmund: 'Borussia Dortmund',
    leverkusen: 'Bayer Leverkusen',
    psg: 'Paris Saint-Germain',
    paris: 'Paris Saint-Germain',
    juve: 'Juventus',
    wolves: 'Wolverhampton Wanderers',
    wolverhampton: 'Wolverhampton Wanderers',
    villa: 'Aston Villa',
    'west ham': 'West Ham United',
    brighton: 'Brighton & Hove Albion',
  };

  const targetName = aliasMap[q] || q;

  const exact = ALL_TEAMS.find((t) => t.name.toLowerCase() === targetName);
  if (exact) return { exists: true, matchedTeam: exact, query };

  const contains = ALL_TEAMS.find(
    (t) => t.name.toLowerCase().includes(targetName) || targetName.includes(t.name.toLowerCase())
  );
  if (contains) return { exists: true, matchedTeam: contains, query };

  return { exists: false, query };
}

function parseRawFixturesText(text: string): BatchFixtureInput[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#'));

  const result: BatchFixtureInput[] = [];

  lines.forEach((line, index) => {
    let parts: string[] = [];
    if (/\s+vs\.?\s+/i.test(line)) {
      parts = line.split(/\s+vs\.?\s+/i);
    } else if (/\s+v\.?\s+/i.test(line)) {
      parts = line.split(/\s+v\.?\s+/i);
    } else if (line.includes(',')) {
      parts = line.split(',');
    } else if (line.includes(' - ')) {
      parts = line.split(' - ');
    }

    if (parts.length >= 2) {
      result.push({
        id: `fix_${index}_${Date.now()}`,
        homeTeamName: parts[0].trim(),
        awayTeamName: parts[1].trim(),
        rawInput: line,
      });
    }
  });

  return result;
}

const PRESET_BATCHES = [
  {
    name: 'Premier League Matchday',
    badge: '6 FIXTURES',
    fixturesText: `Arsenal vs Chelsea
Liverpool vs Manchester City
Tottenham Hotspur vs Manchester United
Aston Villa vs Newcastle United
Brighton vs West Ham United
Everton vs Wolverhampton`,
  },
  {
    name: 'European Derby Weekend',
    badge: '4 FIXTURES',
    fixturesText: `Real Madrid vs Barcelona
Inter Milan vs AC Milan
Bayern Munich vs Borussia Dortmund
Paris Saint-Germain vs Marseille`,
  },
  {
    name: 'UEFA Champions League Select',
    badge: '4 FIXTURES',
    fixturesText: `Real Madrid vs Manchester City
Arsenal vs Bayern Munich
Barcelona vs Paris Saint-Germain
Atletico Madrid vs Borussia Dortmund`,
  },
];

export const BatchPredictionStudio: React.FC<BatchPredictionStudioProps> = ({
  currentLeagueParams = DEFAULT_LEAGUE_PRESETS['Premier League'],
  modelConfig = {
    architecture: 'hybrid_ensemble',
    learningRate: 0.05,
    numberOfTrees: 100,
    maxDepth: 4,
    regularizationL2: 0.01,
    trainSplitRatio: 0.7,
    featureWeights: {
      eloDelta: 1.2,
      xgForm: 1.0,
      attackDefenseRatio: 1.1,
      recentPoints: 0.8,
      restFatigue: 0.5,
      h2hDominance: 0.7,
      oddsMovement: 0.9,
    },
  },
  className = '',
}) => {
  const [modelType, setModelType] = useState<'dixon_coles' | 'hybrid'>('dixon_coles');
  const [rawText, setRawText] = useState<string>(PRESET_BATCHES[0].fixturesText);
  const [predictions, setPredictions] = useState<BatchFixturePrediction[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showValidationInspector, setShowValidationInspector] = useState<boolean>(false);

  // Real-Time Team Validation Computation
  const validationSummary = useMemo(() => {
    const parsedInputs = parseRawFixturesText(rawText);
    if (parsedInputs.length === 0) {
      return {
        parsedFixturesCount: 0,
        totalTeamsCount: 0,
        matchedTeamsCount: 0,
        unrecognizedTeams: [] as string[],
        items: [],
        allTeamsMatched: false,
        validationStatus: 'EMPTY' as const,
      };
    }

    const items: Array<{
      id: string;
      rawInput: string;
      homeInput: string;
      awayInput: string;
      homeCheck: { exists: boolean; matchedTeam?: Team; query: string };
      awayCheck: { exists: boolean; matchedTeam?: Team; query: string };
      isValidFixture: boolean;
    }> = [];

    const unrecognizedSet = new Set<string>();
    let matchedTeamsCount = 0;

    parsedInputs.forEach((item) => {
      const homeCheck = checkTeamExists(item.homeTeamName);
      const awayCheck = checkTeamExists(item.awayTeamName);

      if (homeCheck.exists) matchedTeamsCount++;
      else if (item.homeTeamName.trim()) unrecognizedSet.add(item.homeTeamName.trim());

      if (awayCheck.exists) matchedTeamsCount++;
      else if (item.awayTeamName.trim()) unrecognizedSet.add(item.awayTeamName.trim());

      items.push({
        id: item.id,
        rawInput: item.rawInput || `${item.homeTeamName} vs ${item.awayTeamName}`,
        homeInput: item.homeTeamName,
        awayInput: item.awayTeamName,
        homeCheck,
        awayCheck,
        isValidFixture: homeCheck.exists && awayCheck.exists,
      });
    });

    const totalTeamsCount = parsedInputs.length * 2;
    const unrecognizedTeams = Array.from(unrecognizedSet);
    const allTeamsMatched = unrecognizedTeams.length === 0 && matchedTeamsCount === totalTeamsCount;

    return {
      parsedFixturesCount: parsedInputs.length,
      totalTeamsCount,
      matchedTeamsCount,
      unrecognizedTeams,
      items,
      allTeamsMatched,
      validationStatus: allTeamsMatched ? ('EXCELLENT' as const) : ('WARNING' as const),
    };
  }, [rawText]);

  // Search & Filters State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterOutcome, setFilterOutcome] = useState<'ALL' | 'HOME' | 'DRAW' | 'AWAY'>('ALL');
  const [filterConfidence, setFilterConfidence] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');
  const [filterValueOnly, setFilterValueOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'CONFIDENCE' | 'HOME_PROB' | 'TOTAL_XG' | 'VALUE_EV'>('CONFIDENCE');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Sync to Apps Script feedback
  const [syncStatusMessage, setSyncStatusMessage] = useState<string | null>(null);
  const [isSyncingAppsScript, setIsSyncingAppsScript] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Run initial batch processing on mount or when raw text changes on first render
  useEffect(() => {
    handleRunBatchProcessing();
  }, [modelType]);

  const handleRunBatchProcessing = () => {
    const parsedInputs = parseRawFixturesText(rawText);
    if (parsedInputs.length === 0) return;

    setIsProcessing(true);

    setTimeout(() => {
      const generated: BatchFixturePrediction[] = parsedInputs.map((item) => {
        const homeTeam = findTeamByName(item.homeTeamName);
        const awayTeam = findTeamByName(item.awayTeamName);

        let pred: PredictionResult;
        if (modelType === 'hybrid') {
          const hybrid = predictHybridModel(homeTeam, awayTeam, currentLeagueParams, modelConfig);
          pred = hybrid.hybridFinal;
        } else {
          pred = predictDixonColes(
            homeTeam,
            awayTeam,
            currentLeagueParams.homeAdvantageMultiplier,
            currentLeagueParams.dixonColesRho
          );
        }

        // Determine recommended pick
        let recommendedPick: 'HOME' | 'DRAW' | 'AWAY' = 'HOME';
        if (pred.drawProb > pred.homeWinProb && pred.drawProb > (1 - pred.homeWinProb - pred.drawProb)) {
          recommendedPick = 'DRAW';
        } else if ((1 - pred.homeWinProb - pred.drawProb) > pred.homeWinProb) {
          recommendedPick = 'AWAY';
        }

        // Calculate synthetic value EV %
        const topProb = Math.max(pred.homeWinProb, pred.drawProb, 1 - pred.homeWinProb - pred.drawProb);
        const fairOdds = 1 / topProb;
        const marketMarginOdds = fairOdds * 0.94; // simulated market line
        const valueEdgeEv = Number((((topProb * marketMarginOdds) - 1) * 100).toFixed(1));
        const confidenceScore = pred.confidenceRating ?? Math.min(98, Math.round(topProb * 100 * 1.35));
        const confidenceLevel = pred.confidenceLevel ?? (confidenceScore >= 62 ? 'HIGH' : confidenceScore <= 38 ? 'LOW' : 'MEDIUM');
        const goalDiffStdDev = pred.goalDiffStdDev ?? 1.32;
        const outcomeStdDev = pred.outcomeStdDev ?? 0.12;

        return {
          id: item.id,
          homeTeam,
          awayTeam,
          prediction: pred,
          modelType,
          valueEdgeEv,
          confidenceScore,
          confidenceLevel,
          goalDiffStdDev,
          outcomeStdDev,
          recommendedPick,
        };
      });

      setPredictions(generated);
      setIsProcessing(false);
    }, 300);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setRawText(content);
      }
    };
    reader.readAsText(file);
  };

  const handleExportCSV = () => {
    if (predictions.length === 0) return;

    const headers = [
      'Fixture ID',
      'Home Team',
      'Away Team',
      'Model Type',
      'Home Win Prob %',
      'Draw Prob %',
      'Away Win Prob %',
      'Recommended Pick',
      'Home Expected Goals (xG)',
      'Away Expected Goals (xG)',
      'Top Correct Score',
      'Top Score Prob %',
      'Confidence Score',
    ];

    const rows = predictions.map((p) => {
      const awayProb = Number((1 - p.prediction.homeWinProb - p.prediction.drawProb).toFixed(4));
      const topScore = p.prediction.correctScores?.[0]
        ? `${p.prediction.correctScores[0].homeGoals}-${p.prediction.correctScores[0].awayGoals}`
        : '1-0';
      const topScoreProb = p.prediction.correctScores?.[0]
        ? (p.prediction.correctScores[0].probability * 100).toFixed(1)
        : '0';

      return [
        p.id,
        `"${p.homeTeam.name}"`,
        `"${p.awayTeam.name}"`,
        p.modelType,
        (p.prediction.homeWinProb * 100).toFixed(1),
        (p.prediction.drawProb * 100).toFixed(1),
        (awayProb * 100).toFixed(1),
        p.recommendedPick,
        p.prediction.homeExpectedGoals,
        p.prediction.awayExpectedGoals,
        topScore,
        topScoreProb,
        p.confidenceScore,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `dixon_coles_batch_predictions_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSyncAllToAppsScript = async () => {
    if (predictions.length === 0) return;

    setIsSyncingAppsScript(true);
    setSyncStatusMessage(null);

    let successCount = 0;
    try {
      for (const p of predictions) {
        await fetch('/api/apps-script/export-prediction', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            homeTeam: p.homeTeam,
            awayTeam: p.awayTeam,
            prediction: p.prediction,
            timestamp: new Date().toISOString(),
          }),
        });
        successCount++;
      }
      setSyncStatusMessage(`Successfully synced ${successCount} batch predictions to Google Apps Script Web App!`);
    } catch (err: any) {
      setSyncStatusMessage(`Synced ${successCount}/${predictions.length} fixtures. Error: ${err.message}`);
    } finally {
      setIsSyncingAppsScript(false);
    }
  };

  // Filter and Sort Logic
  const filteredPredictions = predictions
    .filter((p) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesHome = p.homeTeam.name.toLowerCase().includes(q);
        const matchesAway = p.awayTeam.name.toLowerCase().includes(q);
        if (!matchesHome && !matchesAway) return false;
      }
      if (filterOutcome !== 'ALL' && p.recommendedPick !== filterOutcome) {
        return false;
      }
      if (filterConfidence !== 'ALL' && p.confidenceLevel !== filterConfidence) {
        return false;
      }
      if (filterValueOnly && p.valueEdgeEv <= 2.5) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      let diff = 0;
      if (sortBy === 'CONFIDENCE') {
        diff = b.confidenceScore - a.confidenceScore;
      } else if (sortBy === 'HOME_PROB') {
        diff = b.prediction.homeWinProb - a.prediction.homeWinProb;
      } else if (sortBy === 'TOTAL_XG') {
        const totalXgA = a.prediction.homeExpectedGoals + a.prediction.awayExpectedGoals;
        const totalXgB = b.prediction.homeExpectedGoals + b.prediction.awayExpectedGoals;
        diff = totalXgB - totalXgA;
      } else if (sortBy === 'VALUE_EV') {
        diff = b.valueEdgeEv - a.valueEdgeEv;
      }
      return sortOrder === 'desc' ? diff : -diff;
    });

  // Batch Metrics
  const avgHomeWin = predictions.length
    ? Math.round((predictions.reduce((acc, p) => acc + p.prediction.homeWinProb, 0) / predictions.length) * 100)
    : 0;
  const avgDraw = predictions.length
    ? Math.round((predictions.reduce((acc, p) => acc + p.prediction.drawProb, 0) / predictions.length) * 100)
    : 0;
  const avgAwayWin = predictions.length ? 100 - avgHomeWin - avgDraw : 0;
  const topPick = predictions.length
    ? [...predictions].sort((a, b) => b.confidenceScore - a.confidenceScore)[0]
    : null;

  return (
    <div
      id="batch-prediction-studio-panel"
      className={`bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl font-mono space-y-6 ${className}`}
    >
      {/* Panel Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-md">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-100 uppercase tracking-wider">
                Bulk Fixture Dixon-Coles Batch Processor
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 uppercase">
                POISSON SIMULTANEOUS ENGINE
              </span>
            </div>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              Input or upload lists of fixtures to calculate Poisson goal probabilities, 1X2 distributions, correct scores, and Kelly EV across dozens of matches simultaneously.
            </p>
          </div>
        </div>

        {/* Model Selector Toggle */}
        <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 self-start md:self-auto">
          <button
            onClick={() => setModelType('dixon_coles')}
            className={`px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer ${
              modelType === 'dixon_coles'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Dixon-Coles Model
          </button>
          <button
            onClick={() => setModelType('hybrid')}
            className={`px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer ${
              modelType === 'hybrid'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Hybrid Ensemble
          </button>
        </div>
      </div>

      {/* Preset Batches & File Upload Controls */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-slate-400 font-bold uppercase text-[11px] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            Quick-Load Preset Batches:
          </span>

          <div className="flex flex-wrap items-center gap-2">
            {PRESET_BATCHES.map((preset) => (
              <button
                key={preset.name}
                onClick={() => {
                  setRawText(preset.fixturesText);
                  setTimeout(handleRunBatchProcessing, 100);
                }}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 rounded text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <span>{preset.name}</span>
                <span className="bg-indigo-950 text-indigo-400 border border-indigo-500/30 text-[9px] px-1.5 py-0.2 rounded font-black">
                  {preset.badge}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Text Area Input & File Drag/Drop */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label className="text-slate-300 font-bold uppercase text-[10px] flex items-center gap-1">
                Fixture List Input <span className="text-slate-500 font-sans">(One match per line: "Home vs Away")</span>
              </label>

              <button
                onClick={() => setRawText('')}
                className="text-[10px] text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
              >
                Clear Text
              </button>
            </div>

            <textarea
              id="batch-fixture-textarea"
              rows={5}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={`Arsenal vs Chelsea\nLiverpool vs Manchester City\nReal Madrid vs Barcelona`}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-500/50 resize-none leading-relaxed"
            />
          </div>

          {/* Upload Box & Execute Trigger */}
          <div className="flex flex-col justify-between bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-3">
            <div>
              <span className="text-slate-300 font-bold uppercase text-[10px] block mb-2">Upload CSV / Text File</span>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".csv,.txt"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 border border-dashed border-slate-700 hover:border-cyan-500 rounded-lg bg-slate-900/60 hover:bg-slate-900 text-slate-300 hover:text-cyan-400 text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 group"
              >
                <Upload className="w-5 h-5 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                <span>Upload CSV / TXT Fixture File</span>
                <span className="text-[10px] text-slate-500 font-sans font-normal">Supports "Team A vs Team B" format</span>
              </button>
            </div>

            <button
              id="btn-execute-batch-predictions"
              onClick={handleRunBatchProcessing}
              disabled={isProcessing || !rawText.trim()}
              className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-lg transition-all shadow-lg shadow-cyan-950/50 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Play className={`w-4 h-4 fill-slate-950 ${isProcessing ? 'animate-spin' : ''}`} />
              <span>{isProcessing ? 'COMPUTING MATRIX...' : 'RUN BULK PREDICTIONS'}</span>
            </button>
          </div>
        </div>

        {/* Real-time Team Validation Step Box */}
        {validationSummary.validationStatus !== 'EMPTY' && (
          <div className={`p-4 rounded-xl border font-mono text-xs shadow-lg space-y-3 transition-all ${
            validationSummary.allTeamsMatched
              ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
              : 'bg-amber-950/20 border-amber-500/30 text-amber-300'
          }`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                {validationSummary.allTeamsMatched ? (
                  <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                ) : (
                  <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm tracking-wide uppercase">
                      {validationSummary.allTeamsMatched
                        ? 'REAL-TIME TEAM VALIDATION: 100% VERIFIED'
                        : `REAL-TIME TEAM VALIDATION: ${validationSummary.matchedTeamsCount}/${validationSummary.totalTeamsCount} TEAMS MATCHED`}
                    </span>

                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${
                      validationSummary.allTeamsMatched
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                        : 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                    }`}>
                      {validationSummary.allTeamsMatched ? 'PASSED' : 'FALLBACK WARNING'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 font-sans mt-0.5">
                    {validationSummary.allTeamsMatched
                      ? `All ${validationSummary.parsedFixturesCount} fixture(s) (${validationSummary.totalTeamsCount} teams) verified in TEAMS_DATABASE with full Elo, xG & attack/defense indices.`
                      : `${validationSummary.unrecognizedTeams.length} team(s) not found in TEAMS_DATABASE. Unrecognized teams will use fallback baseline parameters (Elo 1650, xG 1.5).`}
                  </p>
                </div>
              </div>

              {/* Toggle Inspector Button */}
              <button
                id="btn-toggle-team-validation-inspector"
                onClick={() => setShowValidationInspector(!showValidationInspector)}
                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <span>{showValidationInspector ? 'Hide Inspector' : 'Inspect Team Matches'}</span>
                {showValidationInspector ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {/* Unrecognized Team Warning Badges */}
            {!validationSummary.allTeamsMatched && validationSummary.unrecognizedTeams.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-amber-500/20">
                <span className="text-[11px] text-amber-400 font-bold uppercase flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" /> Unregistered Teams in DB:
                </span>
                {validationSummary.unrecognizedTeams.map((teamName, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded bg-rose-950/60 border border-rose-500/40 text-rose-300 text-[11px] font-bold flex items-center gap-1"
                  >
                    <span>⚠️ "{teamName}"</span>
                    <span className="text-[9px] text-slate-400 font-sans">(using fallback parameters)</span>
                  </span>
                ))}
              </div>
            )}

            {/* Live Validation Fixtures Table Inspector */}
            {showValidationInspector && (
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">
                  Parsed Fixtures Real-Time Match Inspector ({validationSummary.items.length} Fixtures):
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                  {validationSummary.items.map((fixture) => (
                    <div
                      key={fixture.id}
                      className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {/* Home Team Badge */}
                        <div className={`px-2 py-1 rounded border text-[11px] font-bold truncate flex items-center gap-1 ${
                          fixture.homeCheck.exists
                            ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                            : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
                        }`}>
                          {fixture.homeCheck.exists ? (
                            <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                          ) : (
                            <AlertCircle className="w-3 h-3 text-rose-400 shrink-0" />
                          )}
                          <span className="truncate">{fixture.homeCheck.matchedTeam?.name || fixture.homeInput}</span>
                          {fixture.homeCheck.matchedTeam && (
                            <span className="text-[9px] text-slate-500 font-mono">({fixture.homeCheck.matchedTeam.league})</span>
                          )}
                        </div>

                        <span className="text-slate-500 text-[10px] font-bold shrink-0">VS</span>

                        {/* Away Team Badge */}
                        <div className={`px-2 py-1 rounded border text-[11px] font-bold truncate flex items-center gap-1 ${
                          fixture.awayCheck.exists
                            ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                            : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
                        }`}>
                          {fixture.awayCheck.exists ? (
                            <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                          ) : (
                            <AlertCircle className="w-3 h-3 text-rose-400 shrink-0" />
                          )}
                          <span className="truncate">{fixture.awayCheck.matchedTeam?.name || fixture.awayInput}</span>
                          {fixture.awayCheck.matchedTeam && (
                            <span className="text-[9px] text-slate-500 font-mono">({fixture.awayCheck.matchedTeam.league})</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Batch Summary Stats Bar */}
      {predictions.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 font-mono text-xs">
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
            <span className="text-slate-500 uppercase block text-[10px]">PROCESSED FIXTURES</span>
            <span className="text-lg font-bold text-slate-100">{predictions.length} Matches</span>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
            <span className="text-slate-500 uppercase block text-[10px]">AVG 1X2 DISTRIBUTION</span>
            <div className="flex items-center justify-between text-xs font-bold mt-1">
              <span className="text-cyan-400">H: {avgHomeWin}%</span>
              <span className="text-slate-400">D: {avgDraw}%</span>
              <span className="text-purple-400">A: {avgAwayWin}%</span>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
            <span className="text-slate-500 uppercase block text-[10px]">TOP CONFIDENCE PICK</span>
            <span className="text-xs font-bold text-emerald-400 truncate block mt-1">
              {topPick ? `${topPick.homeTeam.name} vs ${topPick.awayTeam.name}` : 'N/A'}
            </span>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
            <span className="text-slate-500 uppercase block text-[10px]">ACTIVE ENGINE</span>
            <span className="text-xs font-bold text-cyan-400 uppercase block mt-1">
              {modelType === 'dixon_coles' ? 'Dixon-Coles Poisson' : 'Hybrid Neural Net'}
            </span>
          </div>

          <div className="col-span-2 sm:col-span-4 lg:col-span-1 bg-slate-950 border border-slate-800 rounded-lg p-2.5 flex items-center justify-between gap-2">
            <button
              onClick={handleExportCSV}
              className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-slate-700 font-bold text-xs rounded transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={handleSyncAllToAppsScript}
              disabled={isSyncingAppsScript}
              className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <Table className="w-3.5 h-3.5" />
              <span>{isSyncingAppsScript ? 'Syncing...' : 'Sync to Apps Script'}</span>
            </button>
          </div>
        </div>
      )}

      {syncStatusMessage && (
        <div className="p-3 bg-indigo-950/60 border border-indigo-500/40 rounded-lg text-xs text-indigo-300 font-sans flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{syncStatusMessage}</span>
        </div>
      )}

      {/* Filter, Search & Sort Controls Bar */}
      {predictions.length > 0 && (
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 bg-slate-950 p-3 rounded-lg border border-slate-800">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search team name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded pl-9 pr-3 py-1.5 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Outcome Filter Buttons */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded border border-slate-800 shrink-0">
            <span className="text-[10px] text-slate-500 font-bold uppercase px-1">PICK:</span>
            {(['ALL', 'HOME', 'DRAW', 'AWAY'] as const).map((outcome) => (
              <button
                key={outcome}
                onClick={() => setFilterOutcome(outcome)}
                className={`px-2.5 py-1 text-[11px] font-bold rounded cursor-pointer transition-colors ${
                  filterOutcome === outcome
                    ? 'bg-cyan-500 text-slate-950'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {outcome}
              </button>
            ))}
          </div>

          {/* Confidence Filter Buttons */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded border border-slate-800 shrink-0">
            <span className="text-[10px] text-slate-500 font-bold uppercase px-1">CONF:</span>
            {(['ALL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((conf) => (
              <button
                key={conf}
                onClick={() => setFilterConfidence(conf)}
                className={`px-2 py-1 text-[10px] font-bold rounded cursor-pointer transition-colors ${
                  filterConfidence === conf
                    ? 'bg-purple-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {conf}
              </button>
            ))}
          </div>

          {/* Sort By Quick Buttons & Order Toggle */}
          <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded border border-slate-800 shrink-0">
            <span className="text-[10px] text-slate-500 font-bold uppercase px-1 flex items-center gap-1">
              <ArrowUpDown className="w-3 h-3 text-cyan-400" />
              RANK:
            </span>

            <button
              id="btn-sort-confidence"
              onClick={() => {
                if (sortBy === 'CONFIDENCE') {
                  setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
                } else {
                  setSortBy('CONFIDENCE');
                  setSortOrder('desc');
                }
              }}
              className={`px-2.5 py-1 text-[11px] font-bold rounded cursor-pointer transition-colors flex items-center gap-1 ${
                sortBy === 'CONFIDENCE'
                  ? 'bg-cyan-500 text-slate-950 font-black shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>Confidence</span>
              {sortBy === 'CONFIDENCE' && (
                <span className="text-[10px] font-black">{sortOrder === 'desc' ? '↓' : '↑'}</span>
              )}
            </button>

            <button
              id="btn-sort-home-prob"
              onClick={() => {
                if (sortBy === 'HOME_PROB') {
                  setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
                } else {
                  setSortBy('HOME_PROB');
                  setSortOrder('desc');
                }
              }}
              className={`px-2.5 py-1 text-[11px] font-bold rounded cursor-pointer transition-colors flex items-center gap-1 ${
                sortBy === 'HOME_PROB'
                  ? 'bg-cyan-500 text-slate-950 font-black shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>Home Win %</span>
              {sortBy === 'HOME_PROB' && (
                <span className="text-[10px] font-black">{sortOrder === 'desc' ? '↓' : '↑'}</span>
              )}
            </button>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded px-2 py-1 focus:outline-none cursor-pointer"
            >
              <option value="CONFIDENCE">Confidence Score</option>
              <option value="HOME_PROB">Home Win Probability</option>
              <option value="TOTAL_XG">Total Expected Goals</option>
              <option value="VALUE_EV">Kelly EV %</option>
            </select>

            <button
              id="btn-toggle-sort-direction"
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-colors cursor-pointer flex items-center justify-center shrink-0"
              title={`Switch to ${sortOrder === 'desc' ? 'Ascending (Lowest First)' : 'Descending (Highest First)'}`}
            >
              {sortOrder === 'desc' ? <ArrowDown className="w-3.5 h-3.5 text-cyan-400" /> : <ArrowUp className="w-3.5 h-3.5 text-emerald-400" />}
            </button>
          </div>
        </div>
      )}

      {/* Fixtures Table Header Bar with Clickable Columns */}
      {predictions.length > 0 && (
        <div className="hidden lg:flex items-center justify-between gap-3 bg-slate-950/80 px-4 py-2.5 rounded-lg border border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          <div className="flex items-center gap-3">
            <span className="w-8 text-center text-cyan-400"># RANK</span>
            <span className="w-20 text-center">PICK</span>
            <span>FIXTURE & TEAM STRENGTH</span>
          </div>

          <div className="flex items-center gap-6">
            <button
              onClick={() => {
                if (sortBy === 'HOME_PROB') setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
                else { setSortBy('HOME_PROB'); setSortOrder('desc'); }
              }}
              className={`flex items-center gap-1 cursor-pointer transition-colors px-2 py-1 rounded ${
                sortBy === 'HOME_PROB' ? 'text-cyan-400 font-extrabold bg-cyan-950/60 border border-cyan-500/30' : 'hover:text-slate-200'
              }`}
            >
              <span>1X2 Win Probabilities</span>
              {sortBy === 'HOME_PROB' && (sortOrder === 'desc' ? <ArrowDown className="w-3 h-3 text-cyan-400" /> : <ArrowUp className="w-3 h-3 text-emerald-400" />)}
            </button>

            <button
              onClick={() => {
                if (sortBy === 'CONFIDENCE') setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
                else { setSortBy('CONFIDENCE'); setSortOrder('desc'); }
              }}
              className={`flex items-center gap-1 cursor-pointer transition-colors px-2 py-1 rounded ${
                sortBy === 'CONFIDENCE' ? 'text-cyan-400 font-extrabold bg-cyan-950/60 border border-cyan-500/30' : 'hover:text-slate-200'
              }`}
            >
              <span>Confidence Rating</span>
              {sortBy === 'CONFIDENCE' && (sortOrder === 'desc' ? <ArrowDown className="w-3 h-3 text-cyan-400" /> : <ArrowUp className="w-3 h-3 text-emerald-400" />)}
            </button>

            <span className="w-20 text-right">ACTION</span>
          </div>
        </div>
      )}

      {/* Fixtures Predictions Cards / List */}
      <div className="space-y-3">
        {filteredPredictions.map((item, index) => {
          const isExpanded = expandedId === item.id;
          const awayWinProb = Number((1 - item.prediction.homeWinProb - item.prediction.drawProb).toFixed(4));
          const topScore = item.prediction.correctScores?.[0];

          return (
            <div
              key={item.id}
              className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl p-4 transition-all space-y-3"
            >
              {/* Fixture Summary Row */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                {/* Rank Index & Match Teams Title */}
                <div className="flex items-center gap-3">
                  <span className="px-2 py-1 rounded text-xs font-black bg-slate-900 text-cyan-400 border border-slate-800 font-mono shrink-0">
                    #{index + 1}
                  </span>

                  <div className="text-center min-w-[70px]">
                    <span className="text-[10px] text-slate-500 block uppercase font-mono">MODEL PICK</span>
                    <span
                      className={`text-xs font-black px-2 py-0.5 rounded border inline-block mt-0.5 ${
                        item.recommendedPick === 'HOME'
                          ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                          : item.recommendedPick === 'DRAW'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                      }`}
                    >
                      {item.recommendedPick === 'HOME'
                        ? 'HOME WIN'
                        : item.recommendedPick === 'DRAW'
                        ? 'DRAW'
                        : 'AWAY WIN'}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                        <span>{item.homeTeam.name}</span>
                        <span className="text-xs text-slate-500 font-sans">vs</span>
                        <span>{item.awayTeam.name}</span>
                      </h4>

                      <DixonColesConfidenceBadge
                        confidenceLevel={item.confidenceLevel}
                        confidenceRating={item.confidenceScore}
                        goalDiffStdDev={item.goalDiffStdDev}
                        outcomeStdDev={item.outcomeStdDev}
                        size="sm"
                      />
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5 font-sans">
                      <span>Elo: <strong className="text-slate-300">{item.homeTeam.elo}</strong> vs <strong className="text-slate-300">{item.awayTeam.elo}</strong></span>
                      <span>•</span>
                      <span>Expected Goals: <strong className="text-emerald-400">{item.prediction.homeExpectedGoals} - {item.prediction.awayExpectedGoals}</strong></span>
                    </div>
                  </div>
                </div>

                {/* 1X2 Probabilities Bar */}
                <div className="flex items-center gap-2 min-w-[280px]">
                  <div className={`flex-1 bg-slate-900 border rounded p-2 text-center transition-all ${
                    sortBy === 'HOME_PROB' ? 'border-cyan-500/80 bg-cyan-950/30 ring-1 ring-cyan-500/40' : 'border-slate-800'
                  }`}>
                    <span className="text-[9px] text-slate-500 block uppercase">HOME</span>
                    <span className="text-xs font-bold text-cyan-400">
                      {Math.round(item.prediction.homeWinProb * 100)}%
                    </span>
                  </div>

                  <div className="flex-1 bg-slate-900 border border-slate-800 rounded p-2 text-center">
                    <span className="text-[9px] text-slate-500 block uppercase">DRAW</span>
                    <span className="text-xs font-bold text-amber-400">
                      {Math.round(item.prediction.drawProb * 100)}%
                    </span>
                  </div>

                  <div className="flex-1 bg-slate-900 border border-slate-800 rounded p-2 text-center">
                    <span className="text-[9px] text-slate-500 block uppercase">AWAY</span>
                    <span className="text-xs font-bold text-purple-400">
                      {Math.round(awayWinProb * 100)}%
                    </span>
                  </div>
                </div>

                {/* Top Score & Action */}
                <div className="flex items-center justify-between md:justify-end gap-3 border-t md:border-t-0 pt-2 md:pt-0 border-slate-800">
                  <div className="text-right">
                    <span className="text-[9px] text-slate-500 block uppercase">TOP SCORE</span>
                    <span className="text-xs font-bold text-emerald-400">
                      {topScore ? `${topScore.homeGoals}-${topScore.awayGoals}` : '1-0'} (@{(1 / (topScore?.probability || 0.12)).toFixed(2)})
                    </span>
                  </div>

                  <button
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                    title="Toggle match breakdown details"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Expanded Details Panel */}
              {isExpanded && (
                <div className="pt-3 border-t border-slate-800 space-y-3 font-mono text-xs">
                  {/* Model Visual Confidence Indicator */}
                  <DixonColesConfidenceBadge
                    confidenceLevel={item.confidenceLevel}
                    confidenceRating={item.confidenceScore}
                    goalDiffStdDev={item.goalDiffStdDev}
                    totalGoalsStdDev={item.prediction.totalGoalsStdDev}
                    outcomeStdDev={item.outcomeStdDev}
                    showStdDevDetails={true}
                    size="md"
                  />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                    {/* Fair Odds Table */}
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">
                        FAIR ODDS (ZERO MARGIN)
                      </span>
                      <div className="space-y-1 text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Home Win:</span>
                          <span className="text-cyan-400 font-bold">@{(1 / item.prediction.homeWinProb).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Draw:</span>
                          <span className="text-amber-400 font-bold">@{(1 / item.prediction.drawProb).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Away Win:</span>
                          <span className="text-purple-400 font-bold">@{(1 / awayWinProb).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Poisson Goal Matrix Parameters */}
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">
                        POISSON MATRIX PARAMETERS
                      </span>
                      <div className="space-y-1 text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Lambda λ (Home xG):</span>
                          <span className="text-slate-200 font-bold">{item.prediction.homeExpectedGoals}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Mu μ (Away xG):</span>
                          <span className="text-slate-200 font-bold">{item.prediction.awayExpectedGoals}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Dixon-Coles ρ:</span>
                          <span className="text-purple-400 font-bold">{currentLeagueParams.dixonColesRho}</span>
                        </div>
                      </div>
                    </div>

                    {/* Top 3 Scoreline Probabilities */}
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">
                        TOP SCORE PROBABILITIES
                      </span>
                      <div className="space-y-1 text-[11px]">
                        {item.prediction.correctScores?.slice(0, 3).map((cs, idx) => (
                          <div key={idx} className="flex justify-between">
                            <span className="text-slate-300 font-bold">{cs.homeGoals} - {cs.awayGoals}:</span>
                            <span className="text-emerald-400 font-bold">
                              {(cs.probability * 100).toFixed(1)}% (@{(1 / cs.probability).toFixed(2)})
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredPredictions.length === 0 && predictions.length > 0 && (
          <div className="text-center py-8 text-slate-500 font-sans text-xs">
            No fixtures match your search query or active filter criteria.
          </div>
        )}
      </div>
    </div>
  );
};

export default BatchPredictionStudio;
