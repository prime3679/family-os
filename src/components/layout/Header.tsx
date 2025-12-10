'use client';

import Link from 'next/link';

interface HeaderProps {
  familyName?: string;
  showNav?: boolean;
}

export default function Header({ familyName = "The Lumley Family", showNav = true }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
      <div className="max-w-5xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo & Family Name */}
          <Link href="/app" className="flex items-center gap-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-primary transition-calm group-hover:scale-105">
              <span className="font-serif text-lg text-white">F</span>
            </div>
            <div>
              <span className="font-serif text-lg text-text-primary">Family OS</span>
              <span className="hidden sm:block text-sm text-text-tertiary">{familyName}</span>
            </div>
          </Link>

          {/* Navigation */}
          {showNav && (
            <nav className="flex items-center gap-2">
              <NavLink href="/app/ritual">Weekly Ritual</NavLink>
              <NavLink href="/app/week">This Week</NavLink>
              <NavLink href="/app/settings">Settings</NavLink>
            </nav>
          )}

          {/* User Avatar */}
          <div className="flex items-center gap-3">
            <button className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-parent-a to-parent-b transition-calm hover:scale-105">
              <span className="text-sm font-medium text-white">AL</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="px-4 py-2 text-sm text-text-secondary rounded-lg transition-calm hover:text-text-primary hover:bg-surface-alt"
    >
      {children}
    </Link>
  );
}
