'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Event } from '@/data/mock-data';
import { Card, Button } from '@/components/shared';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import { getCurrentWeek, detectConflicts, generateWeekSummary } from '@/lib/calendar/analyzeWeek';

export default function WeekPage() {
  const { events, isLoading, isUsingMockData } = useCalendarEvents();

  // Compute week data from events
  const currentWeek = useMemo(() => getCurrentWeek(), []);
  const conflicts = useMemo(() => detectConflicts(events), [events]);
  const weekSummary = useMemo(() => generateWeekSummary(events, conflicts), [events, conflicts]);

  const dayMap: Record<string, Event['day']> = {
    Mon: 'mon', Tue: 'tue', Wed: 'wed', Thu: 'thu', Fri: 'fri', Sat: 'sat', Sun: 'sun',
  };

  const getEventsForDay = (dayShort: string) => {
    const day = dayMap[dayShort];
    return events.filter(e => e.day === day);
  };

  const dayHasConflicts = (dayShort: string) => {
    const day = dayMap[dayShort];
    // Check if any conflict mentions this day
    const dayName = {
      mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday',
      fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
    }[day];
    return conflicts.some(c => c.day === dayName);
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="h-8 w-8 border-2 border-accent-warm border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-text-secondary">Loading your week...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-serif text-2xl text-text-primary">{currentWeek.label}</h1>
          <p className="text-text-secondary">{currentWeek.range}</p>
        </div>
        <Link href="/app/ritual">
          <Button variant="warm">
            <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Run ritual again
          </Button>
        </Link>
      </div>

      {/* Mock data banner */}
      {isUsingMockData && (
        <div className="mb-6 rounded-lg bg-accent-warm/10 border border-accent-warm/30 p-4 text-center">
          <p className="text-sm text-text-secondary">
            <span className="font-medium">Demo mode:</span> Showing sample data.{' '}
            <Link href="/app/settings/calendars" className="text-accent-primary hover:underline">
              Connect your calendar
            </Link>{' '}
            to see real events.
          </p>
        </div>
      )}

      {/* Week summary bar */}
      <Card className="mb-8" variant="subtle">
        <div className="flex flex-wrap items-center gap-6 text-sm">
          <div>
            <span className="text-text-tertiary">Events:</span>
            <span className="ml-2 font-medium text-text-primary">{weekSummary.totalEvents}</span>
          </div>
          <div>
            <span className="text-text-tertiary">Conflicts:</span>
            <span className="ml-2 font-medium text-accent-alert">{conflicts.length}</span>
          </div>
          <div>
            <span className="text-text-tertiary">Busiest:</span>
            <span className="ml-2 font-medium text-text-primary">{weekSummary.heaviestDay}</span>
          </div>
          <div>
            <span className="text-text-tertiary">Intensity:</span>
            <span className="ml-2 font-medium text-text-primary capitalize">{weekSummary.intensity}</span>
          </div>
        </div>
      </Card>

      {/* Week grid */}
      <div className="grid grid-cols-7 gap-3">
        {currentWeek.days.map(day => {
          const events = getEventsForDay(day.short);
          const hasConflicts = dayHasConflicts(day.short);

          return (
            <div key={day.key} className="min-h-[200px]">
              {/* Day header */}
              <div
                className={`
                  rounded-t-xl p-3 text-center border-b-2
                  ${hasConflicts ? 'bg-accent-alert/10 border-accent-alert' : 'bg-surface-alt border-transparent'}
                `}
              >
                <div className="text-sm font-medium text-text-primary">{day.short}</div>
                <div className="text-2xl font-serif text-text-primary">{day.date}</div>
                {hasConflicts && (
                  <div className="mt-1 flex items-center justify-center gap-1 text-xs text-accent-alert">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent-alert" />
                    Conflict
                  </div>
                )}
              </div>

              {/* Events */}
              <div className="p-2 space-y-2 bg-surface rounded-b-xl border border-t-0 border-border min-h-[150px]">
                {events.length === 0 ? (
                  <p className="text-xs text-text-tertiary text-center py-4">No events</p>
                ) : (
                  events.map(event => (
                    <EventPill key={event.id} event={event} />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Conflicts summary */}
      {conflicts.length > 0 && (
        <div className="mt-8">
          <h2 className="font-serif text-lg text-text-primary mb-4">Active conflicts</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {conflicts.map(conflict => (
              <Card key={conflict.id} className="border-l-4 border-accent-alert/50">
                <div className="text-sm font-medium text-text-primary">{conflict.day}</div>
                <div className="text-xs text-text-tertiary mb-2">{conflict.timeRange}</div>
                <p className="text-sm text-text-secondary">{conflict.description}</p>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EventPill({ event }: { event: Event }) {
  const parentColors = {
    A: 'bg-parent-a/20 border-parent-a/40',
    B: 'bg-parent-b/20 border-parent-b/40',
    both: 'bg-accent-calm/20 border-accent-calm/40',
  };

  return (
    <div
      className={`
        rounded-lg border p-2 text-xs
        ${parentColors[event.parent]}
      `}
    >
      <div className="font-medium text-text-primary truncate">{event.title}</div>
      <div className="text-text-tertiary">{event.time}</div>
    </div>
  );
}
