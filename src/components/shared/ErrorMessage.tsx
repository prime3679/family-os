interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  return (
    <div className="bg-accent-alert/10 border border-accent-alert/20 rounded-lg p-4">
      <div className="flex items-center gap-2 text-accent-alert">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-sm font-medium">{message}</span>
      </div>
      {onRetry && (
        <button onClick={onRetry} className="text-sm text-accent-alert underline mt-2">
          Try again
        </button>
      )}
    </div>
  );
}
