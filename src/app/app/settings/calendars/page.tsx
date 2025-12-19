'use client';

import { useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useConnectedCalendars } from '@/hooks/useConnectedCalendars';
import { Card, Button, Checkbox } from '@/components/shared';

export default function CalendarsSettingsPage() {
  const { data: session, status } = useSession();
  const {
    isConnected,
    familyMember,
    connectedCalendars,
    availableCalendars,
    isLoading,
    refresh,
    connectCalendar,
    toggleCalendar,
    setupFamilyMember,
  } = useConnectedCalendars();

  const [selectedRole, setSelectedRole] = useState<string>('parent_a');
  const [displayName, setDisplayName] = useState<string>('');
  const [isSettingUp, setIsSettingUp] = useState(false);

  const handleGoogleConnect = () => {
    signIn('google', { callbackUrl: '/app/settings/calendars' });
  };

  const handleSetupRole = async () => {
    if (!displayName.trim()) return;
    setIsSettingUp(true);
    try {
      await setupFamilyMember(selectedRole, displayName);
    } finally {
      setIsSettingUp(false);
    }
  };

  const handleConnectCalendar = async (cal: typeof availableCalendars[0]) => {
    await connectCalendar(cal.id, cal.summary, cal.backgroundColor);
  };

  const handleToggleCalendar = async (calId: string, included: boolean) => {
    await toggleCalendar(calId, included);
  };

  // Show loading state
  if (status === 'loading' || isLoading) {
    return (
      <div className="flex h-full flex-col">
        <header className="border-b border-border bg-surface px-6 py-4">
          <h1 className="font-serif text-xl text-text-primary">Calendars & Connections</h1>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-text-tertiary">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="border-b border-border bg-surface px-6 py-4">
        <h1 className="font-serif text-xl text-text-primary">Calendars & Connections</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Connect your Google Calendar to see your real events in Family OS
        </p>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-2xl space-y-8">
          {/* Not signed in */}
          {!session && (
            <Card variant="warm" className="text-center py-8">
              <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-accent-primary/10 mb-4">
                <svg className="h-7 w-7 text-accent-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="font-serif text-xl text-text-primary mb-2">Connect your calendar</h2>
              <p className="text-text-secondary mb-6 max-w-md mx-auto">
                Sign in with Google to pull your real calendar events into Family OS.
                We only read your calendar &mdash; we never modify it.
              </p>
              <Button variant="primary" size="lg" onClick={handleGoogleConnect}>
                <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign in with Google
              </Button>
            </Card>
          )}

          {/* Signed in but no family member profile */}
          {session && isConnected && !familyMember && (
            <Card variant="warm">
              <h2 className="font-serif text-lg text-text-primary mb-4">Set up your profile</h2>
              <p className="text-text-secondary mb-6">
                Let us know who you are so we can show events correctly for your family.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Your name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder={session.user?.name || 'Enter your name'}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-surface text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Your role
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="role"
                        value="parent_a"
                        checked={selectedRole === 'parent_a'}
                        onChange={(e) => setSelectedRole(e.target.value)}
                        className="text-accent-primary focus:ring-accent-primary"
                      />
                      <span className="text-text-primary">Parent A</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="role"
                        value="parent_b"
                        checked={selectedRole === 'parent_b'}
                        onChange={(e) => setSelectedRole(e.target.value)}
                        className="text-accent-primary focus:ring-accent-primary"
                      />
                      <span className="text-text-primary">Parent B</span>
                    </label>
                  </div>
                </div>

                <Button
                  variant="primary"
                  onClick={handleSetupRole}
                  disabled={!displayName.trim() || isSettingUp}
                >
                  {isSettingUp ? 'Setting up...' : 'Continue'}
                </Button>
              </div>
            </Card>
          )}

          {/* Connected with profile - show calendars */}
          {session && isConnected && familyMember && (
            <>
              {/* Connection status */}
              <section>
                <h2 className="text-sm font-semibold text-text-primary mb-4">Connected account</h2>
                <Card>
                  <div className="flex items-center justify-between">
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
                        <p className="text-sm font-medium text-text-primary">
                          {familyMember.displayName} ({familyMember.role === 'parent_a' ? 'Parent A' : 'Parent B'})
                        </p>
                        <p className="text-xs text-text-tertiary">{session.user?.email}</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent-calm/10 px-2 py-0.5 text-xs font-medium text-accent-calm">
                      <span className="h-1.5 w-1.5 rounded-full bg-accent-calm" />
                      Connected
                    </span>
                  </div>
                </Card>
              </section>

              {/* Connected calendars */}
              {connectedCalendars.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-text-primary">Your calendars</h2>
                    <span className="text-xs text-text-tertiary">
                      {connectedCalendars.filter((c) => c.included).length} of {connectedCalendars.length} included
                    </span>
                  </div>
                  <Card padding="none">
                    <div className="divide-y divide-border">
                      {connectedCalendars.map((calendar) => (
                        <div key={calendar.id} className="flex items-center justify-between p-4">
                          <div className="flex items-center gap-3">
                            <span
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: calendar.color }}
                            />
                            <span className="text-sm font-medium text-text-primary">
                              {calendar.name}
                            </span>
                          </div>
                          <Checkbox
                            checked={calendar.included}
                            onCheckedChange={(checked) => handleToggleCalendar(calendar.id, checked)}
                            label=""
                          />
                        </div>
                      ))}
                    </div>
                  </Card>
                </section>
              )}

              {/* Available calendars to add */}
              {availableCalendars.length > 0 && (
                <section>
                  <h2 className="text-sm font-semibold text-text-primary mb-4">Add calendars</h2>
                  <Card padding="none">
                    <div className="divide-y divide-border">
                      {availableCalendars
                        .filter((cal) => !connectedCalendars.some((c) => c.googleCalendarId === cal.id))
                        .map((calendar) => (
                          <div key={calendar.id} className="flex items-center justify-between p-4">
                            <div className="flex items-center gap-3">
                              <span
                                className="h-3 w-3 rounded-full"
                                style={{ backgroundColor: calendar.backgroundColor || '#7C6A5D' }}
                              />
                              <div>
                                <span className="text-sm font-medium text-text-primary">
                                  {calendar.summary}
                                </span>
                                {calendar.primary && (
                                  <span className="ml-2 text-xs text-text-tertiary">(Primary)</span>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleConnectCalendar(calendar)}
                            >
                              Add
                            </Button>
                          </div>
                        ))}
                    </div>
                  </Card>
                </section>
              )}

              {/* Sync button */}
              <section>
                <Button variant="secondary" onClick={refresh}>
                  <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh calendars
                </Button>
              </section>
            </>
          )}

          {/* Not connected to Google */}
          {session && !isConnected && (
            <Card variant="warm" className="text-center py-8">
              <h2 className="font-serif text-lg text-text-primary mb-2">Connect Google Calendar</h2>
              <p className="text-text-secondary mb-4">
                Your Google account is signed in, but we need calendar access.
              </p>
              <Button variant="primary" onClick={handleGoogleConnect}>
                Grant calendar access
              </Button>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
