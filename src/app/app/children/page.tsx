'use client';

import { useRouter } from 'next/navigation';
import { ChildList } from '@/components/children/ChildList';

export default function ChildrenPage() {
  const router = useRouter();

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3 flex-shrink-0">
        <button
          onClick={() => router.back()}
          className="flex items-center justify-center min-h-[44px] min-w-[44px] -ml-2 rounded-full hover:bg-surface-alt transition-colors"
          aria-label="Go back"
        >
          <svg className="h-6 w-6 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="flex items-center gap-3 flex-1">
          <div className="h-10 w-10 rounded-full bg-accent-calm/10 flex items-center justify-center">
            <span className="text-xl">👶</span>
          </div>
          <div>
            <h1 className="font-serif text-lg text-text-primary">Kids</h1>
            <p className="text-xs text-text-tertiary">
              Manage your children&apos;s profiles
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        <div className="mx-auto max-w-2xl">
          <ChildList />
        </div>
      </div>
    </div>
  );
}
