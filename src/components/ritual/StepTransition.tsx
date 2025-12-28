'use client';

import { ReactNode, useState, useEffect, useRef } from 'react';

interface StepTransitionProps {
  stepKey: number;
  children: ReactNode;
  direction?: 'forward' | 'backward';
}

export default function StepTransition({
  stepKey,
  children,
  direction = 'forward'
}: StepTransitionProps) {
  const [displayedContent, setDisplayedContent] = useState<ReactNode>(children);
  const [animationClass, setAnimationClass] = useState('');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const previousStepRef = useRef(stepKey);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Cleanup any pending timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Check for reduced motion preference
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (stepKey !== previousStepRef.current) {
      if (prefersReducedMotion) {
        // Instant transition for reduced motion
        setDisplayedContent(children);
        previousStepRef.current = stepKey;
        return;
      }

      setIsTransitioning(true);

      // Phase 1: Exit animation
      setAnimationClass('animate-step-exit');

      // Phase 2: Swap content and enter
      timeoutRef.current = setTimeout(() => {
        setDisplayedContent(children);
        setAnimationClass(
          direction === 'forward'
            ? 'animate-step-enter-forward'
            : 'animate-step-enter-backward'
        );
        previousStepRef.current = stepKey;

        // Phase 3: Clear animation class
        timeoutRef.current = setTimeout(() => {
          setAnimationClass('');
          setIsTransitioning(false);
        }, 300);
      }, 200);
    } else {
      // Same step - just update content without animation
      setDisplayedContent(children);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [stepKey, children, direction]);

  return (
    <div
      className={`${animationClass} ${isTransitioning ? 'pointer-events-none' : ''}`}
      style={{ willChange: isTransitioning ? 'opacity, transform' : 'auto' }}
    >
      {displayedContent}
    </div>
  );
}
