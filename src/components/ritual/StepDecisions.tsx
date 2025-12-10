'use client';

import { useState } from 'react';
import { mockDecisions, Decision } from '@/data/mock-data';
import { Card, Button } from '@/components/shared';

interface StepDecisionsProps {
  onNext: () => void;
  onBack: () => void;
}

export default function StepDecisions({ onNext, onBack }: StepDecisionsProps) {
  const [decisions, setDecisions] = useState(mockDecisions);

  const resolveDecision = (id: string, resolution: string) => {
    setDecisions(decs =>
      decs.map(d =>
        d.id === id ? { ...d, resolved: true, resolution } : d
      )
    );
  };

  const unresolveDecision = (id: string) => {
    setDecisions(decs =>
      decs.map(d =>
        d.id === id ? { ...d, resolved: false, resolution: undefined } : d
      )
    );
  };

  const resolvedCount = decisions.filter(d => d.resolved).length;
  const allResolved = resolvedCount === decisions.length;

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Summary */}
      <div className="text-center">
        <p className="text-text-secondary">
          {decisions.length} decision{decisions.length > 1 ? 's' : ''} to make together.
          {resolvedCount > 0 && (
            <span className="text-accent-calm ml-2">
              {resolvedCount} resolved!
            </span>
          )}
        </p>
      </div>

      {/* Decisions */}
      <div className="space-y-4">
        {decisions.map((decision, index) => (
          <DecisionCard
            key={decision.id}
            decision={decision}
            onResolve={(resolution) => resolveDecision(decision.id, resolution)}
            onUnresolve={() => unresolveDecision(decision.id)}
            index={index}
          />
        ))}
      </div>

      {/* All resolved celebration */}
      {allResolved && (
        <div className="text-center bg-accent-calm/10 rounded-xl p-6 animate-fade-in-up">
          <div className="text-2xl mb-2">&#10024;</div>
          <p className="text-accent-calm font-medium">All decisions made!</p>
          <p className="text-sm text-text-secondary mt-1">
            You&apos;re ready to wrap up.
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
          {allResolved ? "Let's wrap up" : 'Continue anyway'}
          <svg className="h-5 w-5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Button>
      </div>
    </div>
  );
}

function DecisionCard({
  decision,
  onResolve,
  onUnresolve,
  index,
}: {
  decision: Decision;
  onResolve: (resolution: string) => void;
  onUnresolve: () => void;
  index: number;
}) {
  const [selectedOption, setSelectedOption] = useState<string | null>(decision.resolution || null);

  const handleSelect = (option: string) => {
    setSelectedOption(option);
    onResolve(option);
  };

  return (
    <Card
      className={`animate-fade-in-up ${decision.resolved ? 'border-accent-calm/50 bg-accent-calm/5' : ''}`}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="flex items-start justify-between mb-3">
        <h4 className="font-serif text-lg text-text-primary">{decision.title}</h4>
        {decision.resolved && (
          <button
            onClick={onUnresolve}
            className="text-xs text-text-tertiary hover:text-text-secondary transition-colors"
          >
            Change
          </button>
        )}
      </div>

      <p className="text-text-secondary mb-4">{decision.context}</p>

      {/* Options */}
      {decision.options && (
        <div className="space-y-2">
          {decision.options.map(option => (
            <button
              key={option}
              onClick={() => handleSelect(option)}
              className={`
                w-full text-left px-4 py-3 rounded-xl border transition-all
                ${selectedOption === option
                  ? 'border-accent-calm bg-accent-calm/10 text-text-primary'
                  : 'border-border bg-surface hover:border-accent-primary/30 text-text-secondary hover:text-text-primary'
                }
              `}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`
                    h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all
                    ${selectedOption === option
                      ? 'border-accent-calm bg-accent-calm'
                      : 'border-border'
                    }
                  `}
                >
                  {selectedOption === option && (
                    <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span>{option}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}
