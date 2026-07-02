import React, { useState, useEffect } from 'react';
import {
  Clock,
  RefreshCw,
  Power,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Activity,
  Zap,
  Layers,
  TrendingUp,
  Database,
} from 'lucide-react';
import { SchedulerStatusResponse, BackgroundJobLog } from '../types';

interface OddsSchedulerPanelProps {
  onOddsRefreshed?: () => void;
  className?: string;
}

export const OddsSchedulerPanel: React.FC<OddsSchedulerPanelProps> = ({
  onOddsRefreshed,
  className = '',
}) => {
  const [status, setStatus] = useState<SchedulerStatusResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [triggering, setTriggering] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(30);
  const [showLogs, setShowLogs] = useState<boolean>(true);

  // Fetch status from API
  const fetchSchedulerStatus = async () => {
    try {
      const res = await fetch('/api/scheduler/status');
      if (res.ok) {
        const data: SchedulerStatusResponse = await res.json();
        setStatus(data);
        if (data.nextRunCountdownSeconds) {
          setCountdown(data.nextRunCountdownSeconds);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch scheduler status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedulerStatus();
    // Poll scheduler status every 3 seconds for UI sync
    const statusInterval = setInterval(fetchSchedulerStatus, 3000);

    // Local 1s tick down timer for smooth visual feedback
    const tickInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Trigger refresh callback when countdown hits zero
          if (onOddsRefreshed) onOddsRefreshed();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(statusInterval);
      clearInterval(tickInterval);
    };
  }, []);

  // Update scheduler configuration (Enable/Disable, Interval)
  const handleToggleScheduler = async (newEnabled: boolean) => {
    try {
      const res = await fetch('/api/scheduler/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: newEnabled }),
      });
      if (res.ok) {
        await fetchSchedulerStatus();
      }
    } catch (err) {
      console.error('Error toggling scheduler:', err);
    }
  };

  const handleChangeInterval = async (newInterval: number) => {
    try {
      const res = await fetch('/api/scheduler/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshIntervalSeconds: newInterval }),
      });
      if (res.ok) {
        await fetchSchedulerStatus();
      }
    } catch (err) {
      console.error('Error updating interval:', err);
    }
  };

  const handleManualTrigger = async () => {
    setTriggering(true);
    try {
      const res = await fetch('/api/scheduler/trigger', { method: 'POST' });
      if (res.ok) {
        await fetchSchedulerStatus();
        if (onOddsRefreshed) onOddsRefreshed();
      }
    } catch (err) {
      console.error('Error triggering background job:', err);
    } finally {
      setTriggering(false);
    }
  };

  const isEnabled = status?.config?.enabled ?? true;
  const currentInterval = status?.config?.refreshIntervalSeconds ?? 30;

  return (
    <div
      id="odds-scheduler-panel"
      className={`bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl font-mono space-y-5 ${className}`}
    >
      {/* Header with Control Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <span>Background Odds Refresh Scheduler</span>
                {isEnabled ? (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    AUTO-SYNC ACTIVE
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-800 text-slate-400 border border-slate-700">
                    PAUSED
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Automated worker background polling external sports APIs to keep arbitrage & EV metrics locked
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Refresh Interval Selector */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-2.5 py-1.5 rounded-lg text-xs">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400 text-[11px]">Interval:</span>
            <select
              value={currentInterval}
              onChange={(e) => handleChangeInterval(Number(e.target.value))}
              className="bg-transparent text-emerald-400 font-bold focus:outline-none cursor-pointer"
            >
              <option value={15} className="bg-slate-900 text-slate-200">15 seconds</option>
              <option value={30} className="bg-slate-900 text-slate-200">30 seconds</option>
              <option value={60} className="bg-slate-900 text-slate-200">1 minute</option>
              <option value={300} className="bg-slate-900 text-slate-200">5 minutes</option>
            </select>
          </div>

          {/* Pause / Resume Button */}
          <button
            id="btn-toggle-scheduler"
            onClick={() => handleToggleScheduler(!isEnabled)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              isEnabled
                ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            <span>{isEnabled ? 'Pause Scheduler' : 'Start Auto-Sync'}</span>
          </button>

          {/* Instant Trigger Button */}
          <button
            id="btn-trigger-background-job"
            onClick={handleManualTrigger}
            disabled={triggering}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${triggering ? 'animate-spin' : ''}`} />
            <span>{triggering ? 'Refreshing...' : 'Trigger Now'}</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
          <div className="flex items-center justify-between text-slate-500 text-[10px] uppercase font-bold mb-1">
            <span>Next Refresh In</span>
            <Clock className="w-3 h-3 text-cyan-400" />
          </div>
          <div className="text-xl font-extrabold text-cyan-400 flex items-baseline gap-1">
            <span>{isEnabled ? `${countdown}s` : 'OFF'}</span>
            {isEnabled && <span className="text-[10px] text-slate-500 font-normal">countdown</span>}
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
          <div className="flex items-center justify-between text-slate-500 text-[10px] uppercase font-bold mb-1">
            <span>Total Sync Runs</span>
            <Activity className="w-3 h-3 text-emerald-400" />
          </div>
          <div className="text-xl font-extrabold text-emerald-400">
            {status?.totalRunCount ?? 0}
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
          <div className="flex items-center justify-between text-slate-500 text-[10px] uppercase font-bold mb-1">
            <span>Odds Lines Updated</span>
            <Database className="w-3 h-3 text-amber-400" />
          </div>
          <div className="text-xl font-extrabold text-amber-400">
            {status?.totalOddsUpdates ?? 0}
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
          <div className="flex items-center justify-between text-slate-500 text-[10px] uppercase font-bold mb-1">
            <span>Active Arbs Found</span>
            <TrendingUp className="w-3 h-3 text-violet-400" />
          </div>
          <div className="text-xl font-extrabold text-violet-400">
            {status?.activeArbitrageOpportunities ?? 0}
          </div>
        </div>
      </div>

      {/* Scheduler Activity Log Feed */}
      <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            Background Scheduler Job Logs
          </span>
          <button
            onClick={() => setShowLogs(!showLogs)}
            className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
          >
            {showLogs ? 'Hide Activity Feed' : 'Show Activity Feed'}
          </button>
        </div>

        {showLogs && (
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {status?.recentLogs && status.recentLogs.length > 0 ? (
              status.recentLogs.map((log: BackgroundJobLog) => (
                <div
                  key={log.id}
                  className="flex items-start justify-between bg-slate-900/90 border border-slate-800/80 p-2 rounded text-[11px] gap-2 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    {log.status === 'SUCCESS' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    ) : log.status === 'WARNING' ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                    )}

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-300 font-bold">{log.message}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                        <span>Source: <span className="text-slate-400 font-semibold">{log.sourceUsed}</span></span>
                        <span>•</span>
                        <span>Execution: <span className="text-cyan-400">{log.executionDurationMs}ms</span></span>
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] text-slate-500 font-semibold shrink-0">
                    {log.timestamp}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-xs text-slate-500">
                Initializing background job scheduler execution logs...
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default OddsSchedulerPanel;
