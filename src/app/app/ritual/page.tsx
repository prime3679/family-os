'use client';

import { useState } from 'react';
import {
  RitualProgress,
  StepOverview,
  StepConflicts,
  StepPrep,
  StepDecisions,
  StepReady,
} from '@/components/ritual';

export default function RitualPage() {
  const [currentStep, setCurrentStep] = useState(1);

  const goToStep = (step: number) => {
    if (step >= 1 && step <= 5) {
      setCurrentStep(step);
      // Scroll to top smoothly
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const nextStep = () => goToStep(currentStep + 1);
  const prevStep = () => goToStep(currentStep - 1);
  const startOver = () => goToStep(1);

  return (
    <div className="max-w-2xl mx-auto py-8">
      {/* Progress indicator */}
      <RitualProgress currentStep={currentStep} onStepClick={goToStep} />

      {/* Step content */}
      <div className="mt-8">
        {currentStep === 1 && <StepOverview onNext={nextStep} />}
        {currentStep === 2 && <StepConflicts onNext={nextStep} onBack={prevStep} />}
        {currentStep === 3 && <StepPrep onNext={nextStep} onBack={prevStep} />}
        {currentStep === 4 && <StepDecisions onNext={nextStep} onBack={prevStep} />}
        {currentStep === 5 && <StepReady onBack={prevStep} onStartOver={startOver} />}
      </div>
    </div>
  );
}
