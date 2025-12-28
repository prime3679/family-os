import { forwardRef, InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div>
        {label && (
          <label className="block text-sm font-medium text-text-primary mb-1">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`w-full px-3 py-2 rounded-lg border border-border bg-surface text-text-primary
            placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary/50
            ${error ? 'border-accent-alert' : ''}
            ${className}`}
          {...props}
        />
        {error && (
          <p className="text-sm text-accent-alert mt-1">{error}</p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';
