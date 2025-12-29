'use client';

import { useInsights } from '@/hooks/useInsights';
import InsightList from '@/components/insights/InsightList';
import { useToast } from '@/components/providers/ToastProvider';

export default function InsightsPage() {
  const { insights, counts, isLoading, error, resolveInsight, dismissInsight, refetch } = useInsights();
  const { showToast } = useToast();

  const handleAction = async (insightId: string, action: string) => {
    // Handle navigation actions (no API call needed)
    if (action === 'view_conflict' || action === 'view_schedule') {
      window.location.href = '/app/week';
      return;
    }

    if (action === 'suggest_swap') {
      window.location.href = '/app/chat?message=I%20need%20help%20with%20schedule%20swapping';
      return;
    }

    // Call the action API for actions that need backend processing
    try {
      const response = await fetch(`/api/insights/${insightId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      const result = await response.json();

      if (!response.ok) {
        showToast({ type: 'error', message: result.error || 'Action failed' });
        return;
      }

      showToast({ type: 'success', message: result.message || 'Done!' });

      // Refetch insights to update the list
      refetch();
    } catch (error) {
      console.error('Action error:', error);
      showToast({ type: 'error', message: 'Something went wrong' });
    }
  };

  const totalActive = counts.pending + counts.sent;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="border-b border-border bg-surface px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-xl text-text-primary">Insights</h1>
            <p className="mt-1 text-sm text-text-secondary">
              What FamilyOS has detected
            </p>
          </div>
          {totalActive > 0 && (
            <div className="flex items-center gap-2 bg-accent-warm/20 text-accent-primary px-3 py-1.5 rounded-full">
              <span className="font-bold">{totalActive}</span>
              <span className="text-sm">need attention</span>
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-3xl">
          {/* Info Banner (shown when empty) */}
          {insights.length === 0 && !isLoading && !error && (
            <div className="mb-6 bg-gradient-to-r from-accent-primary/10 to-accent-warm/10 rounded-2xl p-6 border border-accent-primary/20">
              <h2 className="font-serif text-lg text-text-primary mb-2">
                How Insights Work
              </h2>
              <p className="text-text-secondary text-sm leading-relaxed">
                FamilyOS automatically analyzes your connected calendars to detect:
              </p>
              <ul className="mt-3 space-y-2 text-sm text-text-secondary">
                <li className="flex items-center gap-2">
                  <span>📅</span>
                  <span><strong>Calendar Gaps:</strong> Events on one calendar but not the other</span>
                </li>
                <li className="flex items-center gap-2">
                  <span>⚠️</span>
                  <span><strong>Conflicts:</strong> Overlapping events between parents</span>
                </li>
                <li className="flex items-center gap-2">
                  <span>🚨</span>
                  <span><strong>Coverage Gaps:</strong> Times when no one is available</span>
                </li>
                <li className="flex items-center gap-2">
                  <span>📊</span>
                  <span><strong>Load Imbalance:</strong> Uneven distribution of responsibilities</span>
                </li>
                <li className="flex items-center gap-2">
                  <span>⚽</span>
                  <span><strong>Prep Reminders:</strong> Upcoming events needing preparation</span>
                </li>
              </ul>
              <p className="mt-4 text-xs text-text-tertiary">
                When SMS is enabled, you&apos;ll receive text messages about important insights with one-tap resolution.
              </p>
            </div>
          )}

          {/* Insight List */}
          <InsightList
            insights={insights}
            counts={counts}
            isLoading={isLoading}
            error={error}
            onResolve={resolveInsight}
            onDismiss={dismissInsight}
            onAction={handleAction}
          />

          {/* Refresh Button */}
          {!isLoading && insights.length > 0 && (
            <div className="mt-8 text-center">
              <button
                onClick={() => refetch()}
                className="text-sm text-text-tertiary hover:text-text-primary transition-calm"
              >
                Refresh insights
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
