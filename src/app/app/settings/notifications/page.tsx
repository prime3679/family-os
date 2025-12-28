'use client';

import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { Card } from '@/components/shared';
import PushNotificationPrompt from '@/components/notifications/PushNotificationPrompt';

export default function NotificationSettingsPage() {
  const { preferences, isLoading, isSaving, updatePreferences } = useNotificationPreferences();

  const handleToggle = async (key: string, value: boolean) => {
    await updatePreferences({ [key]: value });
  };

  const handleSelect = async (key: string, value: string) => {
    await updatePreferences({ [key]: value });
  };

  if (isLoading) {
    return (
      <div className="flex h-full flex-col">
        <header className="border-b border-border bg-surface px-6 py-4">
          <h1 className="font-serif text-xl text-text-primary">Notifications</h1>
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
        <h1 className="font-serif text-xl text-text-primary">Notifications</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Manage how you receive updates and reminders
        </p>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-2xl space-y-8">
          {/* Saving indicator */}
          {isSaving && (
            <div className="fixed top-4 right-4 bg-accent-calm text-white px-3 py-1.5 rounded-lg text-sm shadow-lg animate-fade-in-up">
              Saving...
            </div>
          )}

          {/* Email Notifications */}
          <section>
            <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
              <svg className="h-5 w-5 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Email Notifications
            </h2>
            <Card className="space-y-6">
              {/* Weekly Digest */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-text-primary">Weekly Digest</p>
                  <p className="text-sm text-text-secondary mt-0.5">
                    Get a summary of your week every Monday morning with AI insights
                  </p>
                </div>
                <Toggle
                  checked={preferences?.emailDigest ?? true}
                  onChange={(v) => handleToggle('emailDigest', v)}
                />
              </div>

              {/* Digest timing (only show if digest is enabled) */}
              {preferences?.emailDigest && (
                <div className="pl-0 border-l-2 border-border ml-0 space-y-4">
                  <div className="flex items-center gap-4">
                    <label className="text-sm text-text-secondary whitespace-nowrap">
                      Send on
                    </label>
                    <select
                      value={preferences?.emailDigestDay ?? 'monday'}
                      onChange={(e) => handleSelect('emailDigestDay', e.target.value)}
                      className="px-3 py-1.5 rounded-lg border border-border bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
                    >
                      <option value="sunday">Sunday</option>
                      <option value="monday">Monday</option>
                      <option value="saturday">Saturday</option>
                    </select>
                    <label className="text-sm text-text-secondary whitespace-nowrap">
                      at
                    </label>
                    <select
                      value={preferences?.emailDigestTime ?? '07:00'}
                      onChange={(e) => handleSelect('emailDigestTime', e.target.value)}
                      className="px-3 py-1.5 rounded-lg border border-border bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
                    >
                      <option value="06:00">6:00 AM</option>
                      <option value="07:00">7:00 AM</option>
                      <option value="08:00">8:00 AM</option>
                      <option value="09:00">9:00 AM</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="border-t border-border pt-6" />

              {/* Partner Complete Email */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-text-primary">Partner Completed Ritual</p>
                  <p className="text-sm text-text-secondary mt-0.5">
                    Get notified when your partner finishes their weekly planning
                  </p>
                </div>
                <Toggle
                  checked={preferences?.emailPartnerComplete ?? true}
                  onChange={(v) => handleToggle('emailPartnerComplete', v)}
                />
              </div>
            </Card>
          </section>

          {/* Push Notifications */}
          <section>
            <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
              <svg className="h-5 w-5 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              Push Notifications
            </h2>
            <PushNotificationPrompt />
            <Card className="space-y-6 mt-4">
              {/* Master push toggle */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-text-primary">Enable Push Notifications</p>
                  <p className="text-sm text-text-secondary mt-0.5">
                    Receive real-time notifications on your device
                  </p>
                </div>
                <Toggle
                  checked={preferences?.pushEnabled ?? true}
                  onChange={(v) => handleToggle('pushEnabled', v)}
                />
              </div>

              {preferences?.pushEnabled && (
                <>
                  <div className="border-t border-border pt-6" />

                  {/* Partner Complete Push */}
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-text-primary">Partner Finished</p>
                      <p className="text-sm text-text-secondary mt-0.5">
                        When your partner completes their ritual - time to sync!
                      </p>
                    </div>
                    <Toggle
                      checked={preferences?.pushPartnerComplete ?? true}
                      onChange={(v) => handleToggle('pushPartnerComplete', v)}
                    />
                  </div>

                  {/* Partner Waiting Push */}
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-text-primary">Partner Waiting</p>
                      <p className="text-sm text-text-secondary mt-0.5">
                        Gentle reminder when your partner has been waiting for you
                      </p>
                    </div>
                    <Toggle
                      checked={preferences?.pushPartnerWaiting ?? true}
                      onChange={(v) => handleToggle('pushPartnerWaiting', v)}
                    />
                  </div>

                  {/* Prep Reminder Push */}
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-text-primary">Prep Reminders</p>
                      <p className="text-sm text-text-secondary mt-0.5">
                        Day-before reminders for events that need preparation
                      </p>
                    </div>
                    <Toggle
                      checked={preferences?.pushPrepReminder ?? true}
                      onChange={(v) => handleToggle('pushPrepReminder', v)}
                    />
                  </div>

                  {/* Nudge Push */}
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-text-primary">Partner Nudges</p>
                      <p className="text-sm text-text-secondary mt-0.5">
                        When your partner sends you a friendly reminder
                      </p>
                    </div>
                    <Toggle
                      checked={preferences?.pushNudge ?? true}
                      onChange={(v) => handleToggle('pushNudge', v)}
                    />
                  </div>
                </>
              )}
            </Card>
          </section>

          {/* Quiet Hours */}
          <section>
            <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
              <svg className="h-5 w-5 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
              Quiet Hours
            </h2>
            <Card className="space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-text-primary">Enable Quiet Hours</p>
                  <p className="text-sm text-text-secondary mt-0.5">
                    Pause push notifications during specific hours
                  </p>
                </div>
                <Toggle
                  checked={preferences?.quietHoursEnabled ?? false}
                  onChange={(v) => handleToggle('quietHoursEnabled', v)}
                />
              </div>

              {preferences?.quietHoursEnabled && (
                <div className="flex items-center gap-4">
                  <label className="text-sm text-text-secondary whitespace-nowrap">
                    From
                  </label>
                  <select
                    value={preferences?.quietHoursStart ?? '22:00'}
                    onChange={(e) => handleSelect('quietHoursStart', e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-border bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
                  >
                    {Array.from({ length: 24 }, (_, i) => {
                      const hour = i.toString().padStart(2, '0');
                      const display = i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`;
                      return <option key={hour} value={`${hour}:00`}>{display}</option>;
                    })}
                  </select>
                  <label className="text-sm text-text-secondary whitespace-nowrap">
                    to
                  </label>
                  <select
                    value={preferences?.quietHoursEnd ?? '07:00'}
                    onChange={(e) => handleSelect('quietHoursEnd', e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-border bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
                  >
                    {Array.from({ length: 24 }, (_, i) => {
                      const hour = i.toString().padStart(2, '0');
                      const display = i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`;
                      return <option key={hour} value={`${hour}:00`}>{display}</option>;
                    })}
                  </select>
                </div>
              )}
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}

// Toggle switch component
function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`
        relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full
        border-2 border-transparent transition-colors duration-200 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:ring-offset-2
        ${checked ? 'bg-accent-calm' : 'bg-text-tertiary/30'}
      `}
    >
      <span
        className={`
          pointer-events-none inline-block h-5 w-5 transform rounded-full
          bg-white shadow ring-0 transition duration-200 ease-in-out
          ${checked ? 'translate-x-5' : 'translate-x-0'}
        `}
      />
    </button>
  );
}
