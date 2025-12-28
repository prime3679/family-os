'use client';

import { useMemo, useState, useCallback } from 'react';
import { Event, PrepItem } from '@/data/mock-data';
import { Card, Button, Checkbox, Skeleton } from '@/components/shared';

interface StepPrepProps {
  onNext: () => void;
  onBack: () => void;
  events: Event[];
  aiPrepSuggestions?: Record<string, string[]>;
  // Persistence
  savedPrepItems?: Record<string, boolean>;
  onPrepItemToggle?: (itemKey: string, done: boolean) => void;
  isLoadingAI?: boolean;
}

// Map short day codes to full names
function capitalizeDay(day: string): string {
  const dayMap: Record<string, string> = {
    mon: 'Monday',
    tue: 'Tuesday',
    wed: 'Wednesday',
    thu: 'Thursday',
    fri: 'Friday',
    sat: 'Saturday',
    sun: 'Sunday',
  };
  return dayMap[day] || day;
}

// Generate fallback prep items based on event type
function generateFallbackPrepItems(event: Event): string[] {
  const fallbacks: Record<string, string[]> = {
    travel: [
      'Pack bag the night before',
      'Confirm reservations',
      'Share itinerary with partner',
      'Arrange transportation',
    ],
    kids: [
      'Pack snacks for the wait',
      'Confirm appointment time',
      'Prepare any needed documents',
      'Plan activity for waiting time',
    ],
    personal: [
      'Confirm babysitter if needed',
      'Block time on shared calendar',
      'Prepare what you need',
    ],
    family: [
      'Coordinate schedules with partner',
      'Prepare any supplies needed',
      'Confirm timing with everyone',
    ],
    work: [
      'Prepare materials in advance',
      'Block focus time if needed',
      'Coordinate coverage with partner',
    ],
  };
  return fallbacks[event.type || 'family'] || fallbacks.family;
}

