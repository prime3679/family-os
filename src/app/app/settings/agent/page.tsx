'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card } from '@/components/shared';

interface Preference {
  id: string;
  key: string;
  value: unknown;
  source: string;
  confidence: number;
  createdAt: string;
}

interface Pattern {
  id: string;
  key: string;
  description: string;
  confidence: number;
  createdAt: string;
}

interface PendingAction {
  id: string;
  actionType: string;
  actionData: Record<string, unknown>;
  status: string;
  riskLevel: string;
  reason: string;
  expiresAt: string;
  createdAt: string;
}

interface TrustScore {
  actionType: string;
  successCount: number;
  failureCount: number;
  rejectCount: number;
  successRate: number;
  autoApprove: boolean;
  canAutoApprove: boolean;
}

interface AgentSettings {
  preferences: Preference[];
  patterns: Pattern[];
  pendingActions: PendingAction[];
  trustScores: TrustScore[];
}

export default function AgentSettingsPage() {
  const [settings, setSettings] = useState<AgentSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      const response = await fetch('/api/agent/settings');
      if (!response.ok) {
        throw new Error('Failed to load settings');
      }
      const data = await response.json();
      setSettings(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleToggleAutoApprove = async (actionType: string, enabled: boolean) => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/agent/trust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionType, enabled }),
      });

      if (!response.ok) {
        throw new Error('Failed to update setting');
      }

      // Update local state
      setSettings(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          trustScores: prev.trustScores.map(t =>
            t.actionType === actionType ? { ...t, autoApprove: enabled } : t
          ),
        };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full flex-col">
        <header className="border-b border-border bg-surface px-6 py-4">
          <h1 className="font-serif text-xl text-text-primary">AI Agent</h1>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-text-tertiary">Loading...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col">
        <header className="border-b border-border bg-surface px-6 py-4">
          <h1 className="font-serif text-xl text-text-primary">AI Agent</h1>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-accent-warm">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="border-b border-border bg-surface px-6 py-4">
        <h1 className="font-serif text-xl text-text-primary">AI Agent</h1>
        <p className="mt-1 text-sm text-text-secondary">
          View what the agent has learned and manage automated actions
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

          {/* Trust & Auto-Approve */}
          <section>
            <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
              <svg className="h-5 w-5 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Trust & Auto-Approve
            </h2>
            <Card className="space-y-4">
              {settings?.trustScores && settings.trustScores.length > 0 ? (
                settings.trustScores.map((trust) => (
                  <div key={trust.actionType} className="flex items-start justify-between gap-4 py-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-text-primary">
                          {formatActionType(trust.actionType)}
                        </p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          trust.successRate >= 0.8
                            ? 'bg-accent-calm/20 text-accent-calm'
                            : trust.successRate >= 0.5
                              ? 'bg-accent-primary/20 text-accent-primary'
                              : 'bg-accent-warm/20 text-accent-warm'
                        }`}>
                          {Math.round(trust.successRate * 100)}% success
                        </span>
                      </div>
                      <p className="text-sm text-text-secondary mt-0.5">
                        {trust.successCount} successful, {trust.failureCount} failed, {trust.rejectCount} rejected
                      </p>
                      {!trust.canAutoApprove && (
                        <p className="text-xs text-text-tertiary mt-1">
                          Needs more history before auto-approve is available
                        </p>
                      )}
                    </div>
                    <Toggle
                      checked={trust.autoApprove}
                      onChange={(v) => handleToggleAutoApprove(trust.actionType, v)}
                      disabled={!trust.canAutoApprove}
                    />
                  </div>
                ))
              ) : (
                <p className="text-text-tertiary text-sm py-4 text-center">
                  No actions tracked yet. Use the chat to perform actions and build trust.
                </p>
              )}
            </Card>
          </section>

          {/* Pending Actions */}
          {settings?.pendingActions && settings.pendingActions.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
                <svg className="h-5 w-5 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Pending Actions
              </h2>
              <Card className="space-y-4">
                {settings.pendingActions.map((action) => (
                  <div key={action.id} className="flex items-start gap-4 py-2">
                    <div className={`flex-shrink-0 w-2 h-2 mt-2 rounded-full ${
                      action.riskLevel === 'critical' ? 'bg-red-500' :
                      action.riskLevel === 'high' ? 'bg-accent-warm' :
                      action.riskLevel === 'medium' ? 'bg-accent-primary' :
                      'bg-accent-calm'
                    }`} />
                    <div className="flex-1">
                      <p className="font-medium text-text-primary">
                        {formatActionType(action.actionType)}
                      </p>
                      <p className="text-sm text-text-secondary mt-0.5">
                        {action.reason || 'Awaiting approval'}
                      </p>
                      <p className="text-xs text-text-tertiary mt-1">
                        Expires {formatRelativeTime(action.expiresAt)}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      action.riskLevel === 'critical' ? 'bg-red-100 text-red-700' :
                      action.riskLevel === 'high' ? 'bg-accent-warm/20 text-accent-warm' :
                      action.riskLevel === 'medium' ? 'bg-accent-primary/20 text-accent-primary' :
                      'bg-accent-calm/20 text-accent-calm'
                    }`}>
                      {action.riskLevel} risk
                    </span>
                  </div>
                ))}
              </Card>
            </section>
          )}

          {/* Learned Preferences */}
          <section>
            <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
              <svg className="h-5 w-5 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Learned Preferences
            </h2>
            <Card className="space-y-4">
              {settings?.preferences && settings.preferences.length > 0 ? (
                settings.preferences.map((pref) => (
                  <div key={pref.id} className="py-2">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-text-primary">
                        {formatPreferenceKey(pref.key)}
                      </p>
                      <span className="text-xs text-text-tertiary">
                        {Math.round(pref.confidence * 100)}% confidence
                      </span>
                    </div>
                    <p className="text-sm text-text-secondary mt-0.5">
                      {formatPreferenceValue(pref.value)}
                    </p>
                    <p className="text-xs text-text-tertiary mt-1">
                      Source: {pref.source}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-text-tertiary text-sm py-4 text-center">
                  No preferences learned yet. The agent will learn as you interact.
                </p>
              )}
            </Card>
          </section>

          {/* Detected Patterns */}
          <section>
            <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
              <svg className="h-5 w-5 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
              Detected Patterns
            </h2>
            <Card className="space-y-4">
              {settings?.patterns && settings.patterns.length > 0 ? (
                settings.patterns.map((pattern) => (
                  <div key={pattern.id} className="py-2">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-text-primary">
                        {pattern.description}
                      </p>
                      <span className="text-xs text-text-tertiary">
                        {Math.round(pattern.confidence * 100)}% confidence
                      </span>
                    </div>
                    <p className="text-xs text-text-tertiary mt-1">
                      Detected {formatRelativeTime(pattern.createdAt)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-text-tertiary text-sm py-4 text-center">
                  No patterns detected yet. The agent will identify patterns over time.
                </p>
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
  disabled = false,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`
        relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full
        border-2 border-transparent transition-colors duration-200 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:ring-offset-2
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
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

// Helper functions
function formatActionType(type: string): string {
  return type
    .split(/(?=[A-Z])|_/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function formatPreferenceKey(key: string): string {
  return key
    .split(/[_-]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatPreferenceValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return value.toString();
  if (value === null || value === undefined) return 'Not set';
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffMins = Math.round(diffMs / 60000);
  const diffHours = Math.round(diffMs / 3600000);
  const diffDays = Math.round(diffMs / 86400000);

  if (diffMs < 0) {
    // Past
    if (diffMins > -60) return `${Math.abs(diffMins)} minutes ago`;
    if (diffHours > -24) return `${Math.abs(diffHours)} hours ago`;
    return `${Math.abs(diffDays)} days ago`;
  } else {
    // Future
    if (diffMins < 60) return `in ${diffMins} minutes`;
    if (diffHours < 24) return `in ${diffHours} hours`;
    return `in ${diffDays} days`;
  }
}
