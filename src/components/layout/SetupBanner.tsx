'use client';

import Link from 'next/link';

interface SetupBannerProps {
  familyName?: string;
  isNewMember?: boolean;
}

export default function SetupBanner({ familyName, isNewMember }: SetupBannerProps) {
  return (
    <div className="bg-gradient-to-r from-accent-primary/10 to-accent-calm/10 border-b border-accent-primary/20">
      <div className="mx-auto max-w-6xl px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">👋</span>
            <div>
              <p className="font-medium text-text-primary">
                {isNewMember
                  ? `Welcome to ${familyName || 'the family'}!`
                  : 'Connect your calendar to get started'}
              </p>
              <p className="text-sm text-text-secondary">
                {isNewMember
                  ? 'Connect your calendar to see the shared family view'
                  : 'Sync your Google Calendar to see your real events'}
              </p>
            </div>
          </div>
          <Link
            href="/app/settings/calendars"
            className="inline-flex items-center gap-2 rounded-lg bg-accent-primary px-4 py-2 text-sm font-medium text-white hover:bg-accent-primary/90 transition-colors whitespace-nowrap"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            Set up calendar
          </Link>
        </div>
      </div>
    </div>
  );
}
