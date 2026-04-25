import React, { useState, useEffect, useId } from 'react';
import { cn } from './utils';

interface RottenTomatoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showAnimation?: boolean;
}

const sizeClasses: Record<string, string> = {
  sm: 'w-10 h-10',
  md: 'w-14 h-14',
  lg: 'w-20 h-20',
};

export function RottenTomato({
  size = 'md',
  className,
  showAnimation = true,
}: RottenTomatoProps) {
  const maskId = useId().replace(/:/g, '');
  const [shouldShake, setShouldShake] = useState(showAnimation);

  useEffect(() => {
    if (!showAnimation) {
      setShouldShake(false);
      return;
    }

    // Brief shake animation on mount
    const timer = setTimeout(() => setShouldShake(false), 600);
    return () => clearTimeout(timer);
  }, [showAnimation]);

  return (
    <svg
      viewBox="0 0 48 48"
      className={cn(
        'mx-auto',
        sizeClasses[size],
        shouldShake && 'animate-shake',
        className
      )}
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <filter id={`rotten-${maskId}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="3" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="1" />
        </filter>
      </defs>

      {/* Rotten tomato body - reddish-brown color (#8B4513 or similar) */}
      <circle
        cx="24"
        cy="28"
        r="16"
        fill="#6B3410"
        filter={`url(#rotten-${maskId})`}
      />

      {/* Add some darker spots to show rot */}
      <circle cx="20" cy="26" r="2.5" fill="#4a2208" opacity="0.6" />
      <circle cx="28" cy="30" r="2" fill="#4a2208" opacity="0.5" />
      <circle cx="24" cy="24" r="1.5" fill="#4a2208" opacity="0.4" />
      <circle cx="30" cy="26" r="1.8" fill="#4a2208" opacity="0.5" />

      {/* Green stem - keep this the same */}
      <path
        d="M24 12V8M20 10.5C20 10.5 21 12 24 12C27 12 28 10.5 28 10.5M18 8C18 8 19 10 22 11M30 8C30 8 29 10 26 11"
        stroke="#4a7c3f"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Crack or splatter effect */}
      <path
        d="M18 32 Q20 35 22 33 M26 33 Q28 35 30 32"
        stroke="#4a2208"
        strokeWidth="0.8"
        opacity="0.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
