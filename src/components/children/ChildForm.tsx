'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/shared';
import { Child } from '@/hooks/useChildren';

interface ChildFormProps {
  child?: Child | null;
  onSubmit: (data: { name: string; color: string; avatarEmoji: string | null; birthdate: string | null }) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const CHILD_COLORS = [
  '#C17F59', // warm terracotta
  '#7C9885', // sage green
  '#8B7BA8', // muted purple
  '#5B8FA8', // slate blue
  '#CC8B86', // dusty rose
  '#A8896C', // warm taupe
];

const EMOJI_OPTIONS = ['🎨', '🚀', '🌟', '🎵', '📚', '⚽', '🎮', '🦋', '🌈', '🐱'];

export function ChildForm({ child, onSubmit, onCancel, isSubmitting }: ChildFormProps) {
  const [name, setName] = useState(child?.name || '');
  const [color, setColor] = useState(child?.color || CHILD_COLORS[0]);
  const [avatarEmoji, setAvatarEmoji] = useState<string | null>(child?.avatarEmoji || null);
  const [birthdate, setBirthdate] = useState(child?.birthdate?.split('T')[0] || '');

  useEffect(() => {
    if (child) {
      setName(child.name);
      setColor(child.color);
      setAvatarEmoji(child.avatarEmoji);
      setBirthdate(child.birthdate?.split('T')[0] || '');
    }
  }, [child]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSubmit({
      name: name.trim(),
      color,
      avatarEmoji,
      birthdate: birthdate || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Name */}
      <div>
        <label htmlFor="child-name" className="block text-sm font-medium text-text-primary mb-2">
          Name
        </label>
        <input
          type="text"
          id="child-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Child's name"
          className="w-full px-4 py-2 rounded-lg border border-border bg-surface text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
          autoFocus
        />
      </div>

      {/* Avatar/Emoji */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Avatar (optional)
        </label>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Avatar options">
          <button
            type="button"
            onClick={() => setAvatarEmoji(null)}
            aria-label="Use first letter as avatar"
            className={`w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 transition-all ${
              avatarEmoji === null
                ? 'border-accent-primary bg-accent-primary/10'
                : 'border-border hover:border-text-tertiary'
            }`}
            style={{ backgroundColor: avatarEmoji === null ? color : undefined }}
          >
            {avatarEmoji === null && (
              <span className="text-white font-medium">
                {name ? name.charAt(0).toUpperCase() : '?'}
              </span>
            )}
          </button>
          {EMOJI_OPTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => setAvatarEmoji(emoji)}
              aria-label={`Select ${emoji} emoji as avatar`}
              className={`w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 transition-all ${
                avatarEmoji === emoji
                  ? 'border-accent-primary bg-accent-primary/10'
                  : 'border-border hover:border-text-tertiary'
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Color */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Color
        </label>
        <div className="flex gap-2" role="group" aria-label="Color options">
          {CHILD_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={`Select color ${c}`}
              className={`w-8 h-8 rounded-full transition-all ${
                color === c ? 'ring-2 ring-offset-2 ring-accent-primary' : ''
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      {/* Birthdate */}
      <div>
        <label htmlFor="child-birthdate" className="block text-sm font-medium text-text-primary mb-2">
          Birthdate (optional)
        </label>
        <input
          type="date"
          id="child-birthdate"
          value={birthdate}
          onChange={(e) => setBirthdate(e.target.value)}
          className="w-full px-4 py-2 rounded-lg border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
        />
        <p className="mt-1 text-xs text-text-tertiary">
          Used to calculate age
        </p>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={!name.trim() || isSubmitting}>
          {isSubmitting ? 'Saving...' : child ? 'Save Changes' : 'Add Child'}
        </Button>
      </div>
    </form>
  );
}
