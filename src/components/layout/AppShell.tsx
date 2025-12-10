import { ReactNode } from 'react';
import Header from './Header';

interface AppShellProps {
  children: ReactNode;
  familyName?: string;
  showNav?: boolean;
  maxWidth?: 'narrow' | 'default' | 'wide' | 'full';
  centered?: boolean;
}

const maxWidthStyles = {
  narrow: 'max-w-2xl',
  default: 'max-w-4xl',
  wide: 'max-w-6xl',
  full: 'max-w-none',
};

export default function AppShell({
  children,
  familyName,
  showNav = true,
  maxWidth = 'default',
  centered = false,
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <Header familyName={familyName} showNav={showNav} />
      <main
        className={`
          ${maxWidthStyles[maxWidth]}
          ${centered ? 'mx-auto' : ''}
          px-6 py-8
        `}
      >
        {children}
      </main>
    </div>
  );
}
