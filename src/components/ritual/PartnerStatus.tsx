'use client';

import Link from 'next/link';
import type { PartnerProgress } from '@/app/api/ritual/household/route';
import NudgeButton from '@/components/notifications/NudgeButton';

interface PartnerStatusProps {
  hasPartner: boolean;
  partnerProgress: PartnerProgress | null;
  myCompleted: boolean;
  needsSync: boolean;
  isLoading?: boolean;
}

const stepLabels = ['Not started', 'Overview', 'Conflicts', 'Prep', 'Decisions', 'Ready'];

export default function PartnerStatus({
  hasPartner,
  partnerProgress,
  myCompleted,
  needsSync,
  isLoading = false,
}: PartnerStatusProps) {
  // Don't show anything while loading
  if (isLoading) {
    return null;
  }

  // No partner - show invite CTA
  if (!hasPartner) {
    return (
      <div className="text-center mb-6">
        <Link
          href="/app/settings/household"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent-warm/10 text-accent-primary text-sm hover:bg-accent-warm/20 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Invite your partner to plan together
        </Link>
      </div>
    );
  }

  const partnerName = partnerProgress?.name || 'Partner';
  const partnerStep = partnerProgress?.step || 0;
  const partnerCompleted = !!partnerProgress?.completedAt;

  // Both completed and need to sync
  if (needsSync && myCompleted && partnerCompleted) {
    return (
      <div className="text-center mb-6 animate-fade-in-up">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent-calm/20 text-accent-calm text-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-calm opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-calm"></span>
          </span>
          Ready to sync decisions with {partnerName}!
        </div>
      </div>
    );
  }

  // Partner completed, waiting for me
  if (partnerCompleted && !myCompleted) {
    return (
      <div className="text-center mb-6 animate-fade-in-up">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent-calm/20 text-accent-calm text-sm">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {partnerName} finished — your turn!
        </div>
      </div>
    );
  }

  // I completed, waiting for partner
  if (myCompleted && !partnerCompleted) {
    return (
      <div className="text-center mb-6 animate-fade-in-up">
        <div className="flex flex-col items-center gap-2">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent-warm/10 text-text-secondary text-sm">
            <svg className="h-4 w-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Waiting for {partnerName} to finish...
          </div>
          <NudgeButton partnerName={partnerName} />
        </div>
      </div>
    );
  }

  // Partner is actively working through ritual
  if (partnerStep > 0 && !partnerCompleted) {
    return (
      <div className="text-center mb-6 animate-fade-in-up">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-alt text-text-secondary text-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-warm opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-warm"></span>
          </span>
          {partnerName} is on {stepLabels[partnerStep]}
        </div>
      </div>
    );
  }

  // Partner hasn't started yet
  return (
    <div className="text-center mb-6 animate-fade-in-up">
      <div className="flex flex-col items-center gap-2">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-alt text-text-tertiary text-sm">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          {partnerName} hasn&apos;t started yet
        </div>
        <NudgeButton partnerName={partnerName} />
      </div>
    </div>
  );
}
