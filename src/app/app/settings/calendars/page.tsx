'use client';

import { useState } from 'react';
import { mockCalendars } from '@/data/mock-data';
import { Button } from '@/components/shared';

export default function CalendarsSettingsPage() {
  const [calendars, setCalendars] = useState(mockCalendars);
  const [lastSynced] = useState(new Date().toLocaleString());

  const toggleCalendar = (calendarId: string) => {
    setCalendars(
      calendars.map((cal) =>
        cal.id === calendarId ? { ...cal, included: !cal.included } : cal
      )
    );
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="border-b border-border bg-white px-6 py-4">
        <h1 className="text-lg font-semibold text-foreground">Calendars & connections</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage which calendars are included in your weekly view
        </p>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-3xl space-y-8">
          {/* Connected accounts */}
          <section>
            <h2 className="text-sm font-semibold text-foreground">Connected accounts</h2>
            <div className="mt-4 rounded-xl border border-border bg-white">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-border">
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Adrian – Google Calendar</p>
                    <p className="text-xs text-muted-foreground">adrian@example.com</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                      <span className="h-1.5 w-1.5 rounded-full bg-success" />
                      Active
                    </span>
                    <p className="mt-1 text-xs text-muted-foreground">Last synced: {lastSynced}</p>
                  </div>
                  <Button variant="ghost" size="sm" className="text-conflict-high">
                    Disconnect
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {/* Included calendars */}
          <section>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Included calendars</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Choose which calendars appear in your weekly view
                </p>
              </div>
              <span className="text-xs text-muted-foreground">
                {calendars.filter((c) => c.included).length} of {calendars.length} included
              </span>
            </div>

            <div className="mt-4 overflow-hidden rounded-xl border border-border bg-white">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="w-12 px-4 py-3"></th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Calendar
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Account
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {calendars.map((calendar) => (
                    <tr
                      key={calendar.id}
                      className="transition-colors hover:bg-muted/20"
                    >
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleCalendar(calendar.id)}
                          className={`flex h-5 w-5 items-center justify-center rounded border transition-colors ${
                            calendar.included
                              ? 'border-primary bg-primary text-white'
                              : 'border-border bg-white hover:border-primary'
                          }`}
                        >
                          {calendar.included && (
                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: calendar.color }}
                          />
                          <span className="text-sm font-medium text-foreground">
                            {calendar.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-muted-foreground">
                          {calendar.account}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Troubleshooting */}
          <section>
            <h2 className="text-sm font-semibold text-foreground">Troubleshooting</h2>
            <div className="mt-4 rounded-xl border border-border bg-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-foreground">Force sync all calendars</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    If events are missing, try syncing again
                  </p>
                </div>
                <Button variant="secondary" size="sm">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Sync now
                </Button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
