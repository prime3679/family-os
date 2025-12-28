import React, { ReactNode, CSSProperties } from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'card' | 'circle' | 'rect';
  width?: string;
  height?: string;
  style?: CSSProperties;
}

interface SkeletonSubComponentProps {
  className?: string;
}

type SkeletonSubComponent = (props: SkeletonSubComponentProps) => React.ReactElement;

interface SkeletonComponent {
  (props: SkeletonProps): React.ReactElement;
  Card: SkeletonSubComponent;
  Stat: SkeletonSubComponent;
  Narrative: SkeletonSubComponent;
  PrepCard: SkeletonSubComponent;
  DecisionCard: SkeletonSubComponent;
  Affirmation: SkeletonSubComponent;
  TaskCard: SkeletonSubComponent;
  ChildCard: SkeletonSubComponent;
  BalanceCard: SkeletonSubComponent;
  Chart: SkeletonSubComponent;
}

const Skeleton = function({
  className = '',
  variant = 'text',
  width,
  height,
  style,
}: SkeletonProps) {
  const baseClasses = 'animate-skeleton-pulse rounded';

  const variantClasses = {
    text: 'h-4',
    card: 'rounded-2xl',
    circle: 'rounded-full',
    rect: '',
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={{ width, height, ...style }}
      role="status"
      aria-label="Loading..."
    />
  );
}

// Compound component: Card skeleton (for conflicts, decisions)
function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-surface border border-border rounded-2xl p-6 ${className}`}>
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <Skeleton variant="text" className="w-24 h-3" />
            <Skeleton variant="text" className="w-48 h-5" />
          </div>
          <Skeleton variant="text" className="w-16 h-5 rounded-md" />
        </div>
        <Skeleton variant="text" className="w-full h-4" />
        <Skeleton variant="text" className="w-3/4 h-4" />
        <div className="flex gap-2 pt-2">
          <Skeleton variant="text" className="w-20 h-6 rounded-md" />
          <Skeleton variant="text" className="w-24 h-6 rounded-md" />
        </div>
      </div>
    </div>
  );
}

// Compound component: Stat box skeleton
function SkeletonStat({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-surface-alt rounded-xl p-4 text-center ${className}`}>
      <Skeleton variant="text" className="w-12 h-8 mx-auto mb-2" />
      <Skeleton variant="text" className="w-16 h-3 mx-auto" />
    </div>
  );
}

// Compound component: Narrative/paragraph skeleton
function SkeletonNarrative({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-surface border border-border rounded-2xl p-6 ${className}`}>
      <div className="space-y-3">
        <Skeleton variant="text" className="w-full h-4" />
        <Skeleton variant="text" className="w-full h-4" />
        <Skeleton variant="text" className="w-4/5 h-4" />
        <Skeleton variant="text" className="w-full h-4" />
        <Skeleton variant="text" className="w-2/3 h-4" />
      </div>
    </div>
  );
}

// Compound component: Prep card skeleton (with checklist items)
function SkeletonPrepCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-surface border border-border rounded-2xl p-6 ${className}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="space-y-2">
          <Skeleton variant="text" className="w-40 h-5" />
          <Skeleton variant="text" className="w-24 h-3" />
        </div>
        <Skeleton variant="text" className="w-10 h-4" />
      </div>
      <Skeleton variant="rect" className="w-full h-1.5 rounded-full mb-4" />
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton variant="circle" className="w-5 h-5 flex-shrink-0" />
          <Skeleton variant="text" className="flex-1 h-4" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton variant="circle" className="w-5 h-5 flex-shrink-0" />
          <Skeleton variant="text" className="flex-1 h-4" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton variant="circle" className="w-5 h-5 flex-shrink-0" />
          <Skeleton variant="text" className="w-3/4 h-4" />
        </div>
      </div>
    </div>
  );
}

// Compound component: Decision options skeleton
function SkeletonDecisionCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-surface border border-border rounded-2xl p-6 ${className}`}>
      <div className="space-y-4">
        <div className="space-y-2">
          <Skeleton variant="text" className="w-32 h-3" />
          <Skeleton variant="text" className="w-56 h-5" />
        </div>
        <Skeleton variant="text" className="w-full h-4" />
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-3 p-3 border border-border rounded-xl">
            <Skeleton variant="circle" className="w-5 h-5 flex-shrink-0" />
            <Skeleton variant="text" className="flex-1 h-4" />
          </div>
          <div className="flex items-center gap-3 p-3 border border-border rounded-xl">
            <Skeleton variant="circle" className="w-5 h-5 flex-shrink-0" />
            <Skeleton variant="text" className="w-4/5 h-4" />
          </div>
          <div className="flex items-center gap-3 p-3 border border-border rounded-xl">
            <Skeleton variant="circle" className="w-5 h-5 flex-shrink-0" />
            <Skeleton variant="text" className="w-3/4 h-4" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Compound component: Affirmation skeleton (centered)
function SkeletonAffirmation({ className = '' }: { className?: string }) {
  return (
    <div className={`text-center py-8 ${className}`}>
      <Skeleton variant="circle" className="w-16 h-16 mx-auto mb-6" />
      <Skeleton variant="text" className="w-64 h-8 mx-auto mb-4" />
      <Skeleton variant="text" className="w-80 h-4 mx-auto mb-2" />
      <Skeleton variant="text" className="w-72 h-4 mx-auto" />
    </div>
  );
}

// Compound component: Task card skeleton
function SkeletonTaskCard({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-start gap-3 p-4 ${className}`}>
      <Skeleton variant="circle" className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <div className="flex-1 space-y-2">
        <div className="flex items-start gap-2">
          <Skeleton variant="text" className="w-48 h-5" />
          <Skeleton variant="text" className="w-16 h-5 rounded-full" />
        </div>
        <Skeleton variant="text" className="w-full h-4" />
        <div className="flex items-center gap-2">
          <Skeleton variant="text" className="w-16 h-3" />
          <Skeleton variant="text" className="w-12 h-3" />
          <Skeleton variant="text" className="w-20 h-3" />
        </div>
      </div>
    </div>
  );
}

// Compound component: Child card skeleton
function SkeletonChildCard({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-4 p-4 ${className}`}>
      <Skeleton variant="circle" className="w-12 h-12 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" className="w-32 h-5" />
        <Skeleton variant="text" className="w-24 h-3" />
      </div>
      <Skeleton variant="text" className="w-8 h-8 rounded" />
    </div>
  );
}

