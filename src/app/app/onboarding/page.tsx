'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

type Step = 'welcome' | 'calendar' | 'scanning' | 'phone' | 'verify' | 'partner' | 'done';

interface CalendarPreview {
  eventCount: number;
  conflictCount: number;
  busyDays: string[];
  clearDays: string[];
}

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [step, setStep] = useState<Step>('welcome');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Phone verification state
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);

  // Partner invite state
  const [partnerEmail, setPartnerEmail] = useState('');
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  // Check current setup status
  const [hasCalendar, setHasCalendar] = useState(false);
  const [hasPhone, setHasPhone] = useState(false);

  // Calendar preview (what Scout found)
  const [calendarPreview, setCalendarPreview] = useState<CalendarPreview | null>(null);

  useEffect(() => {
    checkSetupStatus();
  }, []);

  async function checkSetupStatus() {
    try {
      // Check calendar
      const calRes = await fetch('/api/calendar/calendars');
      const calData = await calRes.json();
      setHasCalendar(calData.connectedCalendars?.length > 0);

      // Check phone
      const phoneRes = await fetch('/api/sms/verify');
      const phoneData = await phoneRes.json();
      setHasPhone(phoneData.phoneVerified);

      // Auto-advance based on status
      if (calData.connectedCalendars?.length > 0 && phoneData.phoneVerified) {
        setStep('partner');
      } else if (calData.connectedCalendars?.length > 0) {
        setStep('phone');
      }
    } catch (e) {
      console.error('Error checking setup status:', e);
    }
  }

  async function handleConnectCalendar() {
    // Redirect to Google OAuth
    window.location.href = '/api/auth/signin?callbackUrl=/app/onboarding';
  }

  async function scanCalendarForPreview() {
    setStep('scanning');
    try {
      // Fetch this week's events
      const eventsRes = await fetch('/api/calendar/events');
      const eventsData = await eventsRes.json();

      // Fetch insights to see conflicts
      const insightsRes = await fetch('/api/insights');
      const insightsData = await insightsRes.json();

      const events = eventsData.events || [];
      const conflicts = (insightsData.insights || []).filter(
        (i: { type: string }) => i.type === 'conflict' || i.type === 'coverage_gap'
      );

      // Count events by day
      const dayEventCounts: Record<string, number> = {};
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

      events.forEach((event: { start?: { dateTime?: string; date?: string } }) => {
        const dateStr = event.start?.dateTime || event.start?.date;
        if (dateStr) {
          const date = new Date(dateStr);
          const day = dayNames[date.getDay()];
          dayEventCounts[day] = (dayEventCounts[day] || 0) + 1;
        }
      });

      const busyDays = Object.entries(dayEventCounts)
        .filter(([, count]) => count >= 3)
        .map(([day]) => day);

      const clearDays = dayNames.filter(day => !dayEventCounts[day]);

      setCalendarPreview({
        eventCount: events.length,
        conflictCount: conflicts.length,
        busyDays,
        clearDays: clearDays.slice(0, 2), // Show max 2 clear days
      });

      // Brief pause to show the scan results
      setTimeout(() => setStep('phone'), 2500);
    } catch (e) {
      console.error('Error scanning calendar:', e);
      // Even if scan fails, proceed to phone step
      setStep('phone');
    }
  }

  async function handleSendCode() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/sms/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCodeSent(true);
      setStep('verify');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send code');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleVerifyCode() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/sms/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verificationCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setHasPhone(true);
      setStep('partner');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid code');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleInvitePartner() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/household/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: partnerEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setInviteLink(data.inviteUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create invite');
    } finally {
      setIsLoading(false);
    }
  }

  function handleSkipPartner() {
    setStep('done');
  }

  function handleFinish() {
    router.push('/app');
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-surface to-background flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        {/* Progress indicator */}
        <div className="flex justify-center gap-2 mb-8">
          {['welcome', 'calendar', 'scanning', 'phone', 'verify', 'partner', 'done'].map((s, i) => (
            <div
              key={s}
              className={`h-2 w-8 rounded-full transition-colors ${
                i <= ['welcome', 'calendar', 'scanning', 'phone', 'verify', 'partner', 'done'].indexOf(step)
                  ? 'bg-accent-primary'
                  : 'bg-border'
              }`}
            />
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          {step === 'welcome' && (
            <div className="text-center">
              <div className="text-5xl mb-4">🔍</div>
              <h1 className="font-serif text-2xl text-text-primary mb-2">
                Meet Scout
              </h1>
              <p className="text-text-secondary mb-6">
                Scout is your family&apos;s friendly assistant who scouts ahead to find what matters in your day. No app required — Scout texts you when something needs attention.
              </p>
              <div className="bg-surface-alt rounded-lg p-4 mb-6 text-left">
                <p className="text-sm text-text-secondary">
                  <strong className="text-text-primary">How Scout helps:</strong>
                </p>
                <ul className="text-sm text-text-secondary mt-2 space-y-1">
                  <li>📅 Watches your calendars for conflicts</li>
                  <li>📱 Texts you when something needs attention</li>
                  <li>✅ Quick replies resolve issues fast</li>
                  <li>👫 Keeps you and your partner in sync</li>
                </ul>
              </div>
              <button
                onClick={() => setStep('calendar')}
                className="w-full py-3 bg-accent-primary text-white rounded-lg font-medium hover:bg-accent-primary/90 transition-colors"
              >
                Get Started
              </button>
            </div>
          )}

          {step === 'calendar' && (
            <div className="text-center">
              <div className="text-5xl mb-4">📅</div>
              <h1 className="font-serif text-2xl text-text-primary mb-2">
                Connect Your Calendar
              </h1>
              <p className="text-text-secondary mb-6">
                Scout needs access to your Google Calendar to spot conflicts and help coordinate with your partner.
              </p>
              {hasCalendar ? (
                <div className="bg-green-50 text-green-700 rounded-lg p-4 mb-6">
                  ✓ Calendar connected!
                </div>
              ) : null}
              <button
                onClick={hasCalendar ? scanCalendarForPreview : handleConnectCalendar}
                className="w-full py-3 bg-accent-primary text-white rounded-lg font-medium hover:bg-accent-primary/90 transition-colors"
              >
                {hasCalendar ? 'Let Scout Scan Your Week' : 'Connect Google Calendar'}
              </button>
            </div>
          )}

          {step === 'scanning' && (
            <div className="text-center">
              <div className="text-5xl mb-4 animate-pulse">🔍</div>
              <h1 className="font-serif text-2xl text-text-primary mb-2">
                Scout is scanning...
              </h1>
              {!calendarPreview ? (
                <p className="text-text-secondary mb-6">
                  Looking at your week to see what&apos;s ahead...
                </p>
              ) : (
                <div className="space-y-4">
                  <div className="bg-surface-alt rounded-lg p-4 text-left">
                    <p className="text-sm font-medium text-text-primary mb-3">
                      👀 Here&apos;s what I found:
                    </p>
                    <ul className="text-sm text-text-secondary space-y-2">
                      <li className="flex items-center gap-2">
                        <span className="text-lg">📅</span>
                        <span>
                          {calendarPreview.eventCount === 0
                            ? 'Clear calendar this week!'
                            : `${calendarPreview.eventCount} event${calendarPreview.eventCount !== 1 ? 's' : ''} this week`}
                        </span>
                      </li>
                      {calendarPreview.conflictCount > 0 && (
                        <li className="flex items-center gap-2 text-amber-600">
                          <span className="text-lg">⚠️</span>
                          <span>
                            {calendarPreview.conflictCount} thing{calendarPreview.conflictCount !== 1 ? 's' : ''} to watch
                          </span>
                        </li>
                      )}
                      {calendarPreview.conflictCount === 0 && calendarPreview.eventCount > 0 && (
                        <li className="flex items-center gap-2 text-green-600">
                          <span className="text-lg">✓</span>
                          <span>No conflicts spotted!</span>
                        </li>
                      )}
                      {calendarPreview.busyDays.length > 0 && (
                        <li className="flex items-center gap-2">
                          <span className="text-lg">🏃</span>
                          <span>Busy days: {calendarPreview.busyDays.join(', ')}</span>
                        </li>
                      )}
                      {calendarPreview.clearDays.length > 0 && (
                        <li className="flex items-center gap-2">
                          <span className="text-lg">🎯</span>
                          <span>Clear: {calendarPreview.clearDays.join(', ')}</span>
                        </li>
                      )}
                    </ul>
                  </div>
                  <p className="text-sm text-text-tertiary">
                    I&apos;ll keep watching and text you when something needs attention...
                  </p>
                </div>
              )}
            </div>
          )}

          {step === 'phone' && (
            <div className="text-center">
              <div className="text-5xl mb-4">📱</div>
              <h1 className="font-serif text-2xl text-text-primary mb-2">
                Add Your Phone Number
              </h1>
              <p className="text-text-secondary mb-6">
                This is how we&apos;ll reach you. We&apos;ll text you when something needs attention.
              </p>
              {error && (
                <div className="bg-red-50 text-red-700 rounded-lg p-3 mb-4 text-sm">
                  {error}
                </div>
              )}
              <input
                type="tel"
                placeholder="+1 555 123 4567"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full px-4 py-3 border border-border rounded-lg mb-4 text-center text-lg"
              />
              <p className="text-xs text-text-tertiary mb-4">
                Use international format: +1 for US, +44 for UK, etc.
              </p>
              <button
                onClick={handleSendCode}
                disabled={isLoading || !phoneNumber}
                className="w-full py-3 bg-accent-primary text-white rounded-lg font-medium hover:bg-accent-primary/90 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Sending...' : 'Send Verification Code'}
              </button>
            </div>
          )}

          {step === 'verify' && (
            <div className="text-center">
              <div className="text-5xl mb-4">🔐</div>
              <h1 className="font-serif text-2xl text-text-primary mb-2">
                Enter Verification Code
              </h1>
              <p className="text-text-secondary mb-6">
                We sent a 6-digit code to {phoneNumber}
              </p>
              {error && (
                <div className="bg-red-50 text-red-700 rounded-lg p-3 mb-4 text-sm">
                  {error}
                </div>
              )}
              <input
                type="text"
                placeholder="123456"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full px-4 py-3 border border-border rounded-lg mb-4 text-center text-2xl tracking-widest"
                maxLength={6}
              />
              <button
                onClick={handleVerifyCode}
                disabled={isLoading || verificationCode.length !== 6}
                className="w-full py-3 bg-accent-primary text-white rounded-lg font-medium hover:bg-accent-primary/90 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Verifying...' : 'Verify'}
              </button>
              <button
                onClick={() => { setCodeSent(false); setStep('phone'); }}
                className="w-full mt-3 py-2 text-text-secondary text-sm hover:text-text-primary"
              >
                Use a different number
              </button>
            </div>
          )}

          {step === 'partner' && (
            <div className="text-center">
              <div className="text-5xl mb-4">👫</div>
              <h1 className="font-serif text-2xl text-text-primary mb-2">
                Invite Your Partner
              </h1>
              <p className="text-text-secondary mb-6">
                FamilyOS works best with both parents. Invite your partner to join.
              </p>
              {error && (
                <div className="bg-red-50 text-red-700 rounded-lg p-3 mb-4 text-sm">
                  {error}
                </div>
              )}
              {inviteLink ? (
                <div className="bg-green-50 rounded-lg p-4 mb-6">
                  <p className="text-green-700 text-sm mb-2">Invite link created!</p>
                  <input
                    type="text"
                    value={inviteLink}
                    readOnly
                    className="w-full px-3 py-2 bg-white border border-green-200 rounded text-sm"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <button
                    onClick={() => navigator.clipboard.writeText(inviteLink)}
                    className="mt-2 text-green-700 text-sm underline"
                  >
                    Copy to clipboard
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="email"
                    placeholder="partner@email.com"
                    value={partnerEmail}
                    onChange={(e) => setPartnerEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-border rounded-lg mb-4"
                  />
                  <button
                    onClick={handleInvitePartner}
                    disabled={isLoading || !partnerEmail}
                    className="w-full py-3 bg-accent-primary text-white rounded-lg font-medium hover:bg-accent-primary/90 transition-colors disabled:opacity-50"
                  >
                    {isLoading ? 'Creating invite...' : 'Create Invite Link'}
                  </button>
                </>
              )}
              <button
                onClick={() => setStep('done')}
                className="w-full mt-3 py-2 text-text-secondary text-sm hover:text-text-primary"
              >
                {inviteLink ? 'Continue' : 'Skip for now'}
              </button>
            </div>
          )}

          {step === 'done' && (
            <div className="text-center">
              <div className="text-5xl mb-4">🎉</div>
              <h1 className="font-serif text-2xl text-text-primary mb-2">
                You&apos;re All Set!
              </h1>
              <p className="text-text-secondary mb-6">
                Scout is now watching your calendar. You&apos;ll get a text when something needs attention.
              </p>
              <div className="bg-surface-alt rounded-lg p-4 mb-6 text-left">
                <p className="text-sm font-medium text-text-primary mb-2">What Scout does:</p>
                <ul className="text-sm text-text-secondary space-y-2">
                  <li>📱 Texts you when conflicts or gaps pop up</li>
                  <li>💬 Quick replies (YES/NO/A/B) resolve things fast</li>
                  <li>👫 Keeps your partner automatically in sync</li>
                  <li>🌐 Web app for Deep Sync or settings</li>
                </ul>
              </div>
              <button
                onClick={handleFinish}
                className="w-full py-3 bg-accent-primary text-white rounded-lg font-medium hover:bg-accent-primary/90 transition-colors"
              >
                Go to Dashboard
              </button>
            </div>
          )}
        </div>

        {/* Skip link */}
        {step !== 'done' && step !== 'welcome' && (
          <p className="text-center mt-4 text-sm text-text-tertiary">
            <button onClick={handleFinish} className="underline hover:text-text-secondary">
              Skip setup and explore
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
