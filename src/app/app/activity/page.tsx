'use client';

import { useState } from 'react';
import ActivityFeed from '@/components/activity/ActivityFeed';

type StatusFilter = 'all' | 'open' | 'resolved';
type ChannelFilter = 'all' | 'sms' | 'chat' | 'ritual';

export default function ActivityPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('all');

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="border-b border-border bg-surface px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-xl text-text-primary">Scout&apos;s Activity</h1>
            <p className="mt-1 text-sm text-text-secondary">
              Everything we&apos;ve discussed
            </p>
          </div>
          <div className="text-2xl">🔍</div>
        </div>
      </header>

      {/* Filters */}
      <div className="border-b border-border bg-surface px-6 py-3">
        <div className="flex items-center gap-4">
          {/* Status filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-tertiary">Status:</span>
            <div className="flex rounded-lg bg-surface-alt p-0.5">
              {(['all', 'open', 'resolved'] as StatusFilter[]).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1 text-xs rounded-md transition-calm ${
                    statusFilter === status
                      ? 'bg-surface text-text-primary shadow-sm'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {status === 'all' ? 'All' : status === 'open' ? 'Open' : 'Resolved'}
                </button>
              ))}
            </div>
          </div>

          {/* Channel filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-tertiary">Channel:</span>
            <div className="flex rounded-lg bg-surface-alt p-0.5">
              {([
                { key: 'all', label: 'All', icon: '📋' },
                { key: 'chat', label: 'Chat', icon: '💬' },
                { key: 'sms', label: 'SMS', icon: '📱' },
                { key: 'ritual', label: 'Ritual', icon: '✨' },
              ] as const).map(({ key, label, icon }) => (
                <button
                  key={key}
                  onClick={() => setChannelFilter(key)}
                  className={`px-3 py-1 text-xs rounded-md transition-calm flex items-center gap-1 ${
                    channelFilter === key
                      ? 'bg-surface text-text-primary shadow-sm'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <span>{icon}</span>
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-2xl">
          <ActivityFeed
            key={`${statusFilter}-${channelFilter}`}
            channel={channelFilter === 'all' ? undefined : channelFilter}
            status={statusFilter}
          />
        </div>
      </div>
    </div>
  );
}
