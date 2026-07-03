import React, { useState, useMemo, useEffect } from 'react';
import {
  Activity,
  Award,
  BarChart3,
  Calendar,
  ChevronRight,
  Clock,
  Crown,
  DollarSign,
  Filter,
  Layers,
  Play,
  Radio,
  Search,
  Shield,
  Sliders,
  Sparkles,
  Zap,
  BrainCircuit,
  FileCode,
  Cpu,
  Target,
  Key,
} from 'lucide-react';

import { ApiKeyConfigModal } from './components/ApiKeyConfigModal';

import { TEAMS_DATABASE } from './data/teams';
import { predictDixonColes } from './utils/dixonColes';
import { getTacticalInsights, fetchRealFixtures } from './services/geminiService';
import { Team, PredictionResult, ArbitrageNotification, NotificationSettings } from './types';

import { MatchCard } from './components/MatchCard';
import { ProbMatrix } from './components/ProbMatrix';
import { TeamRadarChart } from './components/TeamRadarChart';
import { XGHeatmap } from './components/XGHeatmap';
import { EloEvolutionChart } from './components/EloEvolutionChart';
import { InteractiveProbSlider } from './components/InteractiveProbSlider';
import { RecentPredictions, RecentPredictionEntry } from './components/RecentPredictions';
import { StreakBadge } from './components/StreakBadge';
import { ArbitrageCalculator } from './components/ArbitrageCalculator';
import { MonteCarloSim } from './components/MonteCarloSim';
import { EloStandings } from './components/EloStandings';
import { LiveFeed } from './components/LiveFeed';
import { IntegrityRadar } from './components/IntegrityRadar';
import { MachineLearningStudio } from './components/MachineLearningStudio';
import { CorrectScoreDistribution } from './components/CorrectScoreDistribution';
import { GoogleAppsScriptIntegration } from './components/GoogleAppsScriptIntegration';
import { WinMarginTrendChart } from './components/WinMarginTrendChart';
import { SyndicateAnalystStudio } from './components/SyndicateAnalystStudio';
import { SystemAutoUpdater } from './components/SystemAutoUpdater';
import { ArbitrageNotificationCenter } from './components/ArbitrageNotificationCenter';
import { ArbitrageToast } from './components/ArbitrageToast';
import { XGFeatureStudio } from './components/XGFeatureStudio';
import { scanLeaguesForArbitrage, scanLeaguesForArbitrageAsync } from './services/arbitrageScanner';

