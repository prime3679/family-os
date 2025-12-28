'use client';

import { useSession } from 'next-auth/react';

export function DemoModeBanner() {
  const { data: session } = useSession();

  // Only show if no session (demo mode)
  if (session) return null;

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 text-center">
      <p className="text-sm text-amber-700 dark:text-amber-300">
        <span className="font-medium">Demo Mode</span> - Data is stored locally and will be lost on refresh.{' '}
        <a href="/api/auth/signin" className="underline hover:no-underline">Sign in</a> to save your data.
      </p>
    </div>
  );
}
