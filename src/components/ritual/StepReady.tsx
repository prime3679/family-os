'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { weekAffirmation } from '@/data/mock-data';
import { WeekSummary } from '@/data/mock-data';
import { Card, Button } from '@/components/shared';
import Confetti from './Confetti';

interface StepReadyProps {
  onBack: () => void;
  onStartOver: () => void;
  weekSummary: WeekSummary;
  aiAffirmation?: {
    headline: string;
    message: string;
  };
  isWaitingForPartner?: boolean;
  partnerName?: string;
  onComplete?: () => Promise<void>;
}

export default function StepReady({
  onBack,
  onStartOver,
  weekSummary,
  aiAffirmation,
  isWaitingForPartner = false,
  partnerName,
  onComplete,
}: StepReadyProps) {
  const [showCelebration, setShowCelebration] = useState(false);
  const [hasCalledComplete, setHasCalledComplete] = useState(false);

  // Call onComplete once when component mounts (only if not waiting)
  useEffect(() => {
    if (!isWaitingForPartner && onComplete && !hasCalledComplete) {
      setHasCalledComplete(true);
      onComplete().catch(console.error);
    }
  }, [isWaitingForPartner, onComplete, hasCalledComplete]);

  // Trigger celebration after component mounts (only if not waiting)
  useEffect(() => {
    if (!isWaitingForPartner) {
      const timer = setTimeout(() => setShowCelebration(true), 300);
      return () => clearTimeout(timer);
    }
  }, [isWaitingForPartner]);

  // Prefer AI-generated affirmation when available
  const headline = aiAffirmation?.headline || weekAffirmation.headline;
  const message = aiAffirmation?.message || weekAffirmation.subtext;

  // Waiting for partner state
  if (isWaitingForPartner) {
    return (
      <div className="space-y-8 animate-fade-in-up">
        {/* Waiting indicator */}
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-accent-warm/20 mb-6">
            <svg
              className="h-8 w-8 text-accent-warm animate-pulse"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl text-text-primary mb-4">
            You&apos;re all done!
          </h2>
          <p className="text-lg text-text-secondary max-w-lg mx-auto">
            Waiting for {partnerName || 'your partner'} to finish their Deep Sync so you can sync up together.
          </p>
        </div>

        {/* Encouraging message */}
        <Card variant="subtle" className="text-center">
          <div className="text-2xl mb-2">&#128077;</div>
          <p className="text-text-secondary">
            Great job getting ahead! When {partnerName || 'they'} finish,
            you&apos;ll be able to compare decisions and sync up.
          </p>
        </Card>

        {/* Week preview */}
        <Card variant="warm">
          <h3 className="font-serif text-lg text-text-primary mb-3">Your week at a glance</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-text-tertiary">Heaviest day:</span>
              <span className="ml-2 text-text-primary font-medium">{weekSummary.heaviestDay}</span>
            </div>
            <div>
              <span className="text-text-tertiary">Lightest day:</span>
              <span className="ml-2 text-text-primary font-medium">{weekSummary.lightestDay}</span>
            </div>
            <div>
              <span className="text-text-tertiary">Travel:</span>
              <span className="ml-2 text-text-primary font-medium">{weekSummary.travelDays} day{weekSummary.travelDays !== 1 ? 's' : ''}</span>
            </div>
            <div>
              <span className="text-text-tertiary">Solo parenting:</span>
              <span className="ml-2 text-text-primary font-medium">{weekSummary.soloParentingDays} day{weekSummary.soloParentingDays !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link href="/app/week">
            <Button size="lg" variant="secondary">
              Preview week
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
            &larr; Back to decisions
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Confetti celebration */}
      <Confetti trigger={showCelebration} />

      {/* Main affirmation */}
      <div className="text-center py-8">
        <div
          className={`
            inline-flex items-center justify-center h-16 w-16 rounded-full
            bg-accent-calm/20 mb-6
            ${showCelebration ? 'animate-celebrate-bounce animate-celebrate-glow' : ''}
          `}
        >
          <svg
            className={`h-8 w-8 text-accent-calm ${showCelebration ? 'animate-checkmark-draw' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2
          className={`
            font-serif text-3xl sm:text-4xl text-text-primary mb-4
            ${showCelebration ? 'animate-scale-in' : 'opacity-0'}
          `}
          style={{ animationDelay: '200ms' }}
        >
          {headline}
        </h2>
        <p
          className={`
            text-lg text-text-secondary max-w-lg mx-auto
            ${showCelebration ? 'animate-float-up' : 'opacity-0'}
          `}
          style={{ animationDelay: '350ms' }}
        >
          {message}
        </p>
      </div>

      {/* Stats grid with staggered animation */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {weekAffirmation.stats.map((stat, index) => (
          <div
            key={stat.label}
            className={`
              bg-surface-alt rounded-xl p-4 text-center
              ${showCelebration ? 'animate-scale-in' : 'opacity-0'}
            `}
            style={{ animationDelay: `${450 + index * 80}ms` }}
          >
            <div className="font-serif text-2xl text-accent-primary">{stat.value}</div>
            <div className="text-sm text-text-tertiary">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Week at a glance card */}
      <div
        className={showCelebration ? 'animate-float-up' : 'opacity-0'}
        style={{ animationDelay: '750ms' }}
      >
        <Card variant="warm">
          <h3 className="font-serif text-lg text-text-primary mb-3">Your week at a glance</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-text-tertiary">Heaviest day:</span>
              <span className="ml-2 text-text-primary font-medium">{weekSummary.heaviestDay}</span>
            </div>
            <div>
              <span className="text-text-tertiary">Lightest day:</span>
              <span className="ml-2 text-text-primary font-medium">{weekSummary.lightestDay}</span>
            </div>
            <div>
              <span className="text-text-tertiary">Travel:</span>
              <span className="ml-2 text-text-primary font-medium">{weekSummary.travelDays} day{weekSummary.travelDays !== 1 ? 's' : ''}</span>
            </div>
            <div>
              <span className="text-text-tertiary">Solo parenting:</span>
              <span className="ml-2 text-text-primary font-medium">{weekSummary.soloParentingDays} day{weekSummary.soloParentingDays !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Closing message */}
      <div
        className={`text-center ${showCelebration ? 'animate-float-up' : 'opacity-0'}`}
        style={{ animationDelay: '850ms' }}
      >
        <p className="text-text-secondary italic">
          &ldquo;{weekAffirmation.closingMessage}&rdquo;
        </p>
      </div>

      {/* Actions */}
      <div
        className={`
          flex flex-col sm:flex-row items-center justify-center gap-4 pt-4
          ${showCelebration ? 'animate-float-up' : 'opacity-0'}
        `}
        style={{ animationDelay: '950ms' }}
      >
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
