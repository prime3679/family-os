'use client';

import { useEffect, useState } from 'react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Button, Card } from '@/components/shared';

export default function PushNotificationPrompt() {
  const {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    error,
    subscribe,
    unsubscribe,
  } = usePushNotifications();

  const [swRegistered, setSwRegistered] = useState(false);

  // Register service worker on mount
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then(() => setSwRegistered(true))
        .catch((err) => console.error('SW registration failed:', err));
    }
  }, []);

  if (!isSupported) {
    return (
      <Card className="bg-text-tertiary/5">
        <div className="flex items-center gap-3 text-text-tertiary">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
          <span className="text-sm">
            Push notifications aren&apos;t supported in this browser
          </span>
        </div>
      </Card>
    );
  }

  if (permission === 'denied') {
    return (
      <Card className="bg-accent-alert/5 border-accent-alert/20">
        <div className="flex items-start gap-3">
          <svg className="h-5 w-5 text-accent-alert flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-text-primary">Notifications blocked</p>
            <p className="text-sm text-text-secondary mt-1">
              You&apos;ve blocked notifications for this site. To enable them, click the lock icon in your browser&apos;s address bar and allow notifications.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  if (isSubscribed) {
    return (
      <Card className="bg-accent-calm/5 border-accent-calm/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-accent-calm/20 flex items-center justify-center">
              <svg className="h-4 w-4 text-accent-calm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">Push notifications enabled</p>
              <p className="text-sm text-text-secondary">You&apos;ll receive alerts on this device</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={unsubscribe}
            disabled={isLoading}
          >
            {isLoading ? 'Working...' : 'Disable'}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-start gap-4">
        <div className="h-10 w-10 rounded-full bg-accent-primary/10 flex items-center justify-center flex-shrink-0">
          <svg className="h-5 w-5 text-accent-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="font-medium text-text-primary">Enable push notifications</p>
          <p className="text-sm text-text-secondary mt-1">
            Get instant alerts when your partner finishes their ritual, sends a nudge, or when you have prep reminders.
          </p>
          {error && (
            <p className="text-sm text-accent-alert mt-2">{error}</p>
          )}
          <Button
            variant="primary"
            size="sm"
            className="mt-4"
            onClick={subscribe}
            disabled={isLoading || !swRegistered}
          >
            {isLoading ? 'Enabling...' : 'Enable notifications'}
          </Button>
        </div>
      </div>
    </Card>
  );
}
