import React from 'react';
import { Card, CardContent } from './Card';
import { cn } from './utils';

export interface StatsCardProps {
  title: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
  description?: string;
  className?: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  change,
  trend = 'neutral',
  icon,
  description,
  className
}) => {
  const trendColors = {
    up: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    down: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    neutral: 'text-zinc-400 bg-zinc-800 border-zinc-700/50'
  };

  return (
    <Card className={cn("hover:shadow-2xl transition-all duration-300", className)}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">{title}</span>
          {icon && (
            <div className="p-2 rounded-lg bg-zinc-800/80 border border-zinc-700/50 text-blue-400">
              {icon}
            </div>
          )}
        </div>
        <div className="mt-3 flex items-baseline gap-3">
          <span className="text-2xl font-bold tracking-tight text-white">{value}</span>
          {change && (
            <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full border", trendColors[trend])}>
              {change}
            </span>
          )}
        </div>
        {description && (
          <p className="mt-2 text-xs text-zinc-500">{description}</p>
        )}
      </CardContent>
    </Card>
  );
};
