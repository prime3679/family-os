import Link from 'next/link';
import { Card } from '@/components/shared';

export default function SettingsPage() {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="border-b border-border bg-surface px-6 py-4">
        <h1 className="font-serif text-xl text-text-primary">Settings</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Manage your account and household
        </p>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-2xl space-y-4">
          {/* Household Settings */}
          <Link href="/app/settings/household" className="block">
            <Card className="hover:border-accent-primary/30 transition-colors cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-warm/10">
                  <svg
                    className="h-6 w-6 text-accent-warm"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h2 className="font-medium text-text-primary">Household</h2>
                  <p className="text-sm text-text-secondary">
                    Invite your co-parent and manage household members
                  </p>
                </div>
                <svg
                  className="h-5 w-5 text-text-tertiary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </Card>
          </Link>

          {/* Calendar Settings */}
          <Link href="/app/settings/calendars" className="block">
            <Card className="hover:border-accent-primary/30 transition-colors cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-calm/10">
                  <svg
                    className="h-6 w-6 text-accent-calm"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h2 className="font-medium text-text-primary">Calendars</h2>
                  <p className="text-sm text-text-secondary">
                    Connect and manage your Google Calendars
                  </p>
                </div>
                <svg
                  className="h-5 w-5 text-text-tertiary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
