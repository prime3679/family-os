'use client';

interface Step {
  id: number;
  label: string;
  shortLabel: string;
}

const steps: Step[] = [
  { id: 1, label: "Here's Your Week", shortLabel: 'Overview' },
  { id: 2, label: 'The Tricky Spots', shortLabel: 'Conflicts' },
  { id: 3, label: 'The Prep Work', shortLabel: 'Prep' },
  { id: 4, label: 'Decisions to Make', shortLabel: 'Decide' },
  { id: 5, label: "You're Ready", shortLabel: 'Ready' },
];

interface RitualProgressProps {
  currentStep: number;
  onStepClick?: (step: number) => void;
}

export default function RitualProgress({ currentStep, onStepClick }: RitualProgressProps) {
  return (
    <div className="mb-12">
      {/* Progress bar */}
      <div className="relative">
        {/* Background line */}
        <div className="absolute top-4 left-0 right-0 h-0.5 bg-border" />

        {/* Progress line */}
        <div
          className="absolute top-4 left-0 h-0.5 bg-accent-warm transition-all duration-500 ease-out"
          style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
        />

        {/* Steps */}
        <div className="relative flex justify-between">
          {steps.map((step) => {
            const isCompleted = step.id < currentStep;
            const isCurrent = step.id === currentStep;
            const isUpcoming = step.id > currentStep;

            return (
              <button
                key={step.id}
                onClick={() => onStepClick?.(step.id)}
                disabled={isUpcoming}
                className={`
                  flex flex-col items-center group
                  ${isUpcoming ? 'cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                {/* Circle */}
                <div
                  className={`
                    flex h-8 w-8 items-center justify-center rounded-full
                    transition-all duration-300
                    ${isCompleted ? 'bg-accent-calm text-white' : ''}
                    ${isCurrent ? 'bg-accent-primary text-white ring-4 ring-accent-primary/20' : ''}
                    ${isUpcoming ? 'bg-surface border-2 border-border text-text-tertiary' : ''}
                    ${!isUpcoming ? 'group-hover:scale-110' : ''}
                  `}
                >
                  {isCompleted ? (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className="text-sm font-medium">{step.id}</span>
                  )}
                </div>

                {/* Label */}
                <span
                  className={`
                    mt-2 text-xs font-medium transition-colors
                    hidden sm:block
                    ${isCurrent ? 'text-text-primary' : 'text-text-tertiary'}
                    ${!isUpcoming ? 'group-hover:text-text-primary' : ''}
                  `}
                >
                  {step.shortLabel}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Current step title */}
      <div className="mt-8 text-center">
        <h2 className="font-serif text-2xl sm:text-3xl text-text-primary">
          {steps[currentStep - 1].label}
        </h2>
      </div>
    </div>
  );
}
