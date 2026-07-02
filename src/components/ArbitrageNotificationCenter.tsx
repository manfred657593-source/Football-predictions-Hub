import React, { useState } from 'react';
import {
  Bell,
  Zap,
  DollarSign,
  Filter,
  CheckCheck,
  Trash2,
  X,
  ChevronRight,
  TrendingUp,
  ShieldAlert,
  Sparkles,
  ExternalLink,
  RefreshCw,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import { ArbitrageNotification, NotificationSettings, Team } from '../types';

interface ArbitrageNotificationCenterProps {
  notifications: ArbitrageNotification[];
  settings: NotificationSettings;
  onUpdateSettings: (newSettings: NotificationSettings) => void;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
  onDismissNotification: (id: string) => void;
  onScanNow: () => void;
  isScanning: boolean;
  onSelectMatchToAnalyze: (homeTeamObj: Team, awayTeamObj: Team) => void;
  availableLeagues: string[];
}

export const ArbitrageNotificationCenter: React.FC<ArbitrageNotificationCenterProps> = ({
  notifications,
  settings,
  onUpdateSettings,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearAll,
  onDismissNotification,
  onScanNow,
  isScanning,
  onSelectMatchToAnalyze,
  availableLeagues,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [selectedLeagueFilter, setSelectedLeagueFilter] = useState<string>('All');
  const [showSettingsPanel, setShowSettingsPanel] = useState<boolean>(false);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const maxProfitMargin = notifications.length > 0
    ? Math.max(...notifications.map((n) => n.profitMargin))
    : 0;

  // Filter notifications by active league tab inside notification drawer
  const filteredNotifications = notifications.filter((n) => {
    if (selectedLeagueFilter === 'All') return true;
    return n.league === selectedLeagueFilter;
  });

  const handleToggleLeagueMonitored = (league: string) => {
    let updated: string[];
    if (league === 'All') {
      updated = ['All'];
    } else {
      const current = settings.monitoredLeagues.filter((l) => l !== 'All');
      if (current.includes(league)) {
        updated = current.filter((l) => l !== league);
        if (updated.length === 0) updated = ['All'];
      } else {
        updated = [...current, league];
      }
    }
    onUpdateSettings({ ...settings, monitoredLeagues: updated });
  };

  return (
    <>
      {/* Header Notification Bell Trigger Button */}
      <button
        id="btn-open-arbitrage-notifications"
        onClick={() => setIsOpen(true)}
        className="relative p-2 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-slate-100 transition-all cursor-pointer flex items-center justify-center group"
        title="Arbitrage Alert Center"
      >
        <Bell className={`w-4 h-4 ${unreadCount > 0 ? 'text-amber-400 animate-bounce' : 'text-slate-400'}`} />
        
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-black font-mono bg-amber-500 text-slate-950 shadow-md ring-2 ring-slate-950 flex items-center justify-center min-w-[18px]">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Slide-over Notification Drawer Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/70 backdrop-blur-sm flex justify-end animate-fade-in">
          {/* Main Drawer Container */}
          <div className="w-full max-w-xl bg-slate-950 border-l border-slate-800 h-full flex flex-col shadow-2xl overflow-hidden animate-slide-left">
            
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-sm text-slate-100 uppercase font-mono tracking-tight flex items-center gap-2">
                      <span>Arbitrage Alert Center</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold hidden sm:inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" /> 100% REAL FEEDS
                      </span>
                    </h2>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-mono font-bold">
                        {unreadCount} UNREAD
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Verified real-world bookmaker market telemetry (The Odds API, Pinnacle, Bet365, Betfair)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  id="btn-toggle-notification-settings"
                  onClick={() => setShowSettingsPanel(!showSettingsPanel)}
                  className={`p-2 rounded-lg border text-xs font-mono transition-colors cursor-pointer ${
                    showSettingsPanel
                      ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                  title="Configure Monitored Leagues & Settings"
                >
                  <Sliders className="w-4 h-4" />
                </button>

                <button
                  id="btn-close-arbitrage-notifications"
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Stats Bar */}
            <div className="grid grid-cols-3 gap-2 p-3 bg-slate-900/40 border-b border-slate-800 text-center font-mono text-xs">
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">TOTAL ALERTS</span>
                <span className="font-bold text-slate-200 text-sm">{notifications.length}</span>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">MAX PROFIT</span>
                <span className="font-bold text-emerald-400 text-sm">
                  {maxProfitMargin > 0 ? `+${maxProfitMargin.toFixed(2)}%` : '0.00%'}
                </span>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">MONITORED</span>
                <span className="font-bold text-cyan-400 text-sm">
                  {settings.monitoredLeagues.includes('All')
                    ? 'ALL LEAGUES'
                    : `${settings.monitoredLeagues.length} LEAGUES`}
                </span>
              </div>
            </div>

            {/* Collapsible Settings / Monitored Leagues Panel */}
            {showSettingsPanel && (
              <div className="p-4 bg-slate-900 border-b border-slate-800 space-y-3 font-mono text-xs animate-fade-in">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200 flex items-center gap-1.5 uppercase text-[11px]">
                    <Filter className="w-3.5 h-3.5 text-cyan-400" />
                    Monitored Leagues Selection:
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Toggle leagues to auto-detect arbitrage
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => handleToggleLeagueMonitored('All')}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition-colors ${
                      settings.monitoredLeagues.includes('All')
                        ? 'bg-cyan-500 text-slate-950 font-black'
                        : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    ALL LEAGUES
                  </button>
                  {availableLeagues.filter((l) => l !== 'All').map((lg) => {
                    const isMonitored = settings.monitoredLeagues.includes(lg);
                    return (
                      <button
                        key={lg}
                        onClick={() => handleToggleLeagueMonitored(lg)}
                        className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition-colors ${
                          isMonitored
                            ? 'bg-emerald-500 text-slate-950 font-black'
                            : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
                        }`}
                      >
                        {lg}
                      </button>
                    );
                  })}
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-[11px]">Min Profit Threshold:</span>
                    <select
                      value={settings.minProfitMargin}
                      onChange={(e) =>
                        onUpdateSettings({ ...settings, minProfitMargin: parseFloat(e.target.value) })
                      }
                      className="bg-slate-950 border border-slate-800 text-emerald-400 text-xs rounded px-2 py-1 focus:outline-none cursor-pointer font-bold"
                    >
                      <option value="0.5">+0.5% Profit Margin</option>
                      <option value="1.0">+1.0% Profit Margin</option>
                      <option value="1.5">+1.5% Profit Margin</option>
                      <option value="2.0">+2.0% Profit Margin</option>
                      <option value="3.0">+3.0% Profit Margin (Critical)</option>
                    </select>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-300">
                    <input
                      type="checkbox"
                      checked={settings.enableToasts}
                      onChange={(e) => onUpdateSettings({ ...settings, enableToasts: e.target.checked })}
                      className="rounded bg-slate-950 border-slate-800 text-cyan-500 focus:ring-0"
                    />
                    <span>Popup Toast Banner</span>
                  </label>
                </div>
              </div>
            )}

            {/* Quick Actions & League Tabs Bar */}
            <div className="p-3 border-b border-slate-800 bg-slate-900/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
              {/* League Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                {availableLeagues.map((lg) => (
                  <button
                    key={lg}
                    onClick={() => setSelectedLeagueFilter(lg)}
                    className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold whitespace-nowrap cursor-pointer transition-colors ${
                      selectedLeagueFilter === lg
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {lg}
                  </button>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 shrink-0 justify-end font-mono">
                <button
                  id="btn-scan-monitored-leagues"
                  onClick={onScanNow}
                  disabled={isScanning}
                  className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[11px] font-black rounded cursor-pointer transition-colors flex items-center gap-1 disabled:opacity-50"
                  title="Scan monitored leagues now"
                >
                  <RefreshCw className={`w-3 h-3 ${isScanning ? 'animate-spin' : ''}`} />
                  <span>{isScanning ? 'SCANNING...' : 'SCAN NOW'}</span>
                </button>

                {unreadCount > 0 && (
                  <button
                    onClick={onMarkAllAsRead}
                    className="p-1 px-2 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-[11px] cursor-pointer flex items-center gap-1"
                    title="Mark all as read"
                  >
                    <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="hidden sm:inline">READ ALL</span>
                  </button>
                )}

                {notifications.length > 0 && (
                  <button
                    onClick={onClearAll}
                    className="p-1 px-2 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-rose-400 text-[11px] cursor-pointer flex items-center gap-1"
                    title="Clear all alerts"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Notification List Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {filteredNotifications.length === 0 ? (
                <div className="p-8 text-center bg-slate-900/50 border border-dashed border-slate-800 rounded-xl space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 text-slate-500 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  </div>
                  <h3 className="text-sm font-mono font-bold text-slate-300 uppercase">
                    No Real Discrepancies at Current Market Lines
                  </h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    No active arbitrage profit opportunities detected for {selectedLeagueFilter === 'All' ? 'selected leagues' : selectedLeagueFilter} across live Pinnacle, Bet365, Betfair, and Unibet market feeds.
                  </p>
                  <button
                    onClick={onScanNow}
                    disabled={isScanning}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono text-xs font-black rounded-lg cursor-pointer transition-colors inline-flex items-center gap-2"
                  >
                    <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
                    <span>RE-SCAN LIVE BOOKMAKER FEEDS</span>
                  </button>
                </div>
              ) : (
                filteredNotifications.map((n) => {
                  return (
                    <div
                      key={n.id}
                      className={`p-4 rounded-xl border transition-all relative ${
                        !n.read
                          ? 'bg-slate-900/90 border-amber-500/50 ring-1 ring-amber-500/30 shadow-lg'
                          : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      {/* Top Bar with Severity & Timestamp */}
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2 font-mono">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                              n.severity === 'CRITICAL'
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse'
                                : n.severity === 'HIGH'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            }`}
                          >
                            <Zap className="w-3 h-3" />
                            <span>+{n.profitMargin.toFixed(2)}% REAL ARBITRAGE</span>
                          </span>

                          <span className="text-[10px] bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30 text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" /> VERIFIED REAL ODDS
                          </span>

                          <span className="text-[10px] bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-slate-400">
                            {n.league}
                          </span>

                          {!n.read && (
                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-slate-500 text-[10px]">
                          <span>{n.detectedAt}</span>
                          <button
                            onClick={() => onDismissNotification(n.id)}
                            className="text-slate-500 hover:text-rose-400 p-0.5 rounded cursor-pointer"
                            title="Dismiss notification"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Match Name Header */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <h4 className="font-bold text-sm text-slate-100 flex items-center gap-2 font-sans">
                          <span>{n.homeTeam}</span>
                          <span className="text-slate-500 text-xs font-mono font-normal">vs</span>
                          <span>{n.awayTeam}</span>
                        </h4>

                        <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          Sum: {(n.impliedSum * 100).toFixed(1)}%
                        </span>
                      </div>

                      {/* Bookmaker Odds Grid */}
                      <div className="grid grid-cols-3 gap-2 bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 mb-3 text-center font-mono">
                        <div>
                          <span className="text-[9px] text-slate-500 block">HOME (1)</span>
                          <span className="text-xs font-bold text-emerald-400">{n.bestHome.odds.toFixed(2)}</span>
                          <span className="text-[9px] text-slate-400 block truncate">{n.bestHome.bookmaker}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-500 block">DRAW (X)</span>
                          <span className="text-xs font-bold text-amber-400">{n.bestDraw.odds.toFixed(2)}</span>
                          <span className="text-[9px] text-slate-400 block truncate">{n.bestDraw.bookmaker}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-500 block">AWAY (2)</span>
                          <span className="text-xs font-bold text-cyan-400">{n.bestAway.odds.toFixed(2)}</span>
                          <span className="text-[9px] text-slate-400 block truncate">{n.bestAway.bookmaker}</span>
                        </div>
                      </div>

                      {/* Recommended $100 Stake Breakdown */}
                      {n.recommendedStake100 && (
                        <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 text-[11px] font-mono mb-3 space-y-1">
                          <div className="flex justify-between text-slate-400 text-[10px] font-bold uppercase border-b border-slate-800/60 pb-1">
                            <span>$100 Stake Distribution</span>
                            <span className="text-emerald-400 font-bold">Payout: ${n.recommendedStake100.payout}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-300 pt-0.5">
                            <div>Bet <span className="text-emerald-400 font-bold">${n.recommendedStake100.home}</span> on Home</div>
                            <div>Bet <span className="text-amber-400 font-bold">${n.recommendedStake100.draw}</span> on Draw</div>
                            <div>Bet <span className="text-cyan-400 font-bold">${n.recommendedStake100.away}</span> on Away</div>
                          </div>
                        </div>
                      )}

                      {/* Card Bottom Actions */}
                      <div className="flex items-center justify-between gap-2 pt-1 font-mono text-xs">
                        {!n.read ? (
                          <button
                            onClick={() => onMarkAsRead(n.id)}
                            className="text-[11px] text-slate-400 hover:text-slate-200 cursor-pointer flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Mark as read</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-500 flex items-center gap-1">
                            <CheckCheck className="w-3.5 h-3.5 text-slate-500" />
                            <span>Read</span>
                          </span>
                        )}

                        <button
                          id={`btn-analyze-arb-${n.id}`}
                          onClick={() => {
                            if (n.homeTeamObj && n.awayTeamObj) {
                              onSelectMatchToAnalyze(n.homeTeamObj, n.awayTeamObj);
                              setIsOpen(false);
                            }
                          }}
                          className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded cursor-pointer transition-colors flex items-center gap-1 shadow"
                        >
                          <span>ANALYZE ODDS & CALCULATE</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-slate-800 bg-slate-900/90 text-center text-[10px] font-mono text-slate-500">
              Real-time local state arbitrage monitor • Updates automatically on market sync
            </div>
          </div>
        </div>
      )}
    </>
  );
};
