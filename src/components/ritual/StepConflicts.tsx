'use client';

import { Conflict } from '@/data/mock-data';
import { Card, Button, Skeleton } from '@/components/shared';

export interface ConflictInsight {
  explanation: string;
  suggestions: string[];
  question: string;
}

interface StepConflictsProps {
  onNext: () => void;
  onBack: () => void;
  conflicts: Conflict[];
  aiInsights?: Record<string, ConflictInsight>;
  isLoadingAI?: boolean;
}

export default function StepConflicts({ onNext, onBack, conflicts, aiInsights, isLoadingAI = false }: StepConflictsProps) {
  const highPriority = conflicts.filter(c => c.severity === 'high');
  const mediumPriority = conflicts.filter(c => c.severity === 'medium');

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Summary */}
      <div className="text-center">
        <p className="text-text-secondary">
          {conflicts.length === 0 ? (
            <>No scheduling conflicts this week. Looking good!</>
          ) : (
            <>We found <span className="font-medium text-accent-alert">{conflicts.length} spot{conflicts.length === 1 ? '' : 's'}</span> that need your attention this week.</>
          )}
        </p>
      </div>

      {/* Loading skeletons while AI generates insights */}
      {isLoadingAI && !aiInsights && conflicts.length > 0 && (
        <div className="space-y-4">
          <Skeleton variant="text" className="w-24 h-3" />
          {conflicts.slice(0, 2).map((_, index) => (
            <Skeleton.Card key={index} className="animate-fade-in-up" />
          ))}
        </div>
      )}

      {/* High priority conflicts */}
      {(!isLoadingAI || aiInsights) && highPriority.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-text-tertiary uppercase tracking-wide">
            Needs attention
          </h3>
          {highPriority.map((conflict, index) => (
            <ConflictCard
              key={conflict.id}
              conflict={conflict}
              index={index}
              aiInsight={aiInsights?.[conflict.id]}
            />
          ))}
        </div>
      )}

      {/* Medium priority conflicts */}
      {(!isLoadingAI || aiInsights) && mediumPriority.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-text-tertiary uppercase tracking-wide">
            Worth a conversation
          </h3>
          {mediumPriority.map((conflict, index) => (
            <ConflictCard
              key={conflict.id}
              conflict={conflict}
              index={index + highPriority.length}
              aiInsight={aiInsights?.[conflict.id]}
            />
          ))}
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
          See the prep work
          <svg className="h-5 w-5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Button>
      </div>
    </div>
  );
}

function ConflictCard({ conflict, index, aiInsight }: {
  conflict: Conflict;
  index: number;
  aiInsight?: ConflictInsight;
}) {
  const typeStyles = {
    overlap: 'bg-accent-alert/10 border-accent-alert/30',
    logistics: 'bg-accent-warm/10 border-accent-warm/30',
    coverage: 'bg-accent-alert/10 border-accent-alert/30',
  };

  const typeLabels = {
    overlap: 'Schedule overlap',
    logistics: 'Logistics crunch',
    coverage: 'Coverage gap',
  };

  return (
    <Card
      className={`border-l-4 ${typeStyles[conflict.type]} animate-fade-in-up`}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <span className="text-xs font-medium text-text-tertiary uppercase tracking-wide">
            {typeLabels[conflict.type]}
          </span>
          <h4 className="font-serif text-lg text-text-primary mt-1">
            {conflict.day} • {conflict.timeRange}
          </h4>
        </div>
        {conflict.severity === 'high' && (
          <span className="flex-shrink-0 bg-accent-alert/20 text-accent-alert px-2 py-0.5 rounded text-xs font-medium">
            High priority
          </span>
        )}
      </div>

      <p className="text-text-secondary leading-relaxed">
        {aiInsight?.explanation || conflict.humanContext}
      </p>

      {/* Related events */}
      <div className="mt-4 flex flex-wrap gap-2">
        {conflict.events.map(event => (
          <span key={event} className="bg-surface-alt px-2 py-1 rounded text-xs text-text-tertiary">
            {event}
          </span>
        ))}
      </div>

      {/* Question prompt */}
      {(aiInsight?.question || conflict.question) && (
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-sm text-accent-primary font-medium flex items-center gap-2">
            <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {aiInsight?.question || conflict.question}
          </p>
        </div>
      )}
    </Card>
  );
}
