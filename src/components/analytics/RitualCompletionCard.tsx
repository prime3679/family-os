'use client';

import { Card } from '@/components/shared';
import { BalanceData, TrendsData } from '@/hooks/useAnalytics';

interface RitualCompletionCardProps {
  balance: BalanceData;
  trends: TrendsData;
}

export function RitualCompletionCard({ balance, trends }: RitualCompletionCardProps) {
  const { ritualCompleted, prepProgress, taskProgress, intensity } = balance;
  const { summary } = trends;

  const prepPercent = prepProgress.total > 0
    ? Math.round((prepProgress.completed / prepProgress.total) * 100)
    : 0;

  const taskPercent = taskProgress.total > 0
    ? Math.round((taskProgress.completed / taskProgress.total) * 100)
    : 0;

  return (
    <Card>
      <h3 className="font-medium text-text-primary mb-4">This Week</h3>

      <div className="space-y-4">
        {/* Ritual Status */}
        <div className="flex items-center justify-between">
          <span className="text-text-secondary">Planning Ritual</span>
          {ritualCompleted ? (
            <span className="inline-flex items-center gap-1 text-accent-calm font-medium">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Complete
            </span>
          ) : (
            <span className="text-accent-warm font-medium">Not started</span>
          )}
        </div>

        {/* Week Intensity */}
        <div className="flex items-center justify-between">
          <span className="text-text-secondary">Week Intensity</span>
          <IntensityBadge intensity={intensity} />
        </div>

        {/* Prep Progress */}
        {prepProgress.total > 0 && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-text-secondary text-sm">Prep Items</span>
              <span className="text-sm text-text-primary">
                {prepProgress.completed}/{prepProgress.total}
              </span>
            </div>
            <div className="h-2 bg-surface-darker rounded-full overflow-hidden">
              <div
                className="h-full bg-accent-calm rounded-full transition-all"
                style={{ width: `${prepPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Task Progress */}
        {taskProgress.total > 0 && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-text-secondary text-sm">Tasks</span>
              <span className="text-sm text-text-primary">
                {taskProgress.completed}/{taskProgress.total}
              </span>
            </div>
            <div className="h-2 bg-surface-darker rounded-full overflow-hidden">
              <div
                className="h-full bg-accent-primary rounded-full transition-all"
                style={{ width: `${taskPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Ritual Streak */}
        {summary.ritualStreak > 0 && (
          <div className="pt-2 border-t border-border">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🔥</span>
              <div>
                <p className="font-medium text-text-primary">
                  {summary.ritualStreak} week streak!
                </p>
                <p className="text-xs text-text-tertiary">
                  {summary.ritualsCompleted} of {summary.totalWeeks} weeks completed
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

function IntensityBadge({ intensity }: { intensity: string }) {
  const styles = {
    light: 'bg-accent-calm/10 text-accent-calm',
    moderate: 'bg-accent-primary/10 text-accent-primary',
    heavy: 'bg-accent-warm/10 text-accent-warm',
    intense: 'bg-accent-alert/10 text-accent-alert',
  };

  const style = styles[intensity as keyof typeof styles] || styles.light;

  return (
    <span className={`px-2 py-0.5 rounded-full text-sm font-medium capitalize ${style}`}>
      {intensity}
    </span>
  );
}
