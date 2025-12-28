'use client';

import { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';

interface ConfettiProps {
  trigger: boolean;
  colors?: string[];
}

export default function Confetti({ trigger, colors }: ConfettiProps) {
  const hasTriggered = useRef(false);

  useEffect(() => {
    // Respect reduced motion preference
    if (typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    if (trigger && !hasTriggered.current) {
      hasTriggered.current = true;

      // Warm, family-friendly colors matching design tokens
      const confettiColors = colors || [
        '#C4A484', // accent-warm (soft gold)
        '#8B9D83', // accent-calm (sage green)
        '#7C6A5D', // accent-primary (warm taupe)
        '#FFFBF7', // background (cream)
        '#E8E4E0', // border (light taupe)
      ];

      // Gentle burst configuration
      const defaults = {
        spread: 55,
        ticks: 80,
        gravity: 1,
        decay: 0.94,
        startVelocity: 30,
        colors: confettiColors,
        shapes: ['circle', 'square'] as confetti.Shape[],
        scalar: 0.9,
        disableForReducedMotion: true,
      };

      // Center burst
      confetti({
        ...defaults,
        particleCount: 35,
        origin: { x: 0.5, y: 0.7 },
      });

      // Left side burst (delayed)
      setTimeout(() => {
        confetti({
          ...defaults,
          particleCount: 25,
          origin: { x: 0.3, y: 0.75 },
          angle: 60,
        });
      }, 100);

      // Right side burst (delayed)
      setTimeout(() => {
        confetti({
          ...defaults,
          particleCount: 25,
          origin: { x: 0.7, y: 0.75 },
          angle: 120,
        });
      }, 200);
    }
  }, [trigger, colors]);

  // Reset on unmount so it can trigger again if user navigates away and back
  useEffect(() => {
    return () => {
      hasTriggered.current = false;
    };
  }, []);

  // This component doesn't render any DOM elements
  return null;
}
