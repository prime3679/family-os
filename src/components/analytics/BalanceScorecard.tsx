'use client';

import { Card } from '@/components/shared';
import { BalanceData } from '@/hooks/useAnalytics';

interface BalanceScorecardProps {
  data: BalanceData;
}

const balanceLabelColors = {
  balanced: 'text-accent-calm',
  'slight-imbalance': 'text-accent-warm',
  imbalanced: 'text-accent-alert',
};

export function BalanceScorecard({ data }: BalanceScorecardProps) {
  const { parentA, parentB, balanceScore, balanceLabel } = data;

  // Calculate which parent has more
  const diff = Math.abs(parentA.events - parentB.events);
  const heavier = parentA.events > parentB.events ? 'A' : parentB.events > parentA.events ? 'B' : null;

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Parent A Card */}
      <Card className={heavier === 'A' ? 'ring-2 ring-parent-a/30' : ''}>
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-full bg-parent-a flex items-center justify-center text-white font-medium">
            {parentA.name.charAt(0)}
          </div>
          <div>
            <h3 className="font-medium text-text-primary">{parentA.name}</h3>
            {heavier === 'A' && (
              <span className="text-xs text-parent-a">+{diff} events</span>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <StatRow label="Events" value={parentA.events} />
          <StatRow label="Handoffs" value={parentA.handoffs} />
          <StatRow label="Solo days" value={parentA.soloDays} />
        </div>
      </Card>

      {/* Parent B Card */}
      <Card className={heavier === 'B' ? 'ring-2 ring-parent-b/30' : ''}>
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-full bg-parent-b flex items-center justify-center text-white font-medium">
            {parentB.name.charAt(0)}
          </div>
          <div>
            <h3 className="font-medium text-text-primary">{parentB.name}</h3>
            {heavier === 'B' && (
              <span className="text-xs text-parent-b">+{diff} events</span>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <StatRow label="Events" value={parentB.events} />
          <StatRow label="Handoffs" value={parentB.handoffs} />
          <StatRow label="Solo days" value={parentB.soloDays} />
        </div>
      </Card>

      {/* Balance Indicator */}
      <div className="col-span-2">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-secondary">Week Balance</p>
              <p className={`font-medium capitalize ${balanceLabelColors[balanceLabel]}`}>
                {balanceLabel.replace('-', ' ')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-32 h-2 bg-surface-darker rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-parent-a to-parent-b rounded-full"
                  style={{ width: `${balanceScore}%` }}
                />
              </div>
              <span className="text-sm text-text-tertiary w-8">{balanceScore}%</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-text-secondary">{label}</span>
      <span className="font-medium text-text-primary">{value}</span>
    </div>
  );
}
