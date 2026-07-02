import React, { useState, useEffect, useRef } from 'react';
import {
  Radio,
  Activity,
  RefreshCw,
  Flame,
  Plus,
  Sparkles,
  Trash2,
  Download,
  Database,
  Globe,
  CheckCircle2,
  Bell,
  BellRing,
  BellOff,
  Sliders,
  AlertTriangle,
  Zap,
  ShieldAlert,
  Volume2,
  Check,
} from 'lucide-react';
import { LiveMatchEvent } from '../types';
import {
  fetchLiveRealWorldMatches,
  fetchSportmonksLive,
  fetchStatsBombLive,
  fetchFootballDataOrgLive,
  fetchOddsApiLive,
  fetchSofaScoreLive,
  fetchFotmobToday,
  fetchMasterPredictionFeed,
} from '../services/geminiService';

interface LiveFeedProps {
  modelOption?: 'nvidia' | 'gemini';
}

export interface XgShiftAlert {
  id: string;
  matchId: string;
  matchTitle: string;
  shiftAmount: number;
  teamName: string;
  timestamp: string;
  homeXg: number;
  awayXg: number;
  details: string;
}

export const LiveFeed: React.FC<LiveFeedProps> = ({ modelOption = 'nvidia' }) => {
  const [loadingRealMatches, setLoadingRealMatches] = useState<boolean>(false);
  const [activeSource, setActiveSource] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showJsonFeed, setShowJsonFeed] = useState<boolean>(false);
  const [jsonFeedData, setJsonFeedData] = useState<any>(null);
  const [autoSync, setAutoSync] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // Goal Expectancy Shift Notification Configuration State
  const [xgThreshold, setXgThreshold] = useState<number>(() => {
    const saved = localStorage.getItem('livefeed_xg_threshold');
    return saved ? parseFloat(saved) : 0.25;
  });

  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('livefeed_notifications_enabled');
    return saved ? saved === 'true' : true;
  });

  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>(() => {
    return typeof Notification !== 'undefined' ? Notification.permission : 'default';
  });

  const [showNotificationConfig, setShowNotificationConfig] = useState<boolean>(false);
  const [alertHistory, setAlertHistory] = useState<XgShiftAlert[]>([]);
  const [recentlyShiftedMatches, setRecentlyShiftedMatches] = useState<Record<string, number>>({});

  const prevEventsRef = useRef<
    Record<string, { homeXg: number; awayXg: number; homeScore: number; awayScore: number }>
  >({});

  // New match form state
  const [newHome, setNewHome] = useState('Arsenal');
  const [newAway, setNewAway] = useState('Tottenham');
  const [newLeague, setNewLeague] = useState('Premier League');

  const [liveEvents, setLiveEvents] = useState<LiveMatchEvent[]>([]);

  // Persist threshold configuration
  useEffect(() => {
    localStorage.setItem('livefeed_xg_threshold', xgThreshold.toString());
  }, [xgThreshold]);

  useEffect(() => {
    localStorage.setItem('livefeed_notifications_enabled', notificationsEnabled.toString());
  }, [notificationsEnabled]);

  // Request browser notification permissions
  const requestNotificationPermission = async (): Promise<NotificationPermission> => {
    if (typeof Notification === 'undefined') return 'denied';
    try {
      const perm = await Notification.requestPermission();
      setPermissionStatus(perm);
      return perm;
    } catch (err) {
      console.error('Error requesting notification permission:', err);
      return 'denied';
    }
  };

  // Dispatch browser desktop notification
  const sendDesktopNotification = (title: string, body: string, matchId?: string) => {
    if (
      typeof Notification !== 'undefined' &&
      Notification.permission === 'granted' &&
      notificationsEnabled
    ) {
      try {
        new Notification(title, {
          body,
          icon: '/favicon.ico',
          tag: matchId ? `xg-shift-${matchId}` : `xg-test-${Date.now()}`,
        });
      } catch (err) {
        console.warn('Desktop notification call failed:', err);
      }
    }
  };

  // Test notification trigger
  const handleTestNotification = async () => {
    let currentPerm = permissionStatus;
    if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
      currentPerm = await requestNotificationPermission();
    }

    const testTitle = `🚨 Test xG Shift Alert (±${xgThreshold.toFixed(2)} xG)`;
    const testBody = `Goal Expectancy shift threshold is set to ±${xgThreshold.toFixed(
      2
    )} xG. Real-time telemetry monitoring is active!`;

    sendDesktopNotification(testTitle, testBody);

    const testAlert: XgShiftAlert = {
      id: `test_${Date.now()}`,
      matchId: 'test_match',
      matchTitle: 'Arsenal vs Tottenham (Test Match)',
      shiftAmount: xgThreshold,
      teamName: 'Arsenal',
      timestamp: new Date().toLocaleTimeString(),
      homeXg: 1.85,
      awayXg: 1.2,
      details: `Test alert executed at threshold ±${xgThreshold.toFixed(
        2
      )} xG. Desktop Permission: ${currentPerm.toUpperCase()}`,
    };

    setAlertHistory((prev) => [testAlert, ...prev.slice(0, 9)]);
  };

  // Evaluate xG shifts against configured threshold
  const checkXgShifts = (newMatches: LiveMatchEvent[]) => {
    if (!newMatches || newMatches.length === 0) return;

    const newShiftedMap: Record<string, number> = {};

    newMatches.forEach((m) => {
      const key = m.id || `${m.homeTeam}-${m.awayTeam}`;
      const prev = prevEventsRef.current[key];

      if (prev) {
        const deltaHome = m.homeXg - prev.homeXg;
        const deltaAway = m.awayXg - prev.awayXg;
        const maxTeamShift = Math.max(Math.abs(deltaHome), Math.abs(deltaAway));
        const totalXgShift = Math.abs(m.homeXg + m.awayXg - (prev.homeXg + prev.awayXg));

        const effectiveShift = Math.max(maxTeamShift, totalXgShift);

        if (effectiveShift >= xgThreshold) {
          const shiftTeam = Math.abs(deltaHome) >= Math.abs(deltaAway) ? m.homeTeam : m.awayTeam;
          const shiftVal = Math.abs(deltaHome) >= Math.abs(deltaAway) ? deltaHome : deltaAway;
          const shiftDirection = shiftVal >= 0 ? '+' : '';
          const shiftFormatted = `${shiftDirection}${effectiveShift.toFixed(2)}`;

          newShiftedMap[m.id] = effectiveShift;

          const title = `🚨 Goal Expectancy Shift: ${m.homeTeam} vs ${m.awayTeam}`;
          const body = `xG shifted by ${shiftFormatted} xG for ${shiftTeam}! Current xG: ${m.homeTeam} (${m.homeXg.toFixed(
            2
          )}) - (${m.awayXg.toFixed(2)}) ${m.awayTeam}. Score: ${m.homeScore}-${m.awayScore} (${m.minute}')`;

          sendDesktopNotification(title, body, m.id);

          const alertRecord: XgShiftAlert = {
            id: `alert_${m.id}_${Date.now()}`,
            matchId: m.id,
            matchTitle: `${m.homeTeam} vs ${m.awayTeam}`,
            shiftAmount: Number(effectiveShift.toFixed(2)),
            teamName: shiftTeam,
            timestamp: new Date().toLocaleTimeString(),
            homeXg: m.homeXg,
            awayXg: m.awayXg,
            details: `Shift: ${shiftFormatted} xG for ${shiftTeam} at ${m.minute}'. Live Score: ${m.homeScore}-${m.awayScore}`,
          };

          setAlertHistory((prev) => [alertRecord, ...prev.slice(0, 9)]);
        }
      }

      // Record current metrics for next telemetry polling diff
      prevEventsRef.current[key] = {
        homeXg: m.homeXg,
        awayXg: m.awayXg,
        homeScore: m.homeScore,
        awayScore: m.awayScore,
      };
    });

    if (Object.keys(newShiftedMap).length > 0) {
      setRecentlyShiftedMatches((prev) => ({ ...prev, ...newShiftedMap }));
    }
  };

  const setLiveEventsWithShiftCheck = (matches: LiveMatchEvent[]) => {
    checkXgShifts(matches);
    setLiveEvents(matches);
  };

  // Simulate xG shift on a match for testing
  const handleSimulateShift = (matchId: string) => {
    setLiveEvents((prev) =>
      prev.map((m) => {
        if (m.id === matchId) {
          const shiftAdd = Number((xgThreshold >= 0.1 ? xgThreshold : 0.25).toFixed(2));
          const updatedHomeXg = Number((m.homeXg + shiftAdd).toFixed(2));
          const updatedShots = m.homeShotsOnTarget + 2;
          const updatedMatch = {
            ...m,
            homeXg: updatedHomeXg,
            homeShotsOnTarget: updatedShots,
            minute: Math.min(90, m.minute + 3),
          };

          checkXgShifts([updatedMatch]);

          return updatedMatch;
        }
        return m;
      })
    );
  };

  // Function to load real-time data from server endpoints
  const loadRealTimeFeed = async () => {
    setLoadingRealMatches(true);
    try {
      const realMatches = await fetchLiveRealWorldMatches(modelOption);
      if (realMatches && realMatches.length > 0) {
        setLiveEventsWithShiftCheck(realMatches);
      } else {
        const sm = await fetchSportmonksLive();
        if (sm && sm.length > 0) {
          setLiveEventsWithShiftCheck(sm);
        } else {
          const sb = await fetchStatsBombLive();
          if (sb && sb.length > 0) {
            setLiveEventsWithShiftCheck(sb);
          } else {
            const fd = await fetchFootballDataOrgLive();
            if (fd && fd.length > 0) {
              setLiveEventsWithShiftCheck(fd);
            } else {
              const odds = await fetchOddsApiLive();
              if (odds && odds.length > 0) {
                setLiveEventsWithShiftCheck(odds);
              } else {
                const sofa = await fetchSofaScoreLive();
                if (sofa && sofa.length > 0) {
                  setLiveEventsWithShiftCheck(sofa);
                } else {
                  setLiveEventsWithShiftCheck([]);
                }
              }
            }
          }
        }
      }
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Error auto-syncing real-time feed:', err);
      setLiveEventsWithShiftCheck([]);
    } finally {
      setLoadingRealMatches(false);
    }
  };

  // Auto-fetch real-time data on component mount or modelOption change
  useEffect(() => {
    loadRealTimeFeed();
  }, [modelOption]);

  // Continuous auto-polling for real-time telemetry updates (60 second interval)
  useEffect(() => {
    if (!autoSync) return;
    const interval = setInterval(() => {
      loadRealTimeFeed();
    }, 60000);
    return () => clearInterval(interval);
  }, [autoSync, modelOption]);

  const handleFetchSportmonks = async () => {
    setLoadingRealMatches(true);
    setActiveSource('sportmonks');
    try {
      const sm = await fetchSportmonksLive();
      if (sm && sm.length > 0) {
        setLiveEventsWithShiftCheck(sm);
      } else {
        const fallback = await fetchLiveRealWorldMatches(modelOption);
        if (fallback) setLiveEventsWithShiftCheck(fallback);
      }
    } catch (err) {
      console.error('Error fetching Sportmonks API:', err);
    } finally {
      setLoadingRealMatches(false);
    }
  };

  const handleFetchStatsBomb = async () => {
    setLoadingRealMatches(true);
    setActiveSource('statsbomb');
    try {
      const sb = await fetchStatsBombLive();
      if (sb && sb.length > 0) {
        setLiveEventsWithShiftCheck(sb);
      } else {
        const fallback = await fetchLiveRealWorldMatches(modelOption);
        if (fallback) setLiveEventsWithShiftCheck(fallback);
      }
    } catch (err) {
      console.error('Error fetching StatsBomb Live GraphQL:', err);
    } finally {
      setLoadingRealMatches(false);
    }
  };

  const handleFetchFootballData = async () => {
    setLoadingRealMatches(true);
    setActiveSource('football-data.org');
    try {
      const fd = await fetchFootballDataOrgLive();
      if (fd && fd.length > 0) {
        setLiveEventsWithShiftCheck(fd);
      } else {
        const fallback = await fetchLiveRealWorldMatches(modelOption);
        if (fallback) setLiveEventsWithShiftCheck(fallback);
      }
    } catch (err) {
      console.error('Error fetching Football-Data.org:', err);
    } finally {
      setLoadingRealMatches(false);
    }
  };

  const handleFetchOddsApi = async () => {
    setLoadingRealMatches(true);
    setActiveSource('the_odds_api');
    try {
      const odds = await fetchOddsApiLive();
      if (odds && odds.length > 0) {
        setLiveEventsWithShiftCheck(odds);
      } else {
        const fallback = await fetchLiveRealWorldMatches(modelOption);
        if (fallback) setLiveEventsWithShiftCheck(fallback);
      }
    } catch (err) {
      console.error('Error fetching The Odds API:', err);
    } finally {
      setLoadingRealMatches(false);
    }
  };

  const handleFetchSofaScore = async () => {
    setLoadingRealMatches(true);
    setActiveSource('sofascore');
    try {
      const sofa = await fetchSofaScoreLive();
      if (sofa && sofa.length > 0) {
        setLiveEventsWithShiftCheck(sofa);
      } else {
        const fallback = await fetchLiveRealWorldMatches(modelOption);
        if (fallback) setLiveEventsWithShiftCheck(fallback);
      }
    } catch (err) {
      console.error('Error fetching SofaScore live:', err);
    } finally {
      setLoadingRealMatches(false);
    }
  };

  const handleFetchFotmob = async () => {
    setLoadingRealMatches(true);
    setActiveSource('fotmob');
    try {
      const fotmob = await fetchFotmobToday();
      if (fotmob && fotmob.length > 0) {
        setLiveEventsWithShiftCheck(fotmob);
      } else {
        const fallback = await fetchLiveRealWorldMatches(modelOption);
        if (fallback) setLiveEventsWithShiftCheck(fallback);
      }
    } catch (err) {
      console.error('Error fetching Fotmob today:', err);
    } finally {
      setLoadingRealMatches(false);
    }
  };

  const handleFetchLiveAi = async () => {
    setLoadingRealMatches(true);
    setActiveSource(modelOption === 'nvidia' ? 'nvidia_nim' : 'gemini_ai');
    try {
      const fetched = await fetchLiveRealWorldMatches(modelOption);
      if (fetched && fetched.length > 0) {
        setLiveEventsWithShiftCheck(fetched);
      } else {
        setLiveEventsWithShiftCheck([]);
      }
    } catch (err) {
      console.error('Failed to fetch live matches via AI:', err);
    } finally {
      setLoadingRealMatches(false);
    }
  };

  const handleFetchMasterPayload = async () => {
    const payload = await fetchMasterPredictionFeed();
    if (payload) {
      setJsonFeedData(payload);
      setShowJsonFeed(true);
    }
  };

  const refreshLiveFeed = () => {
    loadRealTimeFeed();
  };

  const handleAddCustomMatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHome || !newAway) return;
    const created: LiveMatchEvent = {
      id: `custom_${Date.now()}`,
      homeTeam: newHome,
      awayTeam: newAway,
      league: newLeague,
      minute: 1,
      homeScore: 0,
      awayScore: 0,
      homeXg: 0.15,
      awayXg: 0.10,
      homeShotsOnTarget: 1,
      awayShotsOnTarget: 0,
      homePossession: 50,
      liveStatus: 'LIVE',
      source: 'custom',
    };
    setLiveEvents((prev) => [created, ...prev]);
    setShowAddModal(false);
  };

  const handleDeleteMatch = (id: string) => {
    setLiveEvents((prev) => prev.filter((m) => m.id !== id));
  };

  const getSourceBadge = (source?: string) => {
    switch (source) {
      case 'sportmonks':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
            SPORTMONKS API
          </span>
        );
      case 'statsbomb':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
            STATSBOMB GRAPHQL
          </span>
        );
      case 'football-data.org':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            FOOTBALL-DATA.ORG API
          </span>
        );
      case 'the_odds_api':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-violet-500/20 text-violet-400 border border-violet-500/30">
            THE ODDS API
          </span>
        );
      case 'sofascore':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
            SOFASCORE API
          </span>
        );
      case 'fotmob':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            FOTMOB API
          </span>
        );
      case 'understat':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">
            UNDERSTAT xG
          </span>
        );
      case 'gemini_ai':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            NVIDIA REAL LIVE
          </span>
        );
      default:
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
            CUSTOM
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-rose-500 animate-pulse" />
            <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-slate-200">
              Live Real-Time Telemetry Systems (Sportmonks / StatsBomb / Football-Data / Odds API)
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              REAL-TIME SYNC ACTIVE
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time score, possession, shots on target & xG telemetry stream {lastUpdated && `(Last updated: ${lastUpdated})`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <button
            id="btn-toggle-xg-notifications"
            onClick={() => setShowNotificationConfig(!showNotificationConfig)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 border font-bold rounded-lg transition-all cursor-pointer ${
              showNotificationConfig
                ? 'bg-amber-500/30 border-amber-500 text-amber-200 ring-2 ring-amber-500/50'
                : notificationsEnabled && permissionStatus === 'granted'
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <BellRing className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>xG SHIFT ALERTS: ±{xgThreshold.toFixed(2)} xG</span>
            {permissionStatus === 'granted' && notificationsEnabled && (
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            )}
          </button>

          <button
            id="btn-toggle-auto-sync"
            onClick={() => setAutoSync(!autoSync)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 border font-bold rounded-lg transition-colors cursor-pointer ${
              autoSync
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${autoSync ? 'animate-spin text-emerald-400' : ''}`} />
            <span>AUTO-SYNC: {autoSync ? 'ON' : 'OFF'}</span>
          </button>

          <button
            id="btn-fetch-sportmonks"
            onClick={handleFetchSportmonks}
            disabled={loadingRealMatches}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/20 border border-blue-500/40 hover:bg-blue-500/30 text-blue-300 font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            <Globe className="w-3.5 h-3.5 text-blue-400" />
            <span>SPORTMONKS API</span>
          </button>

          <button
            id="btn-fetch-statsbomb"
            onClick={handleFetchStatsBomb}
            disabled={loadingRealMatches}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/20 border border-rose-500/40 hover:bg-rose-500/30 text-rose-300 font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            <Activity className="w-3.5 h-3.5 text-rose-400" />
            <span>STATSBOMB GRAPHQL</span>
          </button>

          <button
            id="btn-fetch-football-data"
            onClick={handleFetchFootballData}
            disabled={loadingRealMatches}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/40 hover:bg-emerald-500/30 text-emerald-300 font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>FOOTBALL-DATA.ORG</span>
          </button>

          <button
            id="btn-fetch-odds-api"
            onClick={handleFetchOddsApi}
            disabled={loadingRealMatches}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-500/20 border border-violet-500/40 hover:bg-violet-500/30 text-violet-300 font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            <Flame className="w-3.5 h-3.5 text-violet-400" />
            <span>THE ODDS API</span>
          </button>

          <button
            id="btn-fetch-sofascore"
            onClick={handleFetchSofaScore}
            disabled={loadingRealMatches}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 border border-amber-500/40 hover:bg-amber-500/30 text-amber-300 font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            <Globe className="w-3.5 h-3.5 text-amber-400" />
            <span>SOFASCORE LIVE</span>
          </button>

          <button
            id="btn-fetch-fotmob"
            onClick={handleFetchFotmob}
            disabled={loadingRealMatches}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/20 border border-cyan-500/40 hover:bg-cyan-500/30 text-cyan-300 font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>FOTMOB TODAY</span>
          </button>

          <button
            id="btn-fetch-live-ai"
            onClick={handleFetchLiveAi}
            disabled={loadingRealMatches}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 ${loadingRealMatches ? 'animate-spin' : ''}`} />
            <span>NVIDIA REAL LIVE</span>
          </button>

          <button
            id="btn-export-master-payload"
            onClick={handleFetchMasterPayload}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/20 border border-purple-500/40 hover:bg-purple-500/30 text-purple-300 font-bold rounded-lg transition-colors cursor-pointer"
          >
            <Database className="w-3.5 h-3.5 text-purple-400" />
            <span>JSON FEED</span>
          </button>

          <button
            id="btn-add-live-match"
            onClick={() => setShowAddModal(!showAddModal)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-slate-300" />
            <span>ADD</span>
          </button>
        </div>
      </div>

      {/* Goal Expectancy Shift Notification Configuration Panel */}
      {showNotificationConfig && (
        <div className="bg-slate-900 border border-amber-500/40 rounded-xl p-5 shadow-xl space-y-5 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
                  Goal Expectancy Shift Alert & Desktop Notification Engine
                </h4>
                <p className="text-[11px] text-slate-400">
                  Configure real-time xG threshold triggers for browser desktop alerts when live match dynamics shift.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowNotificationConfig(false)}
              className="text-slate-400 hover:text-slate-200 cursor-pointer text-xs font-bold px-2 py-1 rounded bg-slate-800"
            >
              ✕ CLOSE
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Threshold Slider & Numeric Configuration */}
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-slate-300 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  xG Shift Threshold
                </label>
                <span className="px-2 py-0.5 rounded text-xs font-black font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  ±{xgThreshold.toFixed(2)} xG
                </span>
              </div>

              <input
                type="range"
                min="0.05"
                max="2.00"
                step="0.05"
                value={xgThreshold}
                onChange={(e) => setXgThreshold(parseFloat(e.target.value))}
                className="w-full accent-amber-400 bg-slate-800 h-2 rounded cursor-pointer"
              />

              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>0.05 xG</span>
                <span>1.00 xG</span>
                <span>2.00 xG</span>
              </div>

              {/* Threshold Presets */}
              <div className="pt-1 flex flex-wrap gap-1.5">
                {[0.1, 0.25, 0.5, 0.75, 1.0].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setXgThreshold(val)}
                    className={`px-2 py-1 rounded text-[10px] font-bold border cursor-pointer transition-colors ${
                      xgThreshold === val
                        ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    ±{val.toFixed(2)} xG
                  </button>
                ))}
              </div>
            </div>

            {/* Desktop Notification Status & Permission */}
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-blue-400" />
                    Browser Permission Status
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      permissionStatus === 'granted'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                        : permissionStatus === 'denied'
                        ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                        : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                    }`}
                  >
                    {permissionStatus.toUpperCase()}
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {permissionStatus === 'granted'
                    ? 'Browser desktop notifications are authorized. System triggers native alerts when goal expectancy shifts.'
                    : permissionStatus === 'denied'
                    ? 'Desktop notifications are blocked in browser permissions. Click Grant to request.'
                    : 'Permission not requested yet. Click below to authorize browser notifications.'}
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                {permissionStatus !== 'granted' && (
                  <button
                    onClick={requestNotificationPermission}
                    className="flex-1 py-1.5 px-3 bg-blue-600 hover:bg-blue-500 text-slate-100 font-bold rounded transition-colors text-center cursor-pointer"
                  >
                    GRANT PERMISSION
                  </button>
                )}

                <button
                  onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                  className={`py-1.5 px-3 rounded font-bold transition-colors cursor-pointer border ${
                    notificationsEnabled
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  {notificationsEnabled ? 'ENABLED' : 'DISABLED'}
                </button>
              </div>
            </div>

            {/* Test Notification Trigger */}
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-3 flex flex-col justify-between">
              <div>
                <span className="text-slate-300 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5 mb-1">
                  <Volume2 className="w-3.5 h-3.5 text-purple-400" />
                  System Test & Verification
                </span>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Send a test desktop alert to verify your OS & browser desktop notification popup behavior.
                </p>
              </div>

              <button
                onClick={handleTestNotification}
                className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <BellRing className="w-4 h-4 text-slate-950" />
                <span>SEND TEST NOTIFICATION</span>
              </button>
            </div>
          </div>

          {/* Alert Activity Feed */}
          {alertHistory.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex justify-between items-center">
                <span className="text-slate-300 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-rose-400" />
                  Triggered Goal Expectancy Alert History ({alertHistory.length})
                </span>
                <button
                  onClick={() => setAlertHistory([])}
                  className="text-slate-500 hover:text-slate-300 text-[10px] uppercase font-bold cursor-pointer"
                >
                  CLEAR LOG
                </button>
              </div>

              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {alertHistory.map((item) => (
                  <div
                    key={item.id}
                    className="p-2 bg-slate-950 border border-amber-500/30 rounded flex items-center justify-between text-[11px]"
                  >
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded font-black bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px]">
                        +{item.shiftAmount.toFixed(2)} xG SHIFT
                      </span>
                      <span className="font-bold text-slate-200">{item.matchTitle}</span>
                      <span className="text-slate-400 text-[10px]">({item.details})</span>
                    </div>
                    <span className="text-slate-500 text-[10px]">{item.timestamp}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* JSON Feed View Modal */}
      {showJsonFeed && jsonFeedData && (
        <div className="bg-slate-900 border border-purple-500/30 rounded-xl p-4 shadow-xl space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-purple-400 flex items-center gap-2">
              <Database className="w-4 h-4 text-purple-400" />
              Master Live Prediction Feed (live_prediction_feed.json)
            </span>
            <button
              onClick={() => setShowJsonFeed(false)}
              className="text-slate-400 hover:text-slate-200 cursor-pointer text-xs font-bold"
            >
              [CLOSE]
            </button>
          </div>
          <pre className="p-3 bg-slate-950 border border-slate-800 rounded text-emerald-400 max-h-64 overflow-y-auto text-[11px] font-mono leading-relaxed">
            {JSON.stringify(jsonFeedData, null, 2)}
          </pre>
        </div>
      )}

      {/* Add Match Form Modal / Drawer */}
      {showAddModal && (
        <form
          onSubmit={handleAddCustomMatch}
          className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg grid grid-cols-1 sm:grid-cols-4 gap-3 font-mono text-xs"
        >
          <div>
            <label className="text-slate-400 font-semibold block mb-1">Home Team</label>
            <input
              type="text"
              value={newHome}
              onChange={(e) => setNewHome(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500"
              required
            />
          </div>
          <div>
            <label className="text-slate-400 font-semibold block mb-1">Away Team</label>
            <input
              type="text"
              value={newAway}
              onChange={(e) => setNewAway(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500"
              required
            />
          </div>
          <div>
            <label className="text-slate-400 font-semibold block mb-1">League</label>
            <input
              type="text"
              value={newLeague}
              onChange={(e) => setNewLeague(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500"
              required
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded cursor-pointer"
            >
              CREATE MATCH
            </button>
          </div>
        </form>
      )}

      {/* Live Matches List */}
      {liveEvents.length === 0 && !loadingRealMatches && (
        <div className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-8 text-center space-y-4 shadow-xl">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-100 font-mono uppercase tracking-wider">
              No Real Games Currently Live
            </h3>
            <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed">
              There are currently no real-world football matches in progress or scheduled for today across connected telemetry sources (SofaScore & FotMob).
            </p>
          </div>
          <div className="pt-2 flex justify-center gap-3">
            <button
              onClick={loadRealTimeFeed}
              className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-mono text-xs font-bold rounded-lg transition-colors cursor-pointer inline-flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
              <span>RE-CHECK LIVE FEEDS</span>
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-mono text-xs font-bold rounded-lg transition-colors cursor-pointer inline-flex items-center gap-2"
            >
              <Plus className="w-3.5 h-3.5 text-slate-400" />
              <span>ADD TEST MATCH</span>
            </button>
          </div>
        </div>
      )}

      {liveEvents.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {liveEvents.map((m) => {
            const lastShift = recentlyShiftedMatches[m.id];
            const hasShiftAlert = lastShift && lastShift >= xgThreshold;

            return (
              <div
                key={m.id}
                className={`bg-slate-900 border rounded-xl p-5 shadow-lg relative overflow-hidden transition-all ${
                  hasShiftAlert
                    ? 'border-amber-500/80 ring-2 ring-amber-500/30'
                    : 'border-slate-800'
                }`}
              >
                {hasShiftAlert && (
                  <div className="mb-2 px-2.5 py-1 bg-amber-500/20 border border-amber-500/40 rounded flex items-center justify-between text-[11px] font-mono text-amber-300 font-bold animate-pulse">
                    <span className="flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      GOAL EXPECTANCY SHIFT ALERT DETECTED (+{lastShift.toFixed(2)} xG)
                    </span>
                    <span className="text-[10px] bg-amber-500 text-slate-950 font-black px-1.5 py-0.5 rounded uppercase">
                      TRIGGERED
                    </span>
                  </div>
                )}

                {/* Minute Badge, Source & Controls */}
                <div className="flex items-center justify-between text-xs font-mono mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 uppercase font-bold">{m.league}</span>
                    {getSourceBadge(m.source)}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/20 border border-rose-500/40 text-rose-400 font-bold">
                      <Flame className="w-3 h-3 animate-bounce" />
                      {m.minute}' LIVE
                    </span>
                    <button
                      onClick={() => handleDeleteMatch(m.id)}
                      className="text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                      title="Remove match"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Scoreboard */}
                <div className="flex items-center justify-between my-3 px-2">
                  <div className="text-left">
                    <span className="text-sm font-bold text-slate-100 block">{m.homeTeam}</span>
                    <span className="text-xs font-mono text-emerald-400">
                      xG {m.homeXg.toFixed(2)}
                    </span>
                  </div>

                  <div className="px-4 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-lg font-black font-mono text-amber-400 tracking-wider">
                    {m.homeScore} - {m.awayScore}
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-bold text-slate-100 block">{m.awayTeam}</span>
                    <span className="text-xs font-mono text-cyan-400">
                      xG {m.awayXg.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* In-Game Stats Bar */}
                <div className="mt-4 pt-3 border-t border-slate-800 text-xs font-mono space-y-2">
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Shots on Target: {m.homeShotsOnTarget}</span>
                    <span>Shots on Target: {m.awayShotsOnTarget}</span>
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                      <span>Possession {m.homePossession}%</span>
                      <span>{100 - m.homePossession}% Possession</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-950 rounded overflow-hidden flex">
                      <div
                        className="h-full bg-emerald-500"
                        style={{ width: `${m.homePossession}%` }}
                      />
                      <div
                        className="h-full bg-cyan-500"
                        style={{ width: `${100 - m.homePossession}%` }}
                      />
                    </div>
                  </div>

                  {/* Quick Test Shift Trigger */}
                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => handleSimulateShift(m.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[10px] font-bold transition-colors cursor-pointer"
                    >
                      <Zap className="w-3 h-3 text-amber-400" />
                      <span>TEST +{xgThreshold.toFixed(2)} xG SHIFT ALERT</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};


