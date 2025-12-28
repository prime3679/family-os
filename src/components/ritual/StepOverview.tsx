'use client';

import { Event, WeekSummary } from '@/data/mock-data';
import { Card, Button, Skeleton } from '@/components/shared';

interface WeekDay {
  key: Event['day'];
  short: string;
  date: string;
  full: string;
}

interface StepOverviewProps {
  onNext: () => void;
  events: Event[];
  weekSummary: WeekSummary;
  currentWeek: {
    label: string;
    range: string;
    year: number;
    days: WeekDay[];
  };
  aiNarrative?: string;
  isLoadingAI?: boolean;
}

export default function StepOverview({
  onNext,
  events,
  weekSummary,
  currentWeek,
  aiNarrative,
  isLoadingAI = false
}: StepOverviewProps) {
  const { totalEvents, handoffs, travelDays, soloParentingDays, intensity, heaviestDay, narrative } = weekSummary;

  // Prefer AI-generated narrative when available
  const displayNarrative = aiNarrative || narrative;

  // Calculate events per day for visualization
  const eventsByDay = currentWeek.days.map(day => ({
    ...day,
    count: events.filter(e => e.day === day.key).length,
  }));

  const maxEvents = Math.max(...eventsByDay.map(d => d.count));

  const intensityColors = {
    light: 'bg-accent-calm/20 text-accent-calm',
    moderate: 'bg-accent-warm/20 text-accent-primary',
    heavy: 'bg-accent-alert/20 text-accent-alert',
    intense: 'bg-conflict-high/20 text-conflict-high',
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Week intensity badge */}
      <div className="text-center">
        <span className={`inline-block px-4 py-1.5 rounded-full text-sm font-medium ${intensityColors[intensity]}`}>
          {intensity.charAt(0).toUpperCase() + intensity.slice(1)} week ahead
        </span>
      </div>

      {/* Week visualization - not a calendar, a feeling */}
      <Card variant="warm" className="overflow-hidden">
        <div className="mb-6">
          <h3 className="font-serif text-lg text-text-primary">The shape of your week</h3>
          <p className="text-sm text-text-secondary mt-1">
            {currentWeek.range} • {heaviestDay} is your busiest day
          </p>
        </div>

        {/* Visual representation */}
        <div className="flex items-end justify-between gap-2 h-32 mb-4">
          {eventsByDay.map((day) => {
            const height = maxEvents > 0 ? (day.count / maxEvents) * 100 : 20;
            const isHeavy = day.count >= maxEvents * 0.8;

            return (
              <div key={day.key} className="flex-1 flex flex-col items-center">
                <div
                  className={`
                    w-full rounded-t-lg transition-all duration-500
                    ${isHeavy ? 'bg-accent-alert/60' : 'bg-accent-warm/40'}
                  `}
                  style={{ height: `${Math.max(height, 15)}%` }}
                />
                <div className="mt-2 text-center">
                  <span className="text-xs font-medium text-text-secondary">{day.short}</span>
                  <span className="block text-xs text-text-tertiary">{day.count}</span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Events" value={totalEvents} />
        <StatCard label="Handoffs" value={handoffs} />
        <StatCard label="Travel days" value={travelDays} />
        <StatCard label="Solo parenting" value={soloParentingDays} />
      </div>

      {/* Narrative summary - with skeleton loading */}
      {isLoadingAI && !aiNarrative ? (
        <Skeleton.Narrative />
      ) : (
        <Card>
          <p className="text-text-secondary leading-relaxed whitespace-pre-line">
            {displayNarrative}
          </p>
        </Card>
      )}

      {/* Call to action */}
      <div className="text-center pt-4">
        <p className="text-text-tertiary mb-4">Let&apos;s walk through the details together.</p>
        <Button size="lg" onClick={onNext}>
          Show me the tricky spots
          <svg className="h-5 w-5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Button>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-surface-alt rounded-xl p-4 text-center">
      <div className="font-serif text-2xl text-text-primary">{value}</div>
      <div className="text-sm text-text-tertiary">{label}</div>
    </div>
  );
}
