import React, { useState, useEffect } from 'react';
import { DollarSign, Percent, AlertCircle, TrendingUp, CheckCircle2, RefreshCw, Plus, Trash2, Zap } from 'lucide-react';
import { PredictionResult, BookieOdds } from '../types';
import { fetchLiveBookmakerOdds } from '../services/geminiService';
import { OddsSchedulerPanel } from './OddsSchedulerPanel';

interface ArbitrageCalculatorProps {
  predictionResult: PredictionResult;
}

export const ArbitrageCalculator: React.FC<ArbitrageCalculatorProps> = ({ predictionResult }) => {
  const [totalStake, setTotalStake] = useState<number>(100);
  const [loadingLiveOdds, setLoadingLiveOdds] = useState<boolean>(false);
  const [lastAutoSyncedTime, setLastAutoSyncedTime] = useState<string | null>(null);

  // Editable stateful bookmaker odds market

  const [bookies, setBookies] = useState<BookieOdds[]>([
    {
      bookmaker: 'Pinnacle',
      homeOdds: Number((predictionResult.fairOddsHome * 1.05).toFixed(2)),
      drawOdds: Number((predictionResult.fairOddsDraw * 1.04).toFixed(2)),
      awayOdds: Number((predictionResult.fairOddsAway * 1.06).toFixed(2)),
      isArb: false,
      homeEV: 0,
      drawEV: 0,
      awayEV: 0,
    },
    {
      bookmaker: 'Bet365',
      homeOdds: Number((predictionResult.fairOddsHome * 1.12).toFixed(2)),
      drawOdds: Number((predictionResult.fairOddsDraw * 0.96).toFixed(2)),
      awayOdds: Number((predictionResult.fairOddsAway * 0.98).toFixed(2)),
      isArb: false,
      homeEV: 0,
      drawEV: 0,
      awayEV: 0,
    },
    {
      bookmaker: 'Betfair Exchange',
      homeOdds: Number((predictionResult.fairOddsHome * 0.98).toFixed(2)),
      drawOdds: Number((predictionResult.fairOddsDraw * 1.15).toFixed(2)),
      awayOdds: Number((predictionResult.fairOddsAway * 1.02).toFixed(2)),
      isArb: false,
      homeEV: 0,
      drawEV: 0,
      awayEV: 0,
    },
    {
      bookmaker: 'Unibet',
      homeOdds: Number((predictionResult.fairOddsHome * 0.95).toFixed(2)),
      drawOdds: Number((predictionResult.fairOddsDraw * 0.97).toFixed(2)),
      awayOdds: Number((predictionResult.fairOddsAway * 1.18).toFixed(2)),
      isArb: false,
      homeEV: 0,
      drawEV: 0,
      awayEV: 0,
    },
  ]);

  // Sync default bookmaker baseline when selected fixture changes
  useEffect(() => {
    setBookies([
      {
        bookmaker: 'Pinnacle',
        homeOdds: Number((predictionResult.fairOddsHome * 1.05).toFixed(2)),
        drawOdds: Number((predictionResult.fairOddsDraw * 1.04).toFixed(2)),
        awayOdds: Number((predictionResult.fairOddsAway * 1.06).toFixed(2)),
        isArb: false,
        homeEV: 0,
        drawEV: 0,
        awayEV: 0,
      },
      {
        bookmaker: 'Bet365',
        homeOdds: Number((predictionResult.fairOddsHome * 1.12).toFixed(2)),
        drawOdds: Number((predictionResult.fairOddsDraw * 0.96).toFixed(2)),
        awayOdds: Number((predictionResult.fairOddsAway * 0.98).toFixed(2)),
        isArb: false,
        homeEV: 0,
        drawEV: 0,
        awayEV: 0,
      },
      {
        bookmaker: 'Betfair Exchange',
        homeOdds: Number((predictionResult.fairOddsHome * 0.98).toFixed(2)),
        drawOdds: Number((predictionResult.fairOddsDraw * 1.15).toFixed(2)),
        awayOdds: Number((predictionResult.fairOddsAway * 1.02).toFixed(2)),
        isArb: false,
        homeEV: 0,
        drawEV: 0,
        awayEV: 0,
      },
      {
        bookmaker: 'Unibet',
        homeOdds: Number((predictionResult.fairOddsHome * 0.95).toFixed(2)),
        drawOdds: Number((predictionResult.fairOddsDraw * 0.97).toFixed(2)),
        awayOdds: Number((predictionResult.fairOddsAway * 1.18).toFixed(2)),
        isArb: false,
        homeEV: 0,
        drawEV: 0,
        awayEV: 0,
      },
    ]);
  }, [predictionResult.homeTeamName, predictionResult.awayTeamName]);

  // Sync background job refreshed odds into state when scheduler triggers
  const handleSchedulerOddsSync = async () => {
    try {
      const h = predictionResult.homeTeamName;
      const a = predictionResult.awayTeamName;
      const res = await fetch(`/api/scheduler/cached-odds?homeTeam=${encodeURIComponent(h)}&awayTeam=${encodeURIComponent(a)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.found && json.data?.bookies && json.data.bookies.length > 0) {
          setBookies(
            json.data.bookies.map((b: any) => ({
              bookmaker: b.bookmaker,
              homeOdds: Number(b.homeOdds),
              drawOdds: Number(b.drawOdds),
              awayOdds: Number(b.awayOdds),
              isArb: false,
              homeEV: 0,
              drawEV: 0,
              awayEV: 0,
            }))
          );
          setLastAutoSyncedTime(json.data.refreshedAt || new Date().toLocaleTimeString());
        }
      }
    } catch (err) {
      console.warn('Failed to fetch cached background job odds:', err);
    }
  };

  // Handler to fetch live bookmaker odds via Gemini API
  const handleFetchLiveOdds = async () => {
    setLoadingLiveOdds(true);
    try {
      const liveData = await fetchLiveBookmakerOdds(
        predictionResult.homeTeamName,
        predictionResult.awayTeamName,
        predictionResult.fairOddsHome,
        predictionResult.fairOddsDraw,
        predictionResult.fairOddsAway
      );
      if (liveData && liveData.length > 0) {
        setBookies(liveData);
        setLastAutoSyncedTime(new Date().toLocaleTimeString());
      }
    } catch (err) {
      console.error('Error fetching live bookmaker odds:', err);
    } finally {
      setLoadingLiveOdds(false);
    }
  };

  // Handlers for dynamic table changes
  const handleOddsChange = (index: number, field: 'homeOdds' | 'drawOdds' | 'awayOdds' | 'bookmaker', val: any) => {
    setBookies((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const handleAddBookmaker = () => {
    setBookies((prev) => [
      ...prev,
      {
        bookmaker: `Bookie #${prev.length + 1}`,
        homeOdds: Number((predictionResult.fairOddsHome * 1.05).toFixed(2)),
        drawOdds: Number((predictionResult.fairOddsDraw * 1.05).toFixed(2)),
        awayOdds: Number((predictionResult.fairOddsAway * 1.05).toFixed(2)),
        isArb: false,
        homeEV: 0,
        drawEV: 0,
        awayEV: 0,
      },
    ]);
  };

  const handleRemoveBookmaker = (index: number) => {
    if (bookies.length <= 1) return;
    setBookies((prev) => prev.filter((_, i) => i !== index));
  };

  // Calculate EV for each bookmaker
  const evaluatedBookies = bookies.map((b) => ({
    ...b,
    homeEV: Number((predictionResult.homeWinProb * b.homeOdds - 1).toFixed(3)),
    drawEV: Number((predictionResult.drawProb * b.drawOdds - 1).toFixed(3)),
    awayEV: Number((predictionResult.awayWinProb * b.awayOdds - 1).toFixed(3)),
  }));

  // Find best odds across bookmakers
  const bestHome = evaluatedBookies.reduce((max, b) => (b.homeOdds > max.homeOdds ? b : max), evaluatedBookies[0]);
  const bestDraw = evaluatedBookies.reduce((max, b) => (b.drawOdds > max.drawOdds ? b : max), evaluatedBookies[0]);
  const bestAway = evaluatedBookies.reduce((max, b) => (b.awayOdds > max.awayOdds ? b : max), evaluatedBookies[0]);

  const impliedSum = 1 / bestHome.homeOdds + 1 / bestDraw.drawOdds + 1 / bestAway.awayOdds;
  const isArbitrage = impliedSum < 1.0;
  const profitMargin = isArbitrage ? ((1 - impliedSum) / impliedSum) * 100 : 0;

  const stakeHome = (totalStake * (1 / bestHome.homeOdds)) / impliedSum;
  const stakeDraw = (totalStake * (1 / bestDraw.drawOdds)) / impliedSum;
  const stakeAway = (totalStake * (1 / bestAway.awayOdds)) / impliedSum;

  return (
    <div className="space-y-6">
      {/* Embedded Background Job Scheduler Panel */}
      <OddsSchedulerPanel onOddsRefreshed={handleSchedulerOddsSync} />

      {/* Top Controls Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold font-mono text-slate-200 uppercase flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            Market Odds & Real Arbitrage Scanner
            {lastAutoSyncedTime && (
              <span className="text-[10px] bg-slate-950 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-normal flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-400" />
                Synced at {lastAutoSyncedTime}
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Compare live bookmaker lines vs Dixon-Coles model expected values (+EV)
          </p>
        </div>

        <button
          id="btn-fetch-live-odds"
          onClick={handleFetchLiveOdds}
          disabled={loadingLiveOdds}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono text-xs font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingLiveOdds ? 'animate-spin' : ''}`} />
          <span>{loadingLiveOdds ? 'FETCHING LIVE ODDS...' : 'SYNC LIVE MARKET ODDS'}</span>
        </button>
      </div>


      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Fair Odds Model Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="text-xs font-mono text-slate-400 font-bold uppercase tracking-wider mb-2">
            Model Fair Odds (No Margin)
          </div>
          <div className="grid grid-cols-3 gap-2 text-center font-mono">
            <div className="p-2 rounded bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-500 block">1 (Home)</span>
              <span className="text-sm font-bold text-emerald-400">
                @{predictionResult.fairOddsHome}
              </span>
            </div>
            <div className="p-2 rounded bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-500 block">X (Draw)</span>
              <span className="text-sm font-bold text-amber-400">
                @{predictionResult.fairOddsDraw}
              </span>
            </div>
            <div className="p-2 rounded bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-500 block">2 (Away)</span>
              <span className="text-sm font-bold text-cyan-400">
                @{predictionResult.fairOddsAway}
              </span>
            </div>
          </div>
        </div>

        {/* Best Market Odds Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="text-xs font-mono text-slate-400 font-bold uppercase tracking-wider mb-2">
            Best Market Odds
          </div>
          <div className="grid grid-cols-3 gap-2 text-center font-mono">
            <div className="p-2 rounded bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-500 block truncate">{bestHome.bookmaker}</span>
              <span className="text-sm font-bold text-emerald-400">@{bestHome.homeOdds}</span>
            </div>
            <div className="p-2 rounded bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-500 block truncate">{bestDraw.bookmaker}</span>
              <span className="text-sm font-bold text-amber-400">@{bestDraw.drawOdds}</span>
            </div>
            <div className="p-2 rounded bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-500 block truncate">{bestAway.bookmaker}</span>
              <span className="text-sm font-bold text-cyan-400">@{bestAway.awayOdds}</span>
            </div>
          </div>
        </div>

        {/* Arbitrage Alert Card */}
        <div
          className={`border rounded-xl p-4 shadow-lg flex flex-col justify-between ${
            isArbitrage
              ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
              : 'bg-slate-900 border-slate-800 text-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase tracking-wider">
              Arbitrage Status
            </span>
            {isArbitrage ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-slate-500" />
            )}
          </div>
          <div className="mt-2">
            {isArbitrage ? (
              <div>
                <span className="text-2xl font-black font-mono text-emerald-400">
                  +{profitMargin.toFixed(2)}% Guaranteed
                </span>
                <p className="text-[11px] text-emerald-200/80 mt-1">
                  Cross-bookmaker arbitrage opportunity detected!
                </p>
              </div>
            ) : (
              <div>
                <span className="text-lg font-bold font-mono text-slate-400">
                  Implied: {(impliedSum * 100).toFixed(1)}%
                </span>
                <p className="text-xs text-slate-500 mt-1">
                  Bookmaker margin is {( (impliedSum - 1) * 100 ).toFixed(2)}%. No direct arb present.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bookmaker Odds & Expected Value (EV) Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-slate-200">
            Bookmaker Odds & Expected Value (+EV) Analysis (Editable Market)
          </h3>
          <button
            id="btn-add-bookmaker"
            onClick={handleAddBookmaker}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-mono text-xs rounded transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>Add Bookmaker</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse font-mono text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-slate-950">
                <th className="p-3 text-left">Bookmaker Name</th>
                <th className="p-3 text-center">Home Odds</th>
                <th className="p-3 text-center">Draw Odds</th>
                <th className="p-3 text-center">Away Odds</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {evaluatedBookies.map((b, idx) => (
                <tr key={idx} className="border-b border-slate-800/60 hover:bg-slate-800/40">
                  <td className="p-3 font-bold text-slate-200">
                    <input
                      type="text"
                      value={b.bookmaker}
                      onChange={(e) => handleOddsChange(idx, 'bookmaker', e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 text-xs w-36 focus:outline-none focus:border-emerald-500 font-bold"
                    />
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <input
                        type="number"
                        step="0.05"
                        value={b.homeOdds}
                        onChange={(e) => handleOddsChange(idx, 'homeOdds', parseFloat(e.target.value) || 1.01)}
                        className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-emerald-400 text-xs w-20 text-center font-bold focus:outline-none focus:border-emerald-500"
                      />
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                          b.homeEV > 0
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'text-slate-500'
                        }`}
                      >
                        {b.homeEV > 0 ? `+${(b.homeEV * 100).toFixed(1)}%` : `${(b.homeEV * 100).toFixed(1)}%`}
                      </span>
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <input
                        type="number"
                        step="0.05"
                        value={b.drawOdds}
                        onChange={(e) => handleOddsChange(idx, 'drawOdds', parseFloat(e.target.value) || 1.01)}
                        className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-amber-400 text-xs w-20 text-center font-bold focus:outline-none focus:border-emerald-500"
                      />
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                          b.drawEV > 0
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'text-slate-500'
                        }`}
                      >
                        {b.drawEV > 0 ? `+${(b.drawEV * 100).toFixed(1)}%` : `${(b.drawEV * 100).toFixed(1)}%`}
                      </span>
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <input
                        type="number"
                        step="0.05"
                        value={b.awayOdds}
                        onChange={(e) => handleOddsChange(idx, 'awayOdds', parseFloat(e.target.value) || 1.01)}
                        className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-cyan-400 text-xs w-20 text-center font-bold focus:outline-none focus:border-emerald-500"
                      />
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                          b.awayEV > 0
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'text-slate-500'
                        }`}
                      >
                        {b.awayEV > 0 ? `+${(b.awayEV * 100).toFixed(1)}%` : `${(b.awayEV * 100).toFixed(1)}%`}
                      </span>
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => handleRemoveBookmaker(idx)}
                      disabled={bookies.length <= 1}
                      className="p-1 text-slate-500 hover:text-rose-400 transition-colors disabled:opacity-30 cursor-pointer"
                      title="Remove Bookmaker"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stake Calculator */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-slate-200">
              Optimal Stake Sizing & Arbitrage Distribution
            </h3>
            <p className="text-xs text-slate-400">
              Calculates exact stake allocation across top odds for guaranteed payoff
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400">Bankroll / Total Stake:</span>
            <div className="relative">
              <span className="absolute left-2.5 top-2 text-xs font-mono text-slate-500">$</span>
              <input
                id="input-total-stake"
                type="number"
                value={totalStake}
                onChange={(e) => setTotalStake(Math.max(1, Number(e.target.value)))}
                className="w-24 pl-6 pr-2 py-1 bg-slate-950 border border-slate-700 rounded text-xs font-mono font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono">
          <div className="p-4 rounded-lg bg-slate-950 border border-slate-800">
            <div className="text-xs text-slate-400 font-bold mb-1">
              Bet 1: {predictionResult.homeTeamName} ({bestHome.bookmaker})
            </div>
            <div className="text-lg font-bold text-emerald-400">${stakeHome.toFixed(2)}</div>
            <div className="text-[11px] text-slate-500 mt-1">
              Return: ${(stakeHome * bestHome.homeOdds).toFixed(2)} (@{bestHome.homeOdds})
            </div>
          </div>

          <div className="p-4 rounded-lg bg-slate-950 border border-slate-800">
            <div className="text-xs text-slate-400 font-bold mb-1">
              Bet 2: Draw ({bestDraw.bookmaker})
            </div>
            <div className="text-lg font-bold text-amber-400">${stakeDraw.toFixed(2)}</div>
            <div className="text-[11px] text-slate-500 mt-1">
              Return: ${(stakeDraw * bestDraw.drawOdds).toFixed(2)} (@{bestDraw.drawOdds})
            </div>
          </div>

          <div className="p-4 rounded-lg bg-slate-950 border border-slate-800">
            <div className="text-xs text-slate-400 font-bold mb-1">
              Bet 3: {predictionResult.awayTeamName} ({bestAway.bookmaker})
            </div>
            <div className="text-lg font-bold text-cyan-400">${stakeAway.toFixed(2)}</div>
            <div className="text-[11px] text-slate-500 mt-1">
              Return: ${(stakeAway * bestAway.awayOdds).toFixed(2)} (@{bestAway.awayOdds})
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