// Compound component: Balance card skeleton (for analytics)
function SkeletonBalanceCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-surface border border-border rounded-2xl p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <Skeleton variant="text" className="w-32 h-6" />
        <Skeleton variant="text" className="w-16 h-8 rounded-lg" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Skeleton variant="text" className="w-20 h-3" />
          <Skeleton variant="text" className="w-full h-2 rounded-full" />
          <Skeleton variant="text" className="w-12 h-4" />
        </div>
        <div className="space-y-2">
          <Skeleton variant="text" className="w-20 h-3" />
          <Skeleton variant="text" className="w-full h-2 rounded-full" />
          <Skeleton variant="text" className="w-12 h-4" />
        </div>
        <div className="space-y-2">
          <Skeleton variant="text" className="w-20 h-3" />
          <Skeleton variant="text" className="w-full h-2 rounded-full" />
          <Skeleton variant="text" className="w-12 h-4" />
        </div>
        <div className="space-y-2">
          <Skeleton variant="text" className="w-20 h-3" />
          <Skeleton variant="text" className="w-full h-2 rounded-full" />
          <Skeleton variant="text" className="w-12 h-4" />
        </div>
      </div>
    </div>
  );
}

// Compound component: Chart skeleton (for analytics)
function SkeletonChart({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-surface border border-border rounded-2xl p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <Skeleton variant="text" className="w-28 h-5" />
        <div className="flex gap-2">
          <Skeleton variant="text" className="w-16 h-6 rounded" />
          <Skeleton variant="text" className="w-16 h-6 rounded" />
        </div>
      </div>
      <div className="h-48 flex items-end gap-2">
        {[40, 65, 45, 80, 55, 70, 60].map((h, i) => (
          <div key={i} className="flex-1 flex flex-col justify-end">
            <Skeleton variant="rect" className="w-full rounded-t" style={{ height: `${h}%` }} />
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-4">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((_, i) => (
          <Skeleton key={i} variant="text" className="w-8 h-3" />
        ))}
      </div>
    </div>
  );
}

// Attach compound components
(Skeleton as SkeletonComponent).Card = SkeletonCard;
(Skeleton as SkeletonComponent).Stat = SkeletonStat;
(Skeleton as SkeletonComponent).Narrative = SkeletonNarrative;
(Skeleton as SkeletonComponent).PrepCard = SkeletonPrepCard;
(Skeleton as SkeletonComponent).DecisionCard = SkeletonDecisionCard;
(Skeleton as SkeletonComponent).Affirmation = SkeletonAffirmation;
(Skeleton as SkeletonComponent).TaskCard = SkeletonTaskCard;
(Skeleton as SkeletonComponent).ChildCard = SkeletonChildCard;
(Skeleton as SkeletonComponent).BalanceCard = SkeletonBalanceCard;
(Skeleton as SkeletonComponent).Chart = SkeletonChart;

export default Skeleton as SkeletonComponent;
