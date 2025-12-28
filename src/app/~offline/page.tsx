'use client';

export default function OfflinePage() {
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-6">
      <div className="text-center max-w-md">
        {/* Offline Icon */}
        <div className="w-24 h-24 mx-auto mb-8 rounded-full bg-taupe/10 flex items-center justify-center">
          <svg
            className="w-12 h-12 text-taupe"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a5 5 0 01-1.414-3.536 5 5 0 011.414-3.536m0 7.072l2.829-2.829m2.829 2.829l2.829-2.829M6 18L3 21m0 0h3m-3 0v-3M8.464 15.536a5 5 0 010-7.072"
            />
          </svg>
        </div>

        {/* Message */}
        <h1 className="font-playfair text-3xl text-dark mb-4">
          You&apos;re Offline
        </h1>
        <p className="text-taupe mb-8 leading-relaxed">
          It looks like you&apos;ve lost your internet connection.
          Don&apos;t worry - when you&apos;re back online, Family OS will be ready for you.
        </p>

        {/* Retry Button */}
        <button
          onClick={handleRetry}
          className="px-8 py-3 bg-taupe text-cream rounded-xl font-medium hover:bg-dark transition-colors"
        >
          Try Again
        </button>

        {/* Helpful tip */}
        <p className="mt-8 text-sm text-taupe/60">
          Some features require an internet connection,
          including calendar sync and your weekly ritual.
        </p>
      </div>
    </div>
  );
}
