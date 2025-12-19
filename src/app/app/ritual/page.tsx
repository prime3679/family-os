'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
  RitualProgress,
  StepOverview,
  StepConflicts,
  StepPrep,
  StepDecisions,
  StepReady,
} from '@/components/ritual';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import { useWeekInsights } from '@/hooks/useWeekInsights';
import { useRitualState } from '@/hooks/useRitualState';
import { getCurrentWeek, detectConflicts, generateWeekSummary } from '@/lib/calendar/analyzeWeek';

export default function RitualPage() {
  const { events, isLoading, isUsingMockData } = useCalendarEvents();

  // Ritual state persistence
  const {
    prepItems: savedPrepItems,
    decisions: savedDecisions,
    currentStep: savedStep,
    isLoading: isLoadingState,
    setPrepItemDone,
    setDecisionResolution,
    setCurrentStep: persistStep,
    resetWeek,
  } = useRitualState();

  // Local step state, initialized from saved state
  const [currentStep, setCurrentStep] = useState(1);

  // Sync step from saved state on load
  useEffect(() => {
    if (!isLoadingState && savedStep > 1) {
      setCurrentStep(savedStep);
    }
  }, [isLoadingState, savedStep]);

  // Compute week data from events
  const currentWeek = useMemo(() => getCurrentWeek(), []);
  const conflicts = useMemo(() => detectConflicts(events), [events]);
  const weekSummary = useMemo(() => generateWeekSummary(events, conflicts), [events, conflicts]);

  // Fetch AI insights
  const { insights, isLoading: isLoadingAI, isUsingFallback } = useWeekInsights(
    events,
    conflicts,
    weekSummary
  );

  const goToStep = (step: number) => {
    if (step >= 1 && step <= 5) {
      setCurrentStep(step);
      persistStep(step); // Save to persistence
      // Scroll to top smoothly
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const nextStep = () => goToStep(currentStep + 1);
  const prevStep = () => goToStep(currentStep - 1);
  const startOver = async () => {
    await resetWeek(); // Clear saved state
    setCurrentStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto py-8">
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
    <div className="max-w-2xl mx-auto py-8">
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

      {/* AI loading indicator */}
      {isLoadingAI && !isLoading && (
        <div className="mb-4 flex items-center justify-center gap-2 text-sm text-text-tertiary">
          <div className="h-3 w-3 border border-accent-calm border-t-transparent rounded-full animate-spin" />
          <span>Generating personalized insights...</span>
        </div>
      )}

      {/* Progress indicator */}
      <RitualProgress currentStep={currentStep} onStepClick={goToStep} />

      {/* Step content */}
      <div className="mt-8">
        {currentStep === 1 && (
          <StepOverview
            onNext={nextStep}
            events={events}
            weekSummary={weekSummary}
            currentWeek={currentWeek}
            aiNarrative={insights?.narrative}
          />
        )}
        {currentStep === 2 && (
          <StepConflicts
            onNext={nextStep}
            onBack={prevStep}
            conflicts={conflicts}
            aiInsights={insights?.conflictInsights}
          />
        )}
        {currentStep === 3 && (
          <StepPrep
            onNext={nextStep}
            onBack={prevStep}
            events={events}
            aiPrepSuggestions={insights?.prepSuggestions}
            savedPrepItems={savedPrepItems}
            onPrepItemToggle={setPrepItemDone}
          />
        )}
        {currentStep === 4 && (
          <StepDecisions
            onNext={nextStep}
            onBack={prevStep}
            conflicts={conflicts}
            aiDecisionOptions={insights?.decisionOptions}
            savedDecisions={savedDecisions}
            onDecisionResolve={setDecisionResolution}
          />
        )}
        {currentStep === 5 && (
          <StepReady
            onBack={prevStep}
            onStartOver={startOver}
            weekSummary={weekSummary}
            aiAffirmation={insights?.affirmation}
          />
        )}
      </div>
    </div>
  );
}
