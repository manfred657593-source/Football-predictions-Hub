import React from 'react';
import { Flame, TrendingDown, Minus } from 'lucide-react';

export function calculateStreak(form?: ('W' | 'D' | 'L')[]) {
  if (!form || form.length === 0) {
    return {
      count: 0,
      type: 'W' as const,
      typeName: 'Win',
      shortText: '0S',
      fullText: '0 Streak',
      color: 'text-slate-400',
      bg: 'bg-slate-800/40',
      border: 'border-slate-700/50',
    };
  }

  const lastType = form[form.length - 1];
  let count = 0;
  for (let i = form.length - 1; i >= 0; i--) {
    if (form[i] === lastType) {
      count++;
    } else {
      break;
    }
  }

  const typeName = lastType === 'W' ? 'Win' : lastType === 'L' ? 'Loss' : 'Draw';
  const plural = count > 1 ? 's' : '';
  const shortText = `${count}${lastType}`;
  const fullText = `${count} ${typeName}${plural} Streak`;

  let color = 'text-emerald-400';
  let bg = 'bg-emerald-500/15';
  let border = 'border-emerald-500/40';

  if (lastType === 'L') {
    color = 'text-rose-400';
    bg = 'bg-rose-500/15';
    border = 'border-rose-500/40';
  } else if (lastType === 'D') {
    color = 'text-amber-400';
    bg = 'bg-amber-500/15';
    border = 'border-amber-500/40';
  }

  return {
    count,
    type: lastType,
    typeName,
    shortText,
    fullText,
    color,
    bg,
    border,
  };
}

interface StreakBadgeProps {
  form?: ('W' | 'D' | 'L')[];
  size?: 'xs' | 'sm' | 'md';
  showIcon?: boolean;
  className?: string;
}

export const StreakBadge: React.FC<StreakBadgeProps> = ({
  form,
  size = 'sm',
  showIcon = true,
  className = '',
}) => {
  const streak = calculateStreak(form);

  const isWin = streak.type === 'W';
  const isLoss = streak.type === 'L';

  const textSize =
    size === 'xs'
      ? 'text-[8px] px-1 py-0.2'
      : size === 'sm'
      ? 'text-[9px] px-1.5 py-0.5'
      : 'text-[10px] px-2 py-0.5';

  return (
    <div
      className={`inline-flex items-center gap-1 rounded border font-mono font-bold tracking-tight ${streak.bg} ${streak.border} ${streak.color} ${textSize} ${className}`}
      title={streak.fullText}
    >
      {showIcon && (
        isWin ? (
          <Flame className="w-2.5 h-2.5 text-emerald-400 shrink-0 animate-pulse" />
        ) : isLoss ? (
          <TrendingDown className="w-2.5 h-2.5 text-rose-400 shrink-0" />
        ) : (
          <Minus className="w-2.5 h-2.5 text-amber-400 shrink-0" />
        )
      )}
      <span>{streak.fullText}</span>
    </div>
  );
};

export default StreakBadge;
