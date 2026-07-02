import React, { useEffect } from 'react';
import { Zap, X, ExternalLink, DollarSign } from 'lucide-react';
import { ArbitrageNotification, Team } from '../types';

interface ArbitrageToastProps {
  notification: ArbitrageNotification | null;
  onClose: () => void;
  onOpenCenter: () => void;
  onSelectMatchToAnalyze: (homeTeamObj: Team, awayTeamObj: Team) => void;
}

export const ArbitrageToast: React.FC<ArbitrageToastProps> = ({
  notification,
  onClose,
  onOpenCenter,
  onSelectMatchToAnalyze,
}) => {
  useEffect(() => {
    if (!notification) return;
    // Auto dismiss after 7 seconds
    const timer = setTimeout(() => {
      onClose();
    }, 7000);
    return () => clearTimeout(timer);
  }, [notification, onClose]);

  if (!notification) return null;

  return (
    <div className="fixed top-20 right-4 z-50 max-w-sm w-full bg-slate-900 border-2 border-amber-500/80 rounded-xl p-4 shadow-2xl shadow-amber-500/20 animate-slide-left font-sans text-slate-100">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 font-mono">
          <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-amber-400 uppercase tracking-wider block">
                +{notification.profitMargin.toFixed(2)}% ARBITRAGE
              </span>
              <span className="text-[9px] bg-emerald-950 px-1.5 py-0.2 rounded border border-emerald-500/30 text-emerald-400 font-bold">
                REAL ODDS
              </span>
            </div>
            <span className="text-[10px] text-slate-400">{notification.league}</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="text-slate-500 hover:text-slate-300 p-1 rounded cursor-pointer transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-2.5">
        <p className="font-bold text-sm text-slate-100">
          {notification.homeTeam} vs {notification.awayTeam}
        </p>
        <p className="text-xs text-slate-300 mt-1 font-mono">
          Best Odds: <span className="text-emerald-400 font-bold">{notification.bestHome.odds}</span> /{' '}
          <span className="text-amber-400 font-bold">{notification.bestDraw.odds}</span> /{' '}
          <span className="text-cyan-400 font-bold">{notification.bestAway.odds}</span>
        </p>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-slate-800 font-mono text-xs">
        <button
          onClick={() => {
            onClose();
            onOpenCenter();
          }}
          className="text-[11px] text-slate-400 hover:text-slate-200 underline cursor-pointer"
        >
          View all alerts
        </button>

        <button
          onClick={() => {
            if (notification.homeTeamObj && notification.awayTeamObj) {
              onSelectMatchToAnalyze(notification.homeTeamObj, notification.awayTeamObj);
              onClose();
            }
          }}
          className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded text-[11px] cursor-pointer transition-colors flex items-center gap-1 shadow"
        >
          <span>CALCULATE STAKES</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
