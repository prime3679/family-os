'use client';

import { useEffect, useState } from 'react';

interface ToastProps {
  id: string;
  type: 'success' | 'error';
  message: string;
  onDismiss: (id: string) => void;
}

export default function Toast({ id, type, message, onDismiss }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onDismiss(id), 300); // Wait for animation to complete
    }, 3000);

    return () => clearTimeout(timer);
  }, [id, onDismiss]);

  const bgColor = type === 'success' ? 'bg-accent-calm' : 'bg-accent-alert';
  const animationClass = isExiting ? 'opacity-0 translate-y-2' : 'animate-fade-in-up';

  return (
    <div
      className={`${bgColor} text-white px-4 py-3 rounded-lg shadow-lg transition-all duration-300 ${animationClass}`}
    >
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}
