'use client';

import { useState } from 'react';
import { usePartnerNudge } from '@/hooks/usePartnerNudge';
import { Button } from '@/components/shared';

interface NudgeButtonProps {
  partnerName?: string;
  className?: string;
}

export default function NudgeButton({ partnerName = 'partner', className = '' }: NudgeButtonProps) {
  const { canNudge, cooldownMinutes, isSending, sendNudge, error } = usePartnerNudge();
  const [showSuccess, setShowSuccess] = useState(false);

  const handleNudge = async () => {
    const success = await sendNudge();
    if (success) {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }
  };

  if (showSuccess) {
    return (
      <div className={`inline-flex items-center gap-2 text-accent-calm text-sm ${className}`}>
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        Nudge sent!
      </div>
    );
  }

  if (!canNudge && cooldownMinutes) {
    return (
      <div className={`inline-flex items-center gap-2 text-text-tertiary text-sm ${className}`}>
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Nudge again in {cooldownMinutes}m
      </div>
    );
  }

  return (
    <div className={className}>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleNudge}
        disabled={!canNudge || isSending}
        title={error || undefined}
      >
        {isSending ? (
          <>
            <div className="h-3 w-3 border border-current border-t-transparent rounded-full animate-spin mr-1.5" />
            Sending...
          </>
        ) : (
          <>
            <svg className="h-4 w-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            Nudge {partnerName}
          </>
        )}
      </Button>
    </div>
  );
}
