'use client';

import { InputHTMLAttributes, useId } from 'react';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

export default function Checkbox({
  label,
  description,
  checked,
  onCheckedChange,
  className = '',
  id,
  disabled,
  ...props
}: CheckboxProps) {
  const generatedId = useId();
  const inputId = id || generatedId;

  return (
    <div className={`flex items-start gap-3 ${className}`}>
      <div className="flex h-6 items-center">
        <button
          type="button"
          role="checkbox"
          aria-checked={checked}
          disabled={disabled}
          onClick={() => onCheckedChange?.(!checked)}
          className={`
            relative flex h-5 w-5 items-center justify-center
            rounded-md border-2 transition-calm
            focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:ring-offset-2 focus:ring-offset-background
            disabled:opacity-50 disabled:cursor-not-allowed
            ${checked
              ? 'bg-accent-calm border-accent-calm'
              : 'bg-surface border-border hover:border-accent-primary/50'
            }
          `}
        >
          {checked && (
            <svg
              className="h-3 w-3 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={3}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          )}
        </button>
        <input
          type="checkbox"
          id={inputId}
          checked={checked}
          onChange={(e) => onCheckedChange?.(e.target.checked)}
          className="sr-only"
          disabled={disabled}
          {...props}
        />
      </div>
      {(label || description) && (
        <div className="flex-1">
          {label && (
            <label
              htmlFor={inputId}
              className={`
                block text-text-primary cursor-pointer select-none
                ${checked ? 'line-through text-text-tertiary' : ''}
                ${disabled ? 'cursor-not-allowed opacity-50' : ''}
              `}
            >
              {label}
            </label>
          )}
          {description && (
            <p className="mt-0.5 text-sm text-text-tertiary">
              {description}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
