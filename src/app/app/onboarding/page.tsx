'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

type Step = 'welcome' | 'calendar' | 'phone' | 'verify' | 'partner' | 'done';

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
          {['welcome', 'calendar', 'phone', 'verify', 'partner', 'done'].map((s, i) => (
            <div
              key={s}
              className={`h-2 w-8 rounded-full transition-colors ${
                i <= ['welcome', 'calendar', 'phone', 'verify', 'partner', 'done'].indexOf(step)
                  ? 'bg-accent-primary'
                  : 'bg-border'
              }`}
            />
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          {step === 'welcome' && (
            <div className="text-center">
              <div className="text-5xl mb-4">👨‍👩‍👧‍👦</div>
              <h1 className="font-serif text-2xl text-text-primary mb-2">
                Welcome to FamilyOS
              </h1>
              <p className="text-text-secondary mb-6">
                Your family&apos;s proactive AI assistant. We&apos;ll text you when something needs attention - no app required for day-to-day coordination.
              </p>
              <div className="bg-surface-alt rounded-lg p-4 mb-6 text-left">
                <p className="text-sm text-text-secondary">
                  <strong className="text-text-primary">How it works:</strong>
                </p>
                <ul className="text-sm text-text-secondary mt-2 space-y-1">
                  <li>📅 We watch your calendars</li>
                  <li>📱 We text you when there&apos;s a conflict or gap</li>
                  <li>✅ You reply YES/NO to resolve</li>
                  <li>👫 Your partner stays in sync automatically</li>
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
                We need access to your Google Calendar to detect conflicts and coordinate with your partner.
              </p>
              {hasCalendar ? (
                <div className="bg-green-50 text-green-700 rounded-lg p-4 mb-6">
                  ✓ Calendar connected!
                </div>
              ) : null}
              <button
                onClick={hasCalendar ? () => setStep('phone') : handleConnectCalendar}
                className="w-full py-3 bg-accent-primary text-white rounded-lg font-medium hover:bg-accent-primary/90 transition-colors"
              >
                {hasCalendar ? 'Continue' : 'Connect Google Calendar'}
              </button>
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
                FamilyOS is now watching your calendar. We&apos;ll text you when something needs attention.
              </p>
              <div className="bg-surface-alt rounded-lg p-4 mb-6 text-left">
                <p className="text-sm font-medium text-text-primary mb-2">What happens next:</p>
                <ul className="text-sm text-text-secondary space-y-2">
                  <li>📱 You&apos;ll get a text when we spot a conflict or gap</li>
                  <li>💬 Reply YES/NO/A/B to resolve quickly</li>
                  <li>👫 Your partner stays in sync automatically</li>
                  <li>🌐 Use this web app for Deep Sync or settings</li>
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
