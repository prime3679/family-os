'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useState, useRef, useEffect } from 'react';
import MobileNav from './MobileNav';

interface HeaderProps {
  familyName?: string;
  showNav?: boolean;
}

function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.split(' ').filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

export default function Header({ familyName = "Your Family", showNav = true }: HeaderProps) {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const initials = getInitials(session?.user?.name);

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

          {/* Desktop Navigation */}
          {showNav && (
            <nav className="hidden md:flex items-center gap-2">
              <NavLink href="/app/chat">Chat</NavLink>
              <NavLink href="/app/ritual">Deep Sync</NavLink>
              <NavLink href="/app/week">Week</NavLink>
              <NavLink href="/app/tasks">Tasks</NavLink>
              <NavLink href="/app/insights">Insights</NavLink>
              <NavLink href="/app/settings">Settings</NavLink>
            </nav>
          )}

          {/* User Avatar & Mobile Nav */}
          <div className="flex items-center gap-3">
            {showNav && <MobileNav familyName={familyName} />}

            {/* User Menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex h-9 w-9 min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-gradient-to-br from-parent-a to-parent-b transition-calm hover:scale-105"
              >
                <span className="text-sm font-medium text-white">{initials}</span>
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-border py-1 z-50">
                  {session?.user && (
                    <div className="px-4 py-2 border-b border-border">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {session.user.name}
                      </p>
                      <p className="text-xs text-text-tertiary truncate">
                        {session.user.email}
                      </p>
                    </div>
                  )}
                  <Link
                    href="/app/settings"
                    className="block px-4 py-2 text-sm text-text-secondary hover:bg-surface-alt"
                    onClick={() => setMenuOpen(false)}
                  >
                    Settings
                  </Link>
                  <Link
                    href="/app/settings/notifications"
                    className="block px-4 py-2 text-sm text-text-secondary hover:bg-surface-alt"
                    onClick={() => setMenuOpen(false)}
                  >
                    Notifications
                  </Link>
                  <hr className="my-1 border-border" />
                  {session ? (
                    <button
                      onClick={() => signOut({ callbackUrl: '/' })}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      Sign out
                    </button>
                  ) : (
                    <Link
                      href="/api/auth/signin"
                      className="block px-4 py-2 text-sm text-accent-primary hover:bg-surface-alt"
                      onClick={() => setMenuOpen(false)}
                    >
                      Sign in
                    </Link>
                  )}
                </div>
              )}
            </div>
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
