'use client';

import Link from 'next/link';
import { weekAffirmation, mockWeekSummary } from '@/data/mock-data';
import { Card, Button } from '@/components/shared';

interface StepReadyProps {
  onBack: () => void;
  onStartOver: () => void;
}

export default function StepReady({ onBack, onStartOver }: StepReadyProps) {
  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Main affirmation */}
      <div className="text-center py-8">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-accent-calm/20 mb-6">
          <svg className="h-8 w-8 text-accent-calm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="font-serif text-3xl sm:text-4xl text-text-primary mb-4">
          {weekAffirmation.headline}
        </h2>
        <p className="text-lg text-text-secondary max-w-lg mx-auto">
          {weekAffirmation.subtext}
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {weekAffirmation.stats.map((stat, index) => (
          <div
            key={stat.label}
            className="bg-surface-alt rounded-xl p-4 text-center animate-fade-in-up"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="font-serif text-2xl text-accent-primary">{stat.value}</div>
            <div className="text-sm text-text-tertiary">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Week at a glance card */}
      <Card variant="warm">
        <h3 className="font-serif text-lg text-text-primary mb-3">Your week at a glance</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-text-tertiary">Heaviest day:</span>
            <span className="ml-2 text-text-primary font-medium">{mockWeekSummary.heaviestDay}</span>
          </div>
          <div>
            <span className="text-text-tertiary">Lightest day:</span>
            <span className="ml-2 text-text-primary font-medium">{mockWeekSummary.lightestDay}</span>
          </div>
          <div>
            <span className="text-text-tertiary">Travel:</span>
            <span className="ml-2 text-text-primary font-medium">{mockWeekSummary.travelDays} day{mockWeekSummary.travelDays !== 1 ? 's' : ''}</span>
          </div>
          <div>
            <span className="text-text-tertiary">Solo parenting:</span>
            <span className="ml-2 text-text-primary font-medium">{mockWeekSummary.soloParentingDays} day{mockWeekSummary.soloParentingDays !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </Card>

      {/* Closing message */}
      <div className="text-center">
        <p className="text-text-secondary italic">
          &ldquo;{weekAffirmation.closingMessage}&rdquo;
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
        <Link href="/app/week">
          <Button size="lg" variant="primary">
            View full week
            <svg className="h-5 w-5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </Button>
        </Link>
        <Button variant="ghost" onClick={onStartOver}>
          Start over
        </Button>
      </div>

      {/* Back link */}
      <div className="text-center pt-4">
        <button
          onClick={onBack}
          className="text-sm text-text-tertiary hover:text-text-secondary transition-colors"
        >
          ← Back to decisions
        </button>
      </div>
    </div>
  );
}
