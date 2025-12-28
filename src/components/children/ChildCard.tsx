'use client';

import { Child } from '@/hooks/useChildren';

interface ChildCardProps {
  child: Child;
  onEdit: (child: Child) => void;
  onDelete: (id: string) => void;
}

function calculateAge(birthdate: string): number | null {
  const birth = new Date(birthdate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
}

export function ChildCard({ child, onEdit, onDelete }: ChildCardProps) {
  const age = child.birthdate ? calculateAge(child.birthdate) : null;

  return (
    <div className="flex items-center justify-between p-4">
      <div className="flex items-center gap-4">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full text-white font-medium text-lg"
          style={{ backgroundColor: child.color }}
        >
          {child.avatarEmoji || child.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="font-medium text-text-primary">{child.name}</p>
          {age !== null && (
            <p className="text-sm text-text-tertiary">
              Age {age}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onEdit(child)}
          aria-label="Edit child"
          className="text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(child.id)}
          aria-label="Remove child"
          className="text-sm text-accent-alert hover:text-accent-alert/80 transition-colors"
        >
          Remove
        </button>
      </div>
    </div>
  );
}
