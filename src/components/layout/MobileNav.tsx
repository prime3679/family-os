'use client';

import { useState } from 'react';
import Link from 'next/link';

interface MobileNavProps {
  familyName?: string;
}

export default function MobileNav({ familyName = "The Lumley Family" }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);

  const navLinks = [
    { href: '/app/ritual', label: 'Deep Sync' },
    { href: '/app/week', label: 'Week' },
    { href: '/app/tasks', label: 'Tasks' },
    { href: '/app/insights', label: 'Insights' },
    { href: '/app/analytics', label: 'Analytics' },
    { href: '/app/settings', label: 'Settings' },
  ];

  return (
    <>
      {/* Hamburger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="md:hidden flex items-center justify-center min-h-[44px] min-w-[44px] p-2 text-text-secondary hover:text-text-primary transition-colors"
        aria-label="Open menu"
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={`
          fixed top-0 right-0 bottom-0 z-50 w-72 bg-surface border-l border-border shadow-xl
          transition-transform duration-300 ease-in-out md:hidden
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="font-serif text-lg text-text-primary">Family OS</h2>
            <p className="text-sm text-text-tertiary">{familyName}</p>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="flex items-center justify-center min-h-[44px] min-w-[44px] p-2 text-text-secondary hover:text-text-primary transition-colors"
            aria-label="Close menu"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="p-4 space-y-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setIsOpen(false)}
              className="block min-h-[44px] px-4 py-3 text-base text-text-secondary rounded-lg transition-colors hover:text-text-primary hover:bg-surface-alt"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}
