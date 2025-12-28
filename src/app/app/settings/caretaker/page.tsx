'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, Button } from '@/components/shared';

interface CaretakerLink {
  id: string;
  token: string;
  name: string;
  validFrom: string;
  validUntil: string;
  notes?: string;
  accessedAt?: string;
  accessCount: number;
  accessUrl: string;
  createdAt: string;
}

export default function CaretakerSettingsPage() {
  const { data: session } = useSession();
  const [links, setLinks] = useState<CaretakerLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    validFrom: new Date().toISOString().split('T')[0],
    validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: '',
  });

  // Fetch caretaker links
  useEffect(() => {
    const fetchLinks = async () => {
      try {
        const res = await fetch('/api/caretaker');
        if (res.ok) {
          const data = await res.json();
          setLinks(data.links || []);
        }
      } catch (err) {
        console.error('Failed to fetch caretaker links:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (session) {
      fetchLinks();
    } else if (session === null) {
      setIsLoading(false);
    }
  }, [session]);

  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setIsCreating(true);
    setError(null);

    try {
      const res = await fetch('/api/caretaker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          validFrom: new Date(formData.validFrom).toISOString(),
          validUntil: new Date(formData.validUntil).toISOString(),
          notes: formData.notes || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to create link');
        return;
      }

      // Add new link to list
      setLinks([data.link, ...links]);

      // Reset form
      setFormData({
        name: '',
        validFrom: new Date().toISOString().split('T')[0],
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: '',
      });
      setShowForm(false);
    } catch {
      setError('Failed to create link');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevokeLink = async (linkId: string) => {
    if (!confirm('Are you sure you want to revoke this access link?')) return;

    try {
      const res = await fetch(`/api/caretaker?id=${linkId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setLinks(links.filter((link) => link.id !== linkId));
      }
    } catch (err) {
      console.error('Failed to revoke link:', err);
    }
  };

  const copyToClipboard = async (url: string, id: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const isLinkActive = (link: CaretakerLink) => {
    const now = new Date();
    const validFrom = new Date(link.validFrom);
    const validUntil = new Date(link.validUntil);
    return now >= validFrom && now <= validUntil;
  };

  if (isLoading) {
    return (
      <div className="flex h-full flex-col">
        <header className="border-b border-border bg-surface px-6 py-4">
          <h1 className="font-serif text-xl text-text-primary">Caretaker Access</h1>
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
        <h1 className="font-serif text-xl text-text-primary">Caretaker Access</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Create temporary access links for babysitters, grandparents, and other caretakers
        </p>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Create new link section */}
          <section>
            {!showForm ? (
              <Button
                onClick={() => setShowForm(true)}
                variant="primary"
                className="w-full"
              >
                Create New Access Link
              </Button>
            ) : (
              <Card>
                <h2 className="text-sm font-semibold text-text-primary mb-4">
                  New Caretaker Access Link
                </h2>
                <form onSubmit={handleCreateLink} className="space-y-4">
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-sm font-medium text-text-primary mb-2"
                    >
                      Caretaker Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Grandma, Babysitter Sarah"
                      className="w-full px-4 py-2 rounded-lg border border-border bg-surface text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="validFrom"
                        className="block text-sm font-medium text-text-primary mb-2"
                      >
                        Valid From
                      </label>
                      <input
                        type="date"
                        id="validFrom"
                        value={formData.validFrom}
                        onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
                        required
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="validUntil"
                        className="block text-sm font-medium text-text-primary mb-2"
                      >
                        Valid Until
                      </label>
                      <input
                        type="date"
                        id="validUntil"
                        value={formData.validUntil}
                        onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="notes"
                      className="block text-sm font-medium text-text-primary mb-2"
                    >
                      Special Notes (Optional)
                    </label>
                    <textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="e.g., Bedtime is 8pm, allergies, emergency contacts..."
                      rows={3}
                      className="w-full px-4 py-2 rounded-lg border border-border bg-surface text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
                    />
                  </div>

                  {error && (
                    <p className="text-sm text-accent-alert">{error}</p>
                  )}

                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={isCreating}
                    >
                      {isCreating ? 'Creating...' : 'Create Link'}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setShowForm(false);
                        setError(null);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </Card>
            )}
          </section>

          {/* Existing links */}
          {links.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-text-primary mb-4">
                Existing Access Links
              </h2>
              <Card padding="none">
                <div className="divide-y divide-border">
                  {links.map((link) => {
                    const active = isLinkActive(link);
                    return (
                      <div key={link.id} className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-text-primary">
                                {link.name}
                              </p>
                              {active ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-accent-calm/10 px-2 py-0.5 text-xs font-medium text-accent-calm">
                                  <span className="h-1.5 w-1.5 rounded-full bg-accent-calm" />
                                  Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-full bg-text-tertiary/10 px-2 py-0.5 text-xs font-medium text-text-tertiary">
                                  Expired
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-text-tertiary mt-1">
                              Valid: {new Date(link.validFrom).toLocaleDateString()} - {new Date(link.validUntil).toLocaleDateString()}
                            </p>
                            {link.accessedAt && (
                              <p className="text-xs text-text-tertiary">
                                Last accessed: {new Date(link.accessedAt).toLocaleDateString()} ({link.accessCount} times)
                              </p>
                            )}
                          </div>
                          <Button
                            variant="secondary"
                            onClick={() => handleRevokeLink(link.id)}
                            className="text-sm"
                          >
                            Revoke
                          </Button>
                        </div>

                        {link.notes && (
                          <p className="text-sm text-text-secondary mb-3 p-2 bg-surface-alt rounded">
                            {link.notes}
                          </p>
                        )}

                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={link.accessUrl}
                            readOnly
                            className="flex-1 px-3 py-2 text-sm rounded-lg border border-border bg-white text-text-primary"
                          />
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => copyToClipboard(link.accessUrl, link.id)}
                          >
                            {copiedId === link.id ? 'Copied!' : 'Copy'}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </section>
          )}

          {links.length === 0 && !showForm && (
            <Card>
              <div className="text-center py-8">
                <div className="text-4xl mb-4">🔗</div>
                <p className="text-text-secondary mb-4">
                  No caretaker access links created yet.
                </p>
                <p className="text-sm text-text-tertiary">
                  Create a temporary access link to share today&apos;s schedule and family info with babysitters, grandparents, or other caretakers.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
