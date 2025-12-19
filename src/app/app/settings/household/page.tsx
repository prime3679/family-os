'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, Button } from '@/components/shared';

interface HouseholdMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface PendingInvite {
  id: string;
  email: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}

export default function HouseholdSettingsPage() {
  const { data: session } = useSession();
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Fetch household data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch pending invites
        const inviteRes = await fetch('/api/household/invite');
        if (inviteRes.ok) {
          const data = await inviteRes.json();
          setInvites(data.invites || []);
        }
      } catch (err) {
        console.error('Failed to fetch household data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (session) {
      fetchData();
    }
  }, [session]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setIsInviting(true);
    setError(null);
    setInviteUrl(null);

    try {
      const res = await fetch('/api/household/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to create invite');
        return;
      }

      setInviteUrl(data.inviteUrl);
      setInviteEmail('');

      // Refresh invites list
      const inviteRes = await fetch('/api/household/invite');
      if (inviteRes.ok) {
        const inviteData = await inviteRes.json();
        setInvites(inviteData.invites || []);
      }
    } catch {
      setError('Failed to create invite');
    } finally {
      setIsInviting(false);
    }
  };

  const copyToClipboard = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = inviteUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full flex-col">
        <header className="border-b border-border bg-surface px-6 py-4">
          <h1 className="font-serif text-xl text-text-primary">Household</h1>
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
        <h1 className="font-serif text-xl text-text-primary">Household</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Manage your household members and invite your co-parent
        </p>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-2xl space-y-8">
          {/* Invite co-parent section */}
          <section>
            <h2 className="text-sm font-semibold text-text-primary mb-4">
              Invite Co-Parent
            </h2>
            <Card>
              <p className="text-text-secondary mb-4">
                Invite your partner to join your household. They&apos;ll be able to
                see the family calendar and participate in weekly planning.
              </p>

              <form onSubmit={handleInvite} className="space-y-4">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-text-primary mb-2"
                  >
                    Partner&apos;s email
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      id="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="partner@example.com"
                      className="flex-1 px-4 py-2 rounded-lg border border-border bg-surface text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
                    />
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={isInviting || !inviteEmail.trim()}
                    >
                      {isInviting ? 'Sending...' : 'Send Invite'}
                    </Button>
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-red-600">{error}</p>
                )}

                {inviteUrl && (
                  <div className="bg-accent-calm/10 border border-accent-calm/30 rounded-lg p-4">
                    <p className="text-sm text-accent-calm font-medium mb-2">
                      Invite created!
                    </p>
                    <p className="text-sm text-text-secondary mb-3">
                      Share this link with your partner:
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={inviteUrl}
                        readOnly
                        className="flex-1 px-3 py-2 text-sm rounded-lg border border-border bg-white text-text-primary"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={copyToClipboard}
                      >
                        {copied ? 'Copied!' : 'Copy'}
                      </Button>
                    </div>
                  </div>
                )}
              </form>
            </Card>
          </section>

          {/* Pending invites */}
          {invites.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-text-primary mb-4">
                Pending Invites
              </h2>
              <Card padding="none">
                <div className="divide-y divide-border">
                  {invites.map((invite) => (
                    <div
                      key={invite.id}
                      className="flex items-center justify-between p-4"
                    >
                      <div>
                        <p className="text-sm font-medium text-text-primary">
                          {invite.email}
                        </p>
                        <p className="text-xs text-text-tertiary">
                          Expires{' '}
                          {new Date(invite.expiresAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-accent-warm/10 px-2 py-0.5 text-xs font-medium text-accent-warm">
                        Pending
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            </section>
          )}

          {/* Current user info */}
          <section>
            <h2 className="text-sm font-semibold text-text-primary mb-4">
              Your Account
            </h2>
            <Card>
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-parent-a to-parent-b text-white font-medium">
                  {session?.user?.name?.charAt(0) || 'U'}
                </div>
                <div>
                  <p className="font-medium text-text-primary">
                    {session?.user?.name || 'User'}
                  </p>
                  <p className="text-sm text-text-tertiary">
                    {session?.user?.email}
                  </p>
                </div>
              </div>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}
