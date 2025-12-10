'use client';

import { useState } from 'react';
import { mockPrepItems, PrepItem } from '@/data/mock-data';
import { Card, Button, Checkbox } from '@/components/shared';

interface StepPrepProps {
  onNext: () => void;
  onBack: () => void;
}

export default function StepPrep({ onNext, onBack }: StepPrepProps) {
  const [prepItems, setPrepItems] = useState(mockPrepItems);

  const toggleItem = (prepId: string, itemId: string) => {
    setPrepItems(items =>
      items.map(prep =>
        prep.id === prepId
          ? {
              ...prep,
              items: prep.items.map(item =>
                item.id === itemId ? { ...item, done: !item.done } : item
              ),
            }
          : prep
      )
    );
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
          {prepItems.length} events need prep work this week.
        </p>
      </div>

      {/* Progress bar */}
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

      {/* Prep lists */}
      <div className="space-y-4">
        {prepItems.map((prep, index) => (
          <PrepCard
            key={prep.id}
            prep={prep}
            onToggle={(itemId) => toggleItem(prep.id, itemId)}
            index={index}
          />
        ))}
      </div>

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
  onToggle,
  index,
}: {
  prep: PrepItem;
  onToggle: (itemId: string) => void;
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
        {prep.items.map(item => (
          <Checkbox
            key={item.id}
            label={item.text}
            checked={item.done}
            onCheckedChange={() => onToggle(item.id)}
          />
        ))}
      </div>
    </Card>
  );
}
