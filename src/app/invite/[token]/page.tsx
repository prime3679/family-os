'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import Link from 'next/link';

interface InviteDetails {
  email: string;
  householdName: string;
  inviterName: string;
  expiresAt: string;
}

export default function AcceptInvitePage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const token = params.token as string;

  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  // Fetch invite details
  useEffect(() => {
    const fetchInvite = async () => {
      try {
        const response = await fetch(`/api/household/invite/${token}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || 'Invalid invite');
          return;
        }

        setInvite(data.invite);
      } catch {
        setError('Failed to load invite');
      } finally {
        setIsLoading(false);
      }
    };

    if (token) {
      fetchInvite();
    }
  }, [token]);

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      const response = await fetch(`/api/household/invite/${token}`, {
        method: 'POST',
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to accept invite');
        setIsAccepting(false);
        return;
      }

      setAccepted(true);
      // Redirect to app after 2 seconds
      setTimeout(() => {
        router.push('/app');
      }, 2000);
    } catch {
      setError('Failed to accept invite');
      setIsAccepting(false);
    }
  };

  // Loading state
  if (isLoading || status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white">
        <div className="text-center">
          <div className="h-8 w-8 border-2 border-accent-warm border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading invite...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white p-4">
        <div className="max-w-md w-full text-center">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="text-4xl mb-4">😔</div>
            <h1 className="text-xl font-semibold text-slate-900 mb-2">
              Invite Not Available
            </h1>
            <p className="text-slate-600 mb-6">{error}</p>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-white hover:bg-primary/90 transition-colors"
            >
              Go to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Accepted state
  if (accepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white p-4">
        <div className="max-w-md w-full text-center">
          <div className="rounded-2xl border border-green-200 bg-green-50 p-8">
            <div className="text-4xl mb-4">🎉</div>
            <h1 className="text-xl font-semibold text-green-900 mb-2">
              Welcome to {invite?.householdName}!
            </h1>
            <p className="text-green-700 mb-4">
              You&apos;ve successfully joined the household. Redirecting...
            </p>
            <div className="h-4 w-4 border-2 border-accent-warm border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  // Invite details
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white p-4">
      <div className="max-w-md w-full">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="text-center mb-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mx-auto mb-4">
              <span className="text-2xl">👨‍👩‍👧‍👦</span>
            </div>
            <h1 className="text-2xl font-semibold text-slate-900 mb-2">
              You&apos;re Invited!
            </h1>
            <p className="text-slate-600">
              <span className="font-medium">{invite?.inviterName}</span> invited
              you to join
            </p>
            <p className="text-xl font-semibold text-primary mt-1">
              {invite?.householdName}
            </p>
          </div>

          <div className="border-t border-slate-100 pt-6">
            {session ? (
              // User is logged in - show accept button
              <div className="space-y-4">
                <p className="text-sm text-slate-600 text-center">
                  Signed in as{' '}
                  <span className="font-medium">{session.user?.email}</span>
                </p>
                <button
                  onClick={handleAccept}
                  disabled={isAccepting}
                  className="w-full rounded-lg bg-primary px-6 py-3 text-white font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAccepting ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 border-2 border-accent-warm border-t-transparent rounded-full animate-spin" />
                      Joining...
                    </span>
                  ) : (
                    'Accept Invite'
                  )}
                </button>
                <p className="text-xs text-slate-500 text-center">
                  By accepting, you&apos;ll share calendars and planning with
                  this household.
                </p>
              </div>
            ) : (
              // User not logged in - show sign in button
              <div className="space-y-4">
                <p className="text-sm text-slate-600 text-center">
                  Sign in with Google to accept this invite
                </p>
                <button
                  onClick={() => signIn('google', { callbackUrl: `/invite/${token}` })}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-white font-medium hover:bg-primary/90 transition-colors"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Sign in with Google
                </button>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          <Link href="/" className="hover:text-slate-700">
            What is Family OS?
          </Link>
        </p>
      </div>
    </div>
  );
}
