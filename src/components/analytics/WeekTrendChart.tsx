'use client';

import { Card } from '@/components/shared';
import { TrendsData } from '@/hooks/useAnalytics';

interface WeekTrendChartProps {
  data: TrendsData;
}

export function WeekTrendChart({ data }: WeekTrendChartProps) {
  const { data: points, parentAName, parentBName } = data;

  if (points.length === 0) {
    return (
      <Card>
        <p className="text-text-tertiary text-center py-8">
          No trend data yet. Complete your first week to see trends.
        </p>
      </Card>
    );
  }

  // Find max for scaling
  const maxEvents = Math.max(...points.map((p) => Math.max(p.parentAEvents, p.parentBEvents)), 1);
  const chartHeight = 120;

  return (
    <Card>
      <h3 className="font-medium text-text-primary mb-4">Weekly Events</h3>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-parent-a" />
          <span className="text-text-secondary">{parentAName}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-parent-b" />
          <span className="text-text-secondary">{parentBName}</span>
        </div>
      </div>

      {/* Chart */}
      <div className="relative" style={{ height: chartHeight }}>
        <div className="absolute inset-0 flex items-end justify-between gap-1">
          {points.map((point, i) => (
            <div key={point.weekKey} className="flex-1 flex flex-col items-center gap-1">
              {/* Bars */}
              <div className="w-full flex gap-0.5 items-end" style={{ height: chartHeight - 20 }}>
                <div
                  className="flex-1 bg-parent-a rounded-t transition-all"
                  style={{ height: `${(point.parentAEvents / maxEvents) * 100}%` }}
                  title={`${parentAName}: ${point.parentAEvents}`}
                />
                <div
                  className="flex-1 bg-parent-b rounded-t transition-all"
                  style={{ height: `${(point.parentBEvents / maxEvents) * 100}%` }}
                  title={`${parentBName}: ${point.parentBEvents}`}
                />
              </div>
              {/* Label */}
              <span className="text-xs text-text-tertiary">{point.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Summary stats */}
      <div className="mt-4 pt-4 border-t border-border grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-2xl font-semibold text-text-primary">{data.summary.avgEventsPerWeek}</p>
          <p className="text-xs text-text-tertiary">Avg events/week</p>
        </div>
        <div>
          <p className="text-2xl font-semibold text-text-primary">{data.summary.avgConflictsPerWeek}</p>
          <p className="text-xs text-text-tertiary">Avg conflicts/week</p>
        </div>
        <div>
          <p className="text-2xl font-semibold text-text-primary">{data.summary.totalWeeks}</p>
          <p className="text-xs text-text-tertiary">Weeks tracked</p>
        </div>
      </div>
    </Card>
  );
}
