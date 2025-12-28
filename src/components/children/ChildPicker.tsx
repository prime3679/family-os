'use client';

import { useChildren, Child } from '@/hooks/useChildren';

interface ChildPickerProps {
  value: string | null;
  onChange: (childId: string | null) => void;
  placeholder?: string;
  className?: string;
}

export function ChildPicker({ value, onChange, placeholder = 'Select child', className = '' }: ChildPickerProps) {
  const { children, isLoading } = useChildren();

  if (isLoading) {
    return (
      <select
        disabled
        className={`px-3 py-2 rounded-lg border border-border bg-surface text-text-tertiary ${className}`}
      >
        <option>Loading...</option>
      </select>
    );
  }

  if (children.length === 0) {
    return null; // Don't show picker if no children
  }

  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value || null)}
      className={`px-3 py-2 rounded-lg border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50 ${className}`}
    >
      <option value="">{placeholder}</option>
      {children.map((child) => (
        <option key={child.id} value={child.id}>
          {child.avatarEmoji ? `${child.avatarEmoji} ` : ''}{child.name}
        </option>
      ))}
    </select>
  );
}

interface ChildBadgeProps {
  child: Child;
  size?: 'small' | 'medium';
}

export function ChildBadge({ child, size = 'small' }: ChildBadgeProps) {
  const sizeClasses = size === 'small' ? 'h-5 w-5 text-xs' : 'h-6 w-6 text-sm';

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full text-white font-medium ${sizeClasses}`}
      style={{ backgroundColor: child.color }}
      title={child.name}
    >
      {child.avatarEmoji || child.name.charAt(0).toUpperCase()}
    </span>
  );
}