export default function StepPrep({
  onNext,
  onBack,
  events,
  aiPrepSuggestions,
  savedPrepItems = {},
  onPrepItemToggle,
  isLoadingAI = false,
}: StepPrepProps) {
  // Task creation state
  const [creatingTaskFor, setCreatingTaskFor] = useState<string | null>(null);
  const [tasksCreated, setTasksCreated] = useState<Set<string>>(new Set());

  const handleCreateTask = useCallback(async (eventId: string, itemText: string, eventTitle: string) => {
    const key = `${eventId}-${itemText}`;
    setCreatingTaskFor(key);

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'event-prep',
          title: itemText,
          description: `Prep for: ${eventTitle}`,
          eventId,
          assignedTo: 'both',
          priority: 'normal',
        }),
      });

      if (res.ok) {
        setTasksCreated(prev => new Set(prev).add(key));
      }
    } catch (error) {
      console.error('Failed to create task:', error);
    } finally {
      setCreatingTaskFor(null);
    }
  }, []);

  // Build prep items from events that need prep + AI suggestions + saved state
  const prepItems = useMemo(() => {
    const eventsNeedingPrep = events.filter((e) => e.needsPrep);

    return eventsNeedingPrep.map((event) => {
      // Get AI suggestions or use fallback
      const aiItems = aiPrepSuggestions?.[event.title] || [];
      const items = aiItems.length > 0 ? aiItems : generateFallbackPrepItems(event);

      return {
        id: `prep-${event.id}`,
        eventTitle: event.title,
        eventTime: `${capitalizeDay(event.day)} ${event.time}`,
        items: items.map((text, idx) => {
          const itemKey = `${event.id}-${idx}`;
          return {
            id: itemKey,
            text,
            done: savedPrepItems[itemKey] ?? false,
          };
        }),
      };
    });
  }, [events, aiPrepSuggestions, savedPrepItems]);

  const toggleItem = (prepId: string, itemId: string) => {
    const currentDone = savedPrepItems[itemId] ?? false;
    onPrepItemToggle?.(itemId, !currentDone);
  };

  const totalItems = prepItems.reduce((acc, prep) => acc + prep.items.length, 0);
  const completedItems = prepItems.reduce(
    (acc, prep) => acc + prep.items.filter(i => i.done).length,
    0
  );
  const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Summary */}
      <div className="text-center">
        <p className="text-text-secondary">
          {prepItems.length > 0
            ? `${prepItems.length} event${prepItems.length > 1 ? 's' : ''} need prep work this week.`
            : 'No events need special prep this week.'}
        </p>
      </div>

      {/* Empty state */}
      {prepItems.length === 0 && (
        <div className="text-center py-8 bg-accent-calm/10 rounded-xl">
          <div className="text-2xl mb-2">✨</div>
          <p className="text-accent-calm font-medium">You&apos;re all set!</p>
          <p className="text-sm text-text-secondary mt-1">
            Nothing needs special preparation this week.
          </p>
        </div>
      )}

      {/* Progress bar - only show when there are items */}
      {prepItems.length > 0 && (
        <div className="bg-surface-alt rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-text-primary">Overall prep progress</span>
            <span className="text-sm text-text-tertiary">{completedItems} of {totalItems} done</span>
          </div>
          <div className="h-2 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-accent-calm rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Loading skeletons while AI generates suggestions */}
      {isLoadingAI && !aiPrepSuggestions && prepItems.length > 0 && (
        <div className="space-y-4">
          {prepItems.slice(0, 2).map((_, index) => (
            <Skeleton.PrepCard key={index} className="animate-fade-in-up" />
          ))}
        </div>
      )}

      {/* Prep lists */}
      {(!isLoadingAI || aiPrepSuggestions) && (
        <div className="space-y-4">
          {prepItems.map((prep, index) => {
            const event = events.find(e => `prep-${e.id}` === prep.id);
            return (
              <PrepCard
                key={prep.id}
                prep={prep}
                eventId={event?.id}
                onToggle={(itemId) => toggleItem(prep.id, itemId)}
                onCreateTask={handleCreateTask}
                creatingTaskFor={creatingTaskFor}
                tasksCreated={tasksCreated}
                index={index}
              />
            );
          })}
        </div>
      )}

      {/* Encouragement */}
      {completedItems > 0 && (
        <div className="text-center">
          <p className="text-accent-calm text-sm">
            Nice! You&apos;ve already knocked out {completedItems} item{completedItems > 1 ? 's' : ''}.
          </p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4">
        <Button variant="ghost" onClick={onBack}>
          <svg className="h-5 w-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </Button>
        <Button size="lg" onClick={onNext}>
          Review decisions
          <svg className="h-5 w-5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Button>
      </div>
    </div>
  );
}

function PrepCard({
  prep,
  eventId,
  onToggle,
  onCreateTask,
  creatingTaskFor,
  tasksCreated,
  index,
}: {
  prep: PrepItem;
  eventId?: string;
  onToggle: (itemId: string) => void;
  onCreateTask: (eventId: string, itemText: string, eventTitle: string) => void;
  creatingTaskFor: string | null;
  tasksCreated: Set<string>;
  index: number;
}) {
  const completedCount = prep.items.filter(i => i.done).length;
  const progress = (completedCount / prep.items.length) * 100;

  return (
    <Card
      className="animate-fade-in-up"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h4 className="font-serif text-lg text-text-primary">{prep.eventTitle}</h4>
          <p className="text-sm text-text-tertiary">{prep.eventTime}</p>
        </div>
        <span className="text-sm text-text-tertiary">
          {completedCount}/{prep.items.length}
        </span>
      </div>

      {/* Mini progress bar */}
      <div className="h-1 bg-border rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-accent-calm rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Checklist */}
      <div className="space-y-3">
        {prep.items.map(item => {
          const taskKey = eventId ? `${eventId}-${item.text}` : null;
          const isCreating = taskKey === creatingTaskFor;
          const isCreated = taskKey ? tasksCreated.has(taskKey) : false;

          return (
            <div key={item.id} className="flex items-center gap-2">
              <div className="flex-1">
                <Checkbox
                  label={item.text}
                  checked={item.done}
                  onCheckedChange={() => onToggle(item.id)}
                />
              </div>
              {eventId && !isCreated && (
                <button
                  onClick={() => onCreateTask(eventId, item.text, prep.eventTitle)}
                  disabled={isCreating}
                  aria-label="Add as task"
                  className="p-1.5 rounded-lg text-text-tertiary hover:text-accent-primary hover:bg-accent-primary/10 transition-colors disabled:opacity-50 flex-shrink-0"
                  title="Add as task"
                >
                  {isCreating ? (
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  )}
                </button>
              )}
              {isCreated && (
                <span className="text-xs text-accent-calm flex-shrink-0">✓ Task added</span>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
