'use client';

import { useState } from 'react';
import { Card, Button } from '@/components/shared';
import type { DecisionComparison } from '@/app/api/ritual/decisions/route';

interface StepSyncProps {
  onNext: () => void;
  onBack: () => void;
  partnerName: string;
  comparisons: DecisionComparison[];
  conflictingDecisions: string[];
  onSyncDecision: (conflictId: string, resolution: string) => Promise<boolean>;
  isSyncing?: boolean;
}

export default function StepSync({
  onNext,
  onBack,
  partnerName,
  comparisons,
  conflictingDecisions,
  onSyncDecision,
  isSyncing = false,
}: StepSyncProps) {
  const [syncedDecisions, setSyncedDecisions] = useState<Set<string>>(new Set());

  const handleSync = async (conflictId: string, resolution: string) => {
    const success = await onSyncDecision(conflictId, resolution);
    if (success) {
      setSyncedDecisions(prev => new Set([...prev, conflictId]));
    }
  };

  // Separate matching and conflicting decisions
  const matchingDecisions = comparisons.filter(c => c.matches);
  const conflicting = comparisons.filter(c => !c.matches && c.myResolution && c.partnerResolution);
  const unsynced = conflicting.filter(c => !syncedDecisions.has(c.conflictId));
  const allSynced = unsynced.length === 0;

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-accent-calm/20 mb-4">
          <svg className="h-6 w-6 text-accent-calm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        </div>
        <h2 className="font-serif text-2xl sm:text-3xl text-text-primary mb-2">
          Sync Your Decisions
        </h2>
        <p className="text-text-secondary">
          You and {partnerName} both finished! Let&apos;s align on a few things.
        </p>
      </div>

      {/* Matching decisions summary */}
      {matchingDecisions.length > 0 && (
        <div className="bg-accent-calm/10 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-2 text-accent-calm">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium">
              {matchingDecisions.length} decision{matchingDecisions.length > 1 ? 's' : ''} already aligned!
            </span>
          </div>
        </div>
      )}

      {/* Conflicting decisions */}
      {conflicting.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-text-tertiary uppercase tracking-wide">
            Needs discussion ({unsynced.length} remaining)
          </h3>

          {conflicting.map((comparison, index) => {
            const isSynced = syncedDecisions.has(comparison.conflictId);

            return (
              <SyncCard
                key={comparison.conflictId}
                comparison={comparison}
                partnerName={partnerName}
                onSync={handleSync}
                isSynced={isSynced}
                isSyncing={isSyncing}
                index={index}
              />
            );
          })}
        </div>
      )}

      {/* All synced celebration */}
      {allSynced && conflicting.length > 0 && (
        <div className="text-center bg-accent-calm/10 rounded-xl p-6 animate-fade-in-up">
          <div className="text-2xl mb-2">&#10024;</div>
          <p className="text-accent-calm font-medium">All decisions synced!</p>
          <p className="text-sm text-text-secondary mt-1">
            You&apos;re ready to tackle the week together.
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
        <Button size="lg" onClick={onNext} disabled={!allSynced && conflicting.length > 0}>
          {allSynced ? "We're ready!" : `Sync ${unsynced.length} more`}
          <svg className="h-5 w-5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Button>
      </div>
    </div>
  );
}

function SyncCard({
  comparison,
  partnerName,
  onSync,
  isSynced,
  isSyncing,
  index,
}: {
  comparison: DecisionComparison;
  partnerName: string;
  onSync: (conflictId: string, resolution: string) => void;
  isSynced: boolean;
  isSyncing: boolean;
  index: number;
}) {
  const [selectedOption, setSelectedOption] = useState<'mine' | 'partner' | null>(null);

  const handleSelect = (option: 'mine' | 'partner') => {
    setSelectedOption(option);
  };

  const handleConfirm = () => {
    if (!selectedOption) return;
    const resolution = selectedOption === 'mine' ? comparison.myResolution! : comparison.partnerResolution!;
    onSync(comparison.conflictId, resolution);
  };

  if (isSynced) {
    return (
      <Card
        className="border-accent-calm/50 bg-accent-calm/5 animate-fade-in-up"
        style={{ animationDelay: `${index * 100}ms` }}
      >
        <div className="flex items-center gap-3 text-accent-calm">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="font-medium">Synced!</span>
        </div>
      </Card>
    );
  }

  return (
    <Card
      className="animate-fade-in-up"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="space-y-4">
        {/* Conflict title */}
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-accent-alert animate-pulse" />
          <span className="text-sm font-medium text-text-tertiary uppercase">
            Different choices
          </span>
        </div>

        {/* Side by side comparison */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* My choice */}
          <button
            onClick={() => handleSelect('mine')}
            className={`
              text-left p-4 rounded-xl border-2 transition-all
              ${selectedOption === 'mine'
                ? 'border-accent-calm bg-accent-calm/10'
                : 'border-border hover:border-accent-primary/30'
              }
            `}
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                className={`
                  h-4 w-4 rounded-full border-2 flex items-center justify-center
                  ${selectedOption === 'mine' ? 'border-accent-calm bg-accent-calm' : 'border-border'}
                `}
              >
                {selectedOption === 'mine' && (
                  <svg className="h-2.5 w-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className="text-xs font-medium text-text-tertiary">Your choice</span>
            </div>
            <p className="text-sm text-text-primary">{comparison.myResolution}</p>
          </button>

          {/* Partner's choice */}
          <button
            onClick={() => handleSelect('partner')}
            className={`
              text-left p-4 rounded-xl border-2 transition-all
              ${selectedOption === 'partner'
                ? 'border-accent-calm bg-accent-calm/10'
                : 'border-border hover:border-accent-primary/30'
              }
            `}
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                className={`
                  h-4 w-4 rounded-full border-2 flex items-center justify-center
                  ${selectedOption === 'partner' ? 'border-accent-calm bg-accent-calm' : 'border-border'}
                `}
              >
                {selectedOption === 'partner' && (
                  <svg className="h-2.5 w-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className="text-xs font-medium text-text-tertiary">{partnerName}&apos;s choice</span>
            </div>
            <p className="text-sm text-text-primary">{comparison.partnerResolution}</p>
          </button>
        </div>

        {/* Confirm button */}
        {selectedOption && (
          <div className="flex justify-end pt-2">
            <Button
              size="sm"
              onClick={handleConfirm}
              disabled={isSyncing}
            >
              {isSyncing ? 'Syncing...' : 'Confirm this choice'}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