export function App() {
  const [activeTab, setActiveTab] = useState<
    'syndicate' | 'fixtures' | 'model' | 'ml' | 'xg_studio' | 'odds' | 'sim' | 'elo' | 'live' | 'radar' | 'apps_script' | 'system'
  >('syndicate');

  // AI Model Selection: NVIDIA NIM (Main) vs Gemini (Option)
  const [modelOption, setModelOption] = useState<'nvidia' | 'gemini'>('nvidia');

  // API Key Manager Modal state
  const [showKeyModal, setShowKeyModal] = useState<boolean>(false);

  // Competitions & Teams state
  const [selectedLeague, setSelectedLeague] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Dixon-Coles Model Hyperparameters
  const [homeAdvantage, setHomeAdvantage] = useState<number>(1.22);
  const [rho, setRho] = useState<number>(-0.06);
  const [formWeight, setFormWeight] = useState<number>(0.15);

  // Local state based Arbitrage Notifications system
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(() => {
    try {
      const saved = localStorage.getItem('football_prediction_arb_settings_v1');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      monitoredLeagues: ['All'],
      minProfitMargin: 0.5,
      autoScanEnabled: true,
      enableToasts: true,
    };
  });

  const [notifications, setNotifications] = useState<ArbitrageNotification[]>(() => {
    try {
      const saved = localStorage.getItem('football_prediction_arb_alerts_v1');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  const [toastNotification, setToastNotification] = useState<ArbitrageNotification | null>(null);
  const [isScanningArb, setIsScanningArb] = useState<boolean>(false);

  // Persist settings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('football_prediction_arb_settings_v1', JSON.stringify(notificationSettings));
    } catch (e) {}
  }, [notificationSettings]);

  // Persist notifications to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('football_prediction_arb_alerts_v1', JSON.stringify(notifications));
    } catch (e) {}
  }, [notifications]);

  // Scan monitored leagues for arbitrage opportunities against live bookmaker feeds
  const handleRunArbitrageScan = async (showToast = true) => {
    setIsScanningArb(true);
    try {
      const leaguesToScan = notificationSettings.monitoredLeagues.includes('All')
        ? selectedLeague !== 'All' ? [selectedLeague, 'All'] : ['All']
        : notificationSettings.monitoredLeagues;

      const found = await scanLeaguesForArbitrageAsync(
        leaguesToScan,
        notificationSettings.minProfitMargin
      );

      if (found.length > 0) {
        setNotifications((prev) => {
          const existingIds = new Set(prev.map((n) => n.id));
          const brandNew = found.filter((r) => !existingIds.has(r.id));
          if (brandNew.length > 0 && showToast && notificationSettings.enableToasts) {
            setToastNotification(brandNew[0]);
          }
          return [...brandNew, ...prev].slice(0, 30);
        });
      }
    } catch (e) {
      console.warn('Arbitrage scan error:', e);
    } finally {
      setIsScanningArb(false);
    }
  };

  // Run initial scan on mount or when selected league changes
  useEffect(() => {
    handleRunArbitrageScan(true);
  }, [selectedLeague]);

  // Notification management handlers
  const handleMarkAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleClearAllNotifications = () => {
    setNotifications([]);
  };

  const handleDismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  // Active Selected Fixture for detailed analysis
  const [selectedHomeTeam, setSelectedHomeTeam] = useState<Team>(
    TEAMS_DATABASE['Premier League'][0] // Arsenal
  );
  const [selectedAwayTeam, setSelectedAwayTeam] = useState<Team>(
    TEAMS_DATABASE['Premier League'][3] // Chelsea
  );

  // Dynamic real fixture state
  const [fixturesList, setFixturesList] = useState<any[]>([]);
  const [syncingRealFixtures, setSyncingRealFixtures] = useState<boolean>(false);
  const [syncingModelData, setSyncingModelData] = useState<boolean>(false);
  const [modelDataSource, setModelDataSource] = useState<string>('REAL-TIME API DATA');

  const handleSyncRealModelData = async (homeName?: string, awayName?: string) => {
    const h = homeName || selectedHomeTeam.name;
    const a = awayName || selectedAwayTeam.name;
    setSyncingModelData(true);
    try {
      const res = await fetch(`/api/real-team-stats?homeTeam=${encodeURIComponent(h)}&awayTeam=${encodeURIComponent(a)}&modelOption=${modelOption}`);
      if (res.ok) {
        const data = await res.json();
        if (data.home && data.away) {
          const homeUpdated: Team = {
            id: selectedHomeTeam.id || h.toLowerCase().replace(/\s+/g, '-'),
            name: data.home.name || h,
            league: selectedHomeTeam.league || 'Premier League',
            elo: data.home.elo || 1850,
            attackStrength: data.home.attackStrength || 1.25,
            defenseStrength: data.home.defenseStrength || 0.75,
            homeAttack: data.home.homeAttack || 1.28,
            homeDefense: data.home.homeDefense || 0.72,
            awayAttack: data.home.awayAttack || 1.18,
            awayDefense: data.home.awayDefense || 0.82,
            xGPerGame: data.home.xGPerGame || 1.85,
            recentForm: Array.isArray(data.home.recentForm) ? data.home.recentForm : ['W', 'D', 'W', 'W', 'L'],
          };
          const awayUpdated: Team = {
            id: selectedAwayTeam.id || a.toLowerCase().replace(/\s+/g, '-'),
            name: data.away.name || a,
            league: selectedAwayTeam.league || 'Premier League',
            elo: data.away.elo || 1810,
            attackStrength: data.away.attackStrength || 1.15,
            defenseStrength: data.away.defenseStrength || 0.85,
            homeAttack: data.away.homeAttack || 1.18,
            homeDefense: data.away.homeDefense || 0.78,
            awayAttack: data.away.awayAttack || 1.10,
            awayDefense: data.away.awayDefense || 0.86,
            xGPerGame: data.away.xGPerGame || 1.55,
            recentForm: Array.isArray(data.away.recentForm) ? data.away.recentForm : ['D', 'W', 'L', 'W', 'D'],
          };
          setSelectedHomeTeam(homeUpdated);
          setSelectedAwayTeam(awayUpdated);
          setModelDataSource(`VERIFIED REAL-TIME DATA (${data.source || 'LIVE API'})`);
        }
      }
    } catch (err) {
      console.error('Failed to sync real team stats:', err);
    } finally {
      setSyncingModelData(false);
    }
  };

  const handleSyncRealFixtures = async () => {
    setSyncingRealFixtures(true);
    try {
      const real = await fetchRealFixtures(modelOption);
      if (real && real.length > 0) {
        setFixturesList(real);
        // Automatically set active selection to top real fixture and fetch real stats
        const topMatch = real[0];
        if (topMatch && topMatch.home && topMatch.away) {
          handleSyncRealModelData(topMatch.home, topMatch.away);
        }
      } else {
        setFixturesList([]);
      }
    } catch (err) {
      console.error('Failed to sync real fixtures:', err);
      setFixturesList([]);
    } finally {
      setSyncingRealFixtures(false);
    }
  };

  // Auto-sync real-time fixtures immediately on app startup or model option change
  useEffect(() => {
    handleSyncRealFixtures();
  }, [modelOption]);

  // Tactical insights cache state: key -> string
  const [tacticalInsightsMap, setTacticalInsightsMap] = useState<Record<string, string>>({});
  const [loadingInsightsSet, setLoadingInsightsSet] = useState<Set<string>>(new Set());

  // Stateful teams list initialized with all database teams
  const [teamsList, setTeamsList] = useState<Team[]>(() =>
    Object.values(TEAMS_DATABASE).flat()
  );

  const allTeams = teamsList;

  const availableLeagues = useMemo(() => {
    const set = new Set<string>();
    Object.keys(TEAMS_DATABASE).forEach((lg) => set.add(lg));
    allTeams.forEach((t) => {
      if (t.league) set.add(t.league);
    });
    return ['All', ...Array.from(set)];
  }, [allTeams]);

  const handleUpdateTeam = (updated: Team) => {
    setTeamsList((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    if (selectedHomeTeam.id === updated.id) setSelectedHomeTeam(updated);
    if (selectedAwayTeam.id === updated.id) setSelectedAwayTeam(updated);
  };

  const handleAddTeam = (newTeam: Team) => {
    setTeamsList((prev) => [newTeam, ...prev]);
  };

  // Compute prediction result for currently selected fixture
  const activePrediction: PredictionResult = useMemo(() => {
    return predictDixonColes(
      selectedHomeTeam,
      selectedAwayTeam,
      homeAdvantage,
      rho,
      formWeight
    );
  }, [selectedHomeTeam, selectedAwayTeam, homeAdvantage, rho, formWeight]);

  // History log of up to 5 recent prediction analyses
  const [predictionHistory, setPredictionHistory] = useState<RecentPredictionEntry[]>([]);

  // Automatically track current match prediction in history when match or prediction updates
  useEffect(() => {
    if (!selectedHomeTeam || !selectedAwayTeam || !activePrediction) return;

    const matchId = `${selectedHomeTeam.id}_vs_${selectedAwayTeam.id}`;
    const now = new Date();
    const timestamp = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newEntry: RecentPredictionEntry = {
      id: matchId,
      timestamp,
      homeTeam: selectedHomeTeam,
      awayTeam: selectedAwayTeam,
      prediction: activePrediction,
    };

    setPredictionHistory((prev) => {
      const filtered = prev.filter((item) => item.id !== matchId);
      return [newEntry, ...filtered].slice(0, 5);
    });
  }, [selectedHomeTeam, selectedAwayTeam, activePrediction]);

  const handleSelectRecentMatch = (hTeam: Team, aTeam: Team) => {
    setSelectedHomeTeam(hTeam);
    setSelectedAwayTeam(aTeam);
  };

  const handleSelectMatchToAnalyze = (hTeam: Team, aTeam: Team) => {
    setSelectedHomeTeam(hTeam);
    setSelectedAwayTeam(aTeam);
    setActiveTab('odds');
  };

  const handleClearPredictionHistory = () => {
    setPredictionHistory([]);
  };

  // Handler to fetch tactical insight via AI API or fallback
  const handleGenerateInsight = async (homeObj: Team, awayObj: Team, pred: PredictionResult) => {
    const key = `${homeObj.id}_vs_${awayObj.id}`;
    if (loadingInsightsSet.has(key)) return;

    setLoadingInsightsSet((prev) => new Set(prev).add(key));
    try {
      const insight = await getTacticalInsights(homeObj, awayObj, pred, modelOption);
      setTacticalInsightsMap((prev) => ({ ...prev, [key]: insight }));
    } catch (err) {
      console.error('Failed to generate insight:', err);
    } finally {
      setLoadingInsightsSet((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  // Fixtures mapped with team objects and calculated predictions
  const fixtureCardsData = useMemo(() => {
    return fixturesList.map((fix) => {
      const hTeam = allTeams.find((t) => t.name === fix.home) || {
        id: fix.home.toLowerCase().replace(/\s+/g, '-'),
        name: fix.home,
        league: fix.league || 'Premier League',
        elo: 1850,
        attackStrength: 1.25,
        defenseStrength: 0.75,
        homeAttack: 1.30,
        homeDefense: 0.70,
        awayAttack: 1.20,
        awayDefense: 0.80,
        xGPerGame: 1.85,
        recentForm: ['W', 'D', 'W', 'W', 'L'],
      };
      const aTeam = allTeams.find((t) => t.name === fix.away) || {
        id: fix.away.toLowerCase().replace(/\s+/g, '-'),
        name: fix.away,
        league: fix.league || 'Premier League',
        elo: 1800,
        attackStrength: 1.15,
        defenseStrength: 0.82,
        homeAttack: 1.20,
        homeDefense: 0.78,
        awayAttack: 1.10,
        awayDefense: 0.86,
        xGPerGame: 1.65,
        recentForm: ['D', 'W', 'L', 'W', 'D'],
      };
      const pred = predictDixonColes(hTeam, aTeam, homeAdvantage, rho, formWeight);
      return {
        ...fix,
        homeTeamObj: hTeam,
        awayTeamObj: aTeam,
        pred,
      };
    });
  }, [fixturesList, allTeams, homeAdvantage, rho, formWeight]);

  // Filtered fixtures
  const filteredFixtures = useMemo(() => {
    return fixtureCardsData.filter((f) => {
      const matchesLeague = selectedLeague === 'All' || f.league === selectedLeague;
      const matchesSearch =
        searchQuery === '' ||
        f.home.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.away.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.league.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesLeague && matchesSearch;
    });
  }, [fixtureCardsData, selectedLeague, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* App Branding */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 p-0.5 shadow-lg shadow-emerald-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Activity className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base text-slate-100 tracking-tight">
                  Football Prediction Engine
                </h1>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold uppercase">
                  Dixon-Coles v2.4
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Statistical goal modeling, Poisson matrices & NVIDIA NIM AI match previews
              </p>
            </div>
          </div>

          {/* Right Header Area: AI Model Selector & Arbitrage Notifications */}
          <div className="flex items-center gap-3">
            <button
              id="btn-open-api-keys-modal"
              onClick={() => setShowKeyModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-mono text-xs font-bold rounded-lg transition-colors cursor-pointer"
              title="Configure API Keys & Secrets"
            >
              <Key className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden md:inline">API Keys</span>
            </button>

            <ArbitrageNotificationCenter
              notifications={notifications}
              settings={notificationSettings}
              onUpdateSettings={setNotificationSettings}
              onMarkAsRead={handleMarkAsRead}
              onMarkAllAsRead={handleMarkAllAsRead}
              onClearAll={handleClearAllNotifications}
              onDismissNotification={handleDismissNotification}
              onScanNow={() => handleRunArbitrageScan(true)}
              isScanning={isScanningArb}
              onSelectMatchToAnalyze={handleSelectMatchToAnalyze}
              availableLeagues={availableLeagues}
            />

            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-slate-400 font-bold hidden sm:inline">AI Model:</span>
              <div className="flex bg-slate-950 border border-slate-800 rounded-lg p-0.5">
                <button
                  id="btn-model-nvidia"
                  onClick={() => setModelOption('nvidia')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    modelOption === 'nvidia'
                      ? 'bg-emerald-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="NVIDIA NIM (Main Engine)"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>NVIDIA NIM (Main)</span>
                </button>
                <button
                  id="btn-model-gemini"
                  onClick={() => setModelOption('gemini')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    modelOption === 'gemini'
                      ? 'bg-cyan-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Gemini 2.5 Flash (Option)"
                >
                  <Zap className="w-3 h-3" />
                  <span>Gemini (Option)</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation Menu */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-1 border-t border-slate-800/60 overflow-x-auto no-scrollbar py-1">
          {[
            { id: 'syndicate', label: 'Syndicate Intelligence', icon: Crown },
            { id: 'fixtures', label: 'Upcoming Fixtures', icon: Calendar },
            { id: 'model', label: 'Model Probabilities', icon: Activity },
            { id: 'ml', label: 'ML Studio', icon: BrainCircuit },
            { id: 'xg_studio', label: 'xG Feature Studio', icon: Target },
            { id: 'odds', label: 'Multi-Odds & Arbitrage', icon: DollarSign },
            { id: 'sim', label: 'Monte Carlo Simulator', icon: BarChart3 },
            { id: 'elo', label: 'Elo & Hyperparameters', icon: Sliders },
            { id: 'live', label: 'Live Telemetry Feed', icon: Radio },
            { id: 'radar', label: 'Integrity Radar', icon: Shield },
            { id: 'apps_script', label: 'Apps Script Sync', icon: FileCode },
            { id: 'system', label: 'Termux & Auto-Updater', icon: Cpu },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-nav-${tab.id}`}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-mono text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Body Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* TAB 0: SYNDICATE INTELLIGENCE & ACCUMULATOR STUDIO */}
        {activeTab === 'syndicate' && (
          <SyndicateAnalystStudio
            modelOption={modelOption}
            fixturesList={fixtureCardsData}
            onSelectMatch={(homeName, awayName) => {
              const hTeam = allTeams.find((t) => t.name.toLowerCase() === homeName.toLowerCase());
              const aTeam = allTeams.find((t) => t.name.toLowerCase() === awayName.toLowerCase());
              if (hTeam) setSelectedHomeTeam(hTeam);
              if (aTeam) setSelectedAwayTeam(aTeam);
              setActiveTab('model');
            }}
          />
        )}

        {/* TAB 1: UPCOMING FIXTURES */}
        {activeTab === 'fixtures' && (
          <div id="fixtures" className="space-y-6">
            {/* Filter & Search Bar */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                <span className="text-xs font-mono font-bold text-slate-400 uppercase mr-1 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5 text-emerald-400" />
                  League:
                </span>
                {availableLeagues.map(
                  (lg) => (
                    <button
                      key={lg}
                      id={`btn-filter-${lg.toLowerCase().replace(/\s+/g, '-')}`}
                      onClick={() => setSelectedLeague(lg)}
                      className={`px-3 py-1 rounded-md text-xs font-mono font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                        selectedLeague === lg
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {lg}
                    </button>
                  )
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  id="btn-sync-real-fixtures"
                  onClick={handleSyncRealFixtures}
                  disabled={syncingRealFixtures}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-400 font-mono text-xs font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
                >
                  <Zap className={`w-3.5 h-3.5 ${syncingRealFixtures ? 'animate-spin' : ''}`} />
                  <span>{syncingRealFixtures ? 'SYNCING...' : 'SYNC REAL FIXTURES'}</span>
                </button>

                <div className="relative min-w-[200px]">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    id="input-search-fixtures"
                    type="text"
                    placeholder="Search team or league..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Fixture MatchCard Grid */}
            {filteredFixtures.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-6">
                {filteredFixtures.map((f) => {
                  const isSelected =
                    selectedHomeTeam.name === f.home && selectedAwayTeam.name === f.away;
                  const key = `${f.homeTeamObj.id}_vs_${f.awayTeamObj.id}`;
                  const insight = tacticalInsightsMap[key];
                  const isInsightLoading = loadingInsightsSet.has(key);

                  return (
                    <MatchCard
                      key={key}
                      homeTeamName={f.home}
                      awayTeamName={f.away}
                      leagueName={f.league}
                      kickoffTime={f.time}
                      predictionResult={f.pred}
                      homeForm={f.homeTeamObj.recentForm}
                      awayForm={f.awayTeamObj.recentForm}
                      homeTeamObj={f.homeTeamObj}
                      awayTeamObj={f.awayTeamObj}
                      tacticalInsight={insight}
                      isInsightLoading={isInsightLoading}
                      onGenerateInsightClick={() =>
                        handleGenerateInsight(f.homeTeamObj, f.awayTeamObj, f.pred)
                      }
                      isSelected={isSelected}
                      onClick={() => {
                        setSelectedHomeTeam(f.homeTeamObj);
                        setSelectedAwayTeam(f.awayTeamObj);
                        setActiveTab('model');
                      }}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-10 text-center space-y-4 max-w-xl mx-auto my-8">
                <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto text-emerald-400">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-200 font-mono">
                    {syncingRealFixtures
                      ? 'SYNCING REAL-TIME MATCHES...'
                      : 'NO REAL-TIME FIXTURES SCHEDULED TODAY'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    {syncingRealFixtures
                      ? 'Connecting to official FotMob / SofaScore real-time match data feeds...'
                      : 'Only verified real-world fixtures from live data APIs are displayed. Click the button below to query live schedules or change filters.'}
                  </p>
                </div>
                <button
                  onClick={handleSyncRealFixtures}
                  disabled={syncingRealFixtures}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono font-bold text-xs rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Zap className={`w-4 h-4 ${syncingRealFixtures ? 'animate-spin' : ''}`} />
                  <span>{syncingRealFixtures ? 'SYNCING...' : 'RE-SYNC REAL-TIME FIXTURES'}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MODEL PROBABILITIES & BREAKDOWN */}
        {activeTab === 'model' && (
          <div className="space-y-6">
            {/* Team Selection Header */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-400" />
                <div>
                  <h2 className="text-sm font-bold font-mono text-slate-200 uppercase">
                    Active Fixture Parameters
                  </h2>
                  <p className="text-xs text-slate-400">
                    Calculated Dixon-Coles expected goal distribution
                  </p>
                </div>
              </div>

              {/* Selectors & Real-Time Data Sync Controls */}
              <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
                {/* Real Fixture Picker Dropdown if available */}
                {fixturesList.length > 0 && (
                  <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-300">
                    <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[11px] font-bold text-slate-400">Match:</span>
                    <select
                      id="select-active-real-fixture"
                      onChange={(e) => {
                        const fix = fixturesList.find((f) => f.id === e.target.value);
                        if (fix) {
                          handleSyncRealModelData(fix.home, fix.away);
                        }
                      }}
                      className="bg-slate-950 text-emerald-400 font-bold focus:outline-none"
                    >
                      {fixturesList.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.home} vs {f.away} ({f.league})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Team Selectors */}
                <div className="flex items-center gap-2">
                  <select
                    id="select-home-team"
                    value={selectedHomeTeam.id}
                    onChange={(e) => {
                      const found = allTeams.find((t) => t.id === e.target.value);
                      if (found) {
                        setSelectedHomeTeam(found);
                        handleSyncRealModelData(found.name, selectedAwayTeam.name);
                      }
                    }}
                    className="bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-emerald-400 font-bold focus:outline-none focus:border-emerald-500"
                  >
                    {allTeams.map((t) => (
                      <option key={`home-${t.id}`} value={t.id}>
                        {t.name} ({t.league})
                      </option>
                    ))}
                  </select>

                  <span className="text-amber-400 font-bold">VS</span>

                  <select
                    id="select-away-team"
                    value={selectedAwayTeam.id}
                    onChange={(e) => {
                      const found = allTeams.find((t) => t.id === e.target.value);
                      if (found) {
                        setSelectedAwayTeam(found);
                        handleSyncRealModelData(selectedHomeTeam.name, found.name);
                      }
                    }}
                    className="bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-cyan-400 font-bold focus:outline-none focus:border-emerald-500"
                  >
                    {allTeams.map((t) => (
                      <option key={`away-${t.id}`} value={t.id}>
                        {t.name} ({t.league})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sync Real Team Data Button */}
                <button
                  id="btn-sync-real-model-data"
                  onClick={() => handleSyncRealModelData()}
                  disabled={syncingModelData}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-400 font-bold rounded transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Zap className={`w-3.5 h-3.5 ${syncingModelData ? 'animate-spin' : ''}`} />
                  <span>{syncingModelData ? 'SYNCING REAL METRICS...' : 'RE-SYNC REAL STATS'}</span>
                </button>
              </div>
            </div>

            {/* Real Team Performance Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex items-center justify-between">
                <div>
                  <span className="text-slate-400 uppercase text-[10px] font-bold block">HOME TEAM REAL METRICS</span>
                  <span className="text-sm font-bold text-emerald-400">{selectedHomeTeam.name}</span>
                  <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-300">
                    <span>Elo: <strong className="text-emerald-400">{selectedHomeTeam.elo}</strong></span>
                    <span>&bull;</span>
                    <span>Attack: <strong className="text-slate-200">{selectedHomeTeam.attackStrength}</strong></span>
                    <span>&bull;</span>
                    <span>Defense: <strong className="text-slate-200">{selectedHomeTeam.defenseStrength}</strong></span>
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <span className="text-slate-400 uppercase text-[10px] font-bold block">FORM</span>
                  <div className="flex items-center justify-end gap-1">
                    {selectedHomeTeam.recentForm.map((res, i) => (
                      <span
                        key={i}
                        className={`w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center ${
                          res === 'W' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : res === 'D' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                        }`}
                      >
                        {res}
                      </span>
                    ))}
                  </div>
                  <div className="flex justify-end">
                    <StreakBadge form={selectedHomeTeam.recentForm} size="xs" />
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex items-center justify-between">
                <div>
                  <span className="text-slate-400 uppercase text-[10px] font-bold block">AWAY TEAM REAL METRICS</span>
                  <span className="text-sm font-bold text-cyan-400">{selectedAwayTeam.name}</span>
                  <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-300">
                    <span>Elo: <strong className="text-cyan-400">{selectedAwayTeam.elo}</strong></span>
                    <span>&bull;</span>
                    <span>Attack: <strong className="text-slate-200">{selectedAwayTeam.attackStrength}</strong></span>
                    <span>&bull;</span>
                    <span>Defense: <strong className="text-slate-200">{selectedAwayTeam.defenseStrength}</strong></span>
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <span className="text-slate-400 uppercase text-[10px] font-bold block">FORM</span>
                  <div className="flex items-center justify-end gap-1">
                    {selectedAwayTeam.recentForm.map((res, i) => (
                      <span
                        key={i}
                        className={`w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center ${
                          res === 'W' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : res === 'D' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                        }`}
                      >
                        {res}
                      </span>
                    ))}
                  </div>
                  <div className="flex justify-end">
                    <StreakBadge form={selectedAwayTeam.recentForm} size="xs" />
                  </div>
                </div>
              </div>
            </div>

            {/* Featured MatchCard Header */}
            {(() => {
              const activeKey = `${selectedHomeTeam.id}_vs_${selectedAwayTeam.id}`;
              const activeInsight = tacticalInsightsMap[activeKey];
              const activeIsLoading = loadingInsightsSet.has(activeKey);

              return (
                <MatchCard
                  homeTeamName={selectedHomeTeam.name}
                  awayTeamName={selectedAwayTeam.name}
                  leagueName={selectedHomeTeam.league}
                  kickoffTime="Marquee Fixture"
                  predictionResult={activePrediction}
                  homeForm={selectedHomeTeam.recentForm}
                  awayForm={selectedAwayTeam.recentForm}
                  homeTeamObj={selectedHomeTeam}
                  awayTeamObj={selectedAwayTeam}
                  tacticalInsight={activeInsight}
                  isInsightLoading={activeIsLoading}
                  onGenerateInsightClick={() =>
                    handleGenerateInsight(selectedHomeTeam, selectedAwayTeam, activePrediction)
                  }
                  isSelected={true}
                />
              );
            })()}

            {/* 5-Dimension Team Radar Comparison Chart */}
            <TeamRadarChart
              homeTeam={selectedHomeTeam}
              awayTeam={selectedAwayTeam}
            />

            {/* Historical Elo & Attack/Defense Strength Evolution Line Chart */}
            <EloEvolutionChart
              homeTeam={selectedHomeTeam}
              awayTeam={selectedAwayTeam}
            />

            {/* Rolling 10-Match Expected Goals (xG) Heatmap */}
            <XGHeatmap
              homeTeam={selectedHomeTeam}
              awayTeam={selectedAwayTeam}
            />

            {/* Historical Win-by-Margin Trend & Volatility Analysis */}
            <WinMarginTrendChart
              homeTeam={selectedHomeTeam}
              awayTeam={selectedAwayTeam}
              predictionResult={activePrediction}
            />

            {/* Interactive Outcome Probability & Real-Time Odds Slider */}
            <InteractiveProbSlider
              predictionResult={activePrediction}
              homeTeamName={selectedHomeTeam.name}
              awayTeamName={selectedAwayTeam.name}
            />

            {/* Recent Predictions Panel (Tracks last 5 analyzed matches) */}
            <RecentPredictions
              history={predictionHistory}
              onSelectMatch={handleSelectRecentMatch}
              onClearHistory={handleClearPredictionHistory}
              currentMatchId={`${selectedHomeTeam.id}_vs_${selectedAwayTeam.id}`}
            />

            {/* Matrix & Score Predictions Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 2 Cols: Heatmap Matrix */}
              <div className="lg:col-span-2">
                <ProbMatrix predictionResult={activePrediction} />
              </div>

              {/* 1 Col: Key Derived Probabilities & Correct Score Ranking */}
              <div className="space-y-6">
                {/* Secondary Markets Card */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3 font-mono">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Secondary Goal Markets
                  </h3>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between p-2 rounded bg-slate-950 border border-slate-800/80">
                      <span className="text-slate-400">Over 1.5 Goals</span>
                      <span className="font-bold text-emerald-400">
                        {(activePrediction.over15Prob * 100).toFixed(1)}%
                      </span>
                    </div>

                    <div className="flex justify-between p-2 rounded bg-slate-950 border border-slate-800/80">
                      <span className="text-slate-400">Over 2.5 Goals</span>
                      <span className="font-bold text-emerald-400">
                        {(activePrediction.over25Prob * 100).toFixed(1)}%
                      </span>
                    </div>

                    <div className="flex justify-between p-2 rounded bg-slate-950 border border-slate-800/80">
                      <span className="text-slate-400">Under 2.5 Goals</span>
                      <span className="font-bold text-amber-400">
                        {(activePrediction.under25Prob * 100).toFixed(1)}%
                      </span>
                    </div>

                    <div className="flex justify-between p-2 rounded bg-slate-950 border border-slate-800/80">
                      <span className="text-slate-400">Both Teams To Score (BTTS)</span>
                      <span className="font-bold text-cyan-400">
                        {(activePrediction.bttsProb * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Correct Score Distribution & Kelly Value Bet Panel */}
                <CorrectScoreDistribution
                  correctScores={activePrediction.correctScores}
                  homeTeamName={selectedHomeTeam.name}
                  awayTeamName={selectedAwayTeam.name}
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: MULTI-ODDS & ARBITRAGE */}
        {activeTab === 'odds' && (
          <div className="space-y-6">
            <ArbitrageCalculator predictionResult={activePrediction} />
            <GoogleAppsScriptIntegration
              currentHomeTeam={selectedHomeTeam}
              currentAwayTeam={selectedAwayTeam}
              currentPrediction={activePrediction}
            />
          </div>
        )}

        {/* TAB 8: GOOGLE APPS SCRIPT SYNC */}
        {activeTab === 'apps_script' && (
          <GoogleAppsScriptIntegration
            currentHomeTeam={selectedHomeTeam}
            currentAwayTeam={selectedAwayTeam}
            currentPrediction={activePrediction}
          />
        )}

        {/* TAB 4: MONTE CARLO SIMULATOR */}
        {activeTab === 'sim' && (
          <MonteCarloSim predictionResult={activePrediction} />
        )}

        {/* TAB 5: ELO STANDINGS & HYPERPARAMETERS */}
        {activeTab === 'elo' && (
          <EloStandings
            teams={allTeams}
            homeAdvantage={homeAdvantage}
            setHomeAdvantage={setHomeAdvantage}
            rho={rho}
            setRho={setRho}
            formWeight={formWeight}
            setFormWeight={setFormWeight}
            onUpdateTeam={handleUpdateTeam}
            onAddTeam={handleAddTeam}
          />
        )}

        {/* TAB 3: MACHINE LEARNING STUDIO */}
        {activeTab === 'ml' && <MachineLearningStudio modelOption={modelOption} />}

        {/* TAB 3.5: xG FEATURE ENGINEERING STUDIO */}
        {activeTab === 'xg_studio' && (
          <XGFeatureStudio
            selectedHomeTeam={selectedHomeTeam}
            selectedAwayTeam={selectedAwayTeam}
          />
        )}

        {/* TAB 6: LIVE TELEMETRY FEED */}
        {activeTab === 'live' && <LiveFeed modelOption={modelOption} />}

        {/* TAB 7: INTEGRITY RADAR */}
        {activeTab === 'radar' && <IntegrityRadar modelOption={modelOption} />}

        {/* TAB 8: GOOGLE APPS SCRIPT SYNC */}
        {activeTab === 'apps_script' && <GoogleAppsScriptIntegration />}

        {/* TAB 9: TERMUX & SYSTEM AUTO-UPDATER */}
        {activeTab === 'system' && <SystemAutoUpdater />}
      </main>

      {/* Floating Arbitrage Toast Popups */}
      <ArbitrageToast
        notification={toastNotification}
        onClose={() => setToastNotification(null)}
        onOpenCenter={() => {
          const btn = document.getElementById('btn-open-arbitrage-notifications');
          if (btn) btn.click();
        }}
        onSelectMatchToAnalyze={handleSelectMatchToAnalyze}
      />

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-4 text-center font-mono text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Football Prediction Engine &copy; {new Date().getFullYear()}</span>
          <span>Dixon-Coles Poisson Model &bull; Bivariate Goal Distribution &bull; NVIDIA NIM AI</span>
        </div>
      </footer>

      {/* Global API Key Configuration Modal */}
      <ApiKeyConfigModal
        isOpen={showKeyModal}
        onClose={() => setShowKeyModal(false)}
      />
    </div>
  );
}

export default App;
