'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  RitualProgress,
  StepOverview,
  StepConflicts,
  StepPrep,
  StepDecisions,
  StepSync,
  StepReady,
  StepTransition,
  PartnerStatus,
} from '@/components/ritual';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import { useWeekInsights } from '@/hooks/useWeekInsights';
import { useRitualState } from '@/hooks/useRitualState';
import { useHouseholdRitual } from '@/hooks/useHouseholdRitual';
import { usePartnerDecisions } from '@/hooks/usePartnerDecisions';
import { getCurrentWeek, detectConflicts, generateWeekSummary } from '@/lib/calendar/analyzeWeek';

export default function RitualPage() {
  const { events, isLoading, isUsingMockData } = useCalendarEvents();

  // Household ritual state for partner sync
  const {
    hasPartner,
    partnerProgress,
    needsSync,
    isLoading: isLoadingHousehold,
    refetch: refetchHousehold,
  } = useHouseholdRitual();

  // Direction tracking for step transitions
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const previousStepRef = useRef<number>(1);

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
    markComplete,
  } = useRitualState();

  // Use saved step directly (default to 1 while loading)
  const currentStep = isLoadingState ? 1 : (savedStep || 1);

  // Update direction when step changes
  useEffect(() => {
    if (currentStep !== previousStepRef.current) {
      setDirection(currentStep > previousStepRef.current ? 'forward' : 'backward');
      previousStepRef.current = currentStep;
    }
  }, [currentStep]);

  // Compute week data from events
  const currentWeek = useMemo(() => getCurrentWeek(), []);
  const conflicts = useMemo(() => detectConflicts(events), [events]);
  const weekSummary = useMemo(() => generateWeekSummary(events, conflicts), [events, conflicts]);

  // Fetch AI insights
  const { insights, isLoading: isLoadingAI } = useWeekInsights(
    events,
    conflicts,
    weekSummary
  );

  // Partner decisions for sync step
  const {
    comparisons,
    conflictingDecisions,
    allSynced,
    syncDecision,
    isSyncing,
    refetch: refetchDecisions,
  } = usePartnerDecisions();

  // Handler for when sync is complete - refetch both household and decisions
  const handleSyncComplete = async () => {
    await markComplete();
    await Promise.all([refetchHousehold(), refetchDecisions()]);
  };

  const goToStep = (step: number) => {
    if (step >= 1 && step <= 5) {
      persistStep(step);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const nextStep = () => goToStep(currentStep + 1);
  const prevStep = () => goToStep(currentStep - 1);
  const startOver = async () => {
    await resetWeek();
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

      {/* Partner status indicator */}
      <PartnerStatus
        hasPartner={hasPartner}
        partnerProgress={partnerProgress}
        myCompleted={currentStep === 5}
        needsSync={needsSync}
        isLoading={isLoadingHousehold}
      />

      {/* Progress indicator */}
      <RitualProgress currentStep={currentStep} onStepClick={goToStep} />

      {/* Step content with transitions */}
      <div className="mt-8">
        <StepTransition stepKey={currentStep} direction={direction}>
          {currentStep === 1 && (
            <StepOverview
              onNext={nextStep}
              events={events}
              weekSummary={weekSummary}
              currentWeek={currentWeek}
              aiNarrative={insights?.narrative}
              isLoadingAI={isLoadingAI}
            />
          )}
          {currentStep === 2 && (
            <StepConflicts
              onNext={nextStep}
              onBack={prevStep}
              conflicts={conflicts}
              aiInsights={insights?.conflictInsights}
              isLoadingAI={isLoadingAI}
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
              isLoadingAI={isLoadingAI}
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
              isLoadingAI={isLoadingAI}
            />
          )}
          {currentStep === 5 && (
            needsSync && conflictingDecisions.length > 0 ? (
              <StepSync
                onNext={handleSyncComplete}
                onBack={prevStep}
                partnerName={partnerProgress?.name || 'Partner'}
                comparisons={comparisons}
                conflictingDecisions={conflictingDecisions}
                onSyncDecision={syncDecision}
                isSyncing={isSyncing}
              />
            ) : (
              <StepReady
                onBack={prevStep}
                onStartOver={startOver}
                weekSummary={weekSummary}
                aiAffirmation={insights?.affirmation}
                isWaitingForPartner={hasPartner && !partnerProgress?.completedAt}
                partnerName={partnerProgress?.name}
                onComplete={markComplete}
              />
            )
          )}
        </StepTransition>
      </div>
    </div>
  );
}
