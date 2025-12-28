'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';

interface UnsubscribePageProps {
  params: Promise<{ token: string }>;
}

export default function UnsubscribePage({ params }: UnsubscribePageProps) {
  const resolvedParams = use(params);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [email, setEmail] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = async () => {
      try {
        const response = await fetch(`/api/notifications/unsubscribe/${resolvedParams.token}`, {
          method: 'POST',
        });

        const data = await response.json();

        if (response.ok) {
          setStatus('success');
          setEmail(data.email);
        } else {
          setStatus('error');
          setErrorMessage(data.error || 'Failed to unsubscribe');
        }
      } catch {
        setStatus('error');
        setErrorMessage('Something went wrong. Please try again.');
      }
    };

    unsubscribe();
  }, [resolvedParams.token]);

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="text-center">
          {/* Logo */}
          <h1 className="font-serif text-2xl text-accent-primary mb-8">Family OS</h1>

          {/* Loading state */}
          {status === 'loading' && (
            <div className="bg-white rounded-2xl shadow-sm p-8">
              <div className="h-8 w-8 border-2 border-accent-warm border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-text-secondary">Processing your request...</p>
            </div>
          )}

          {/* Success state */}
          {status === 'success' && (
            <div className="bg-white rounded-2xl shadow-sm p-8">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-accent-calm/20 mb-6">
                <svg
                  className="h-8 w-8 text-accent-calm"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="font-serif text-xl text-text-primary mb-2">
                You&apos;ve been unsubscribed
              </h2>
              <p className="text-text-secondary mb-6">
                {email
                  ? `We've turned off email digests for ${email}.`
                  : "We've updated your notification preferences."}
              </p>
              <p className="text-sm text-text-tertiary mb-6">
                You can always re-enable notifications from your settings.
              </p>
              <Link
                href="/app/settings/notifications"
                className="inline-block bg-accent-primary text-white px-6 py-2 rounded-lg hover:bg-accent-primary/90 transition-colors"
              >
                Manage preferences
              </Link>
            </div>
          )}

          {/* Error state */}
          {status === 'error' && (
            <div className="bg-white rounded-2xl shadow-sm p-8">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-accent-alert/20 mb-6">
                <svg
                  className="h-8 w-8 text-accent-alert"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h2 className="font-serif text-xl text-text-primary mb-2">
                Something went wrong
              </h2>
              <p className="text-text-secondary mb-6">
                {errorMessage || 'We couldn\'t process your request.'}
              </p>
              <Link
                href="/app/settings/notifications"
                className="inline-block bg-accent-primary text-white px-6 py-2 rounded-lg hover:bg-accent-primary/90 transition-colors"
              >
                Manage preferences manually
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
