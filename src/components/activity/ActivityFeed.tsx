'use client';

import { useConversations, ConversationSummary } from '@/hooks/useConversations';
import ConversationCard from './ConversationCard';
import Skeleton from '@/components/shared/Skeleton';
import Card from '@/components/shared/Card';

interface ActivityFeedProps {
  channel?: 'sms' | 'chat' | 'ritual';
  status?: 'open' | 'resolved' | 'all';
}

export default function ActivityFeed({ channel, status = 'all' }: ActivityFeedProps) {
  const { conversations, isLoading, error, hasMore, loadMore, refetch } = useConversations({
    channel,
    status,
    limit: 20,
  });

  if (isLoading) {
    return <ActivityFeedSkeleton />;
  }

  if (error) {
    return (
      <Card variant="subtle" className="text-center py-8">
        <p className="text-text-secondary mb-4">Something went wrong loading activity</p>
        <button
          onClick={refetch}
          className="text-accent-primary hover:underline text-sm"
        >
          Try again
        </button>
      </Card>
    );
  }

  if (conversations.length === 0) {
    return (
      <Card variant="warm" className="text-center py-8">
        <div className="text-4xl mb-4">🔍</div>
        <h3 className="font-serif text-lg text-text-primary mb-2">No activity yet</h3>
        <p className="text-sm text-text-secondary">
          Your conversations with Scout will appear here.
        </p>
      </Card>
    );
  }

  // Group conversations by date
  const groupedConversations = groupByDate(conversations);

  return (
    <div className="space-y-6">
      {Object.entries(groupedConversations).map(([dateGroup, convs]) => (
        <div key={dateGroup}>
          <h3 className="text-sm font-medium text-text-tertiary mb-3 px-1">
            {dateGroup}
          </h3>
          <div className="space-y-3">
            {convs.map((conversation) => (
              <ConversationCard key={conversation.id} conversation={conversation} />
            ))}
          </div>
        </div>
      ))}

      {hasMore && (
        <div className="text-center pt-4">
          <button
            onClick={loadMore}
            className="text-sm text-accent-primary hover:underline"
          >
            Load more
          </button>
        </div>
      )}
    </div>
  );
}

function groupByDate(conversations: ConversationSummary[]): Record<string, ConversationSummary[]> {
  const groups: Record<string, ConversationSummary[]> = {};
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  for (const conv of conversations) {
    const convDate = new Date(conv.updatedAt);
    const convDay = new Date(convDate.getFullYear(), convDate.getMonth(), convDate.getDate());

    let group: string;
    if (convDay.getTime() >= today.getTime()) {
      group = 'Today';
    } else if (convDay.getTime() >= yesterday.getTime()) {
      group = 'Yesterday';
    } else if (convDay.getTime() >= lastWeek.getTime()) {
      group = 'This Week';
    } else {
      group = convDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }

    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(conv);
  }

  return groups;
}

function ActivityFeedSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-4 w-16 mb-3" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      </div>
      <div>
        <Skeleton className="h-4 w-20 mb-3" />
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
