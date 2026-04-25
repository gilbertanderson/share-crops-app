import React, { useEffect, useId, useRef } from 'react';
import { cn } from './utils';

type TomatoLoaderSize = 'sm' | 'md' | 'lg';

interface TomatoLoaderProps {
  label?: string;
  size?: TomatoLoaderSize;
  className?: string;
  labelClassName?: string;
}

const sizeClasses: Record<TomatoLoaderSize, string> = {
  sm: 'w-10 h-10',
  md: 'w-14 h-14',
  lg: 'w-20 h-20',
};

// SVG fill: y=44 (empty) → y=12 (full), height 0 → 32
const FILL_TOP = 12;
const FILL_BOTTOM = 44;
const FILL_RANGE = FILL_BOTTOM - FILL_TOP; // 32

export function TomatoLoader({
  label = 'Loading...',
  size = 'md',
  className,
  labelClassName,
}: TomatoLoaderProps) {
  const clipPathId = useId().replace(/:/g, '');
  const fillRef = useRef<SVGRectElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    // Respect reduced-motion preference — skip animation entirely
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const startTime = performance.now();
    // Exponential approach: reaches ~63% at 1.5 s, ~86% at 3 s, plateaus near 90%.
    // Mirrors perceived page load: fast initial response then slows waiting for data.
    const TIME_CONSTANT = 1500; // ms
    const MAX_PROGRESS = 0.9;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = MAX_PROGRESS * (1 - Math.exp(-elapsed / TIME_CONSTANT));
      const y = FILL_BOTTOM - progress * FILL_RANGE;
      const height = progress * FILL_RANGE;

      if (fillRef.current) {
        fillRef.current.setAttribute('y', String(y));
        fillRef.current.setAttribute('height', String(height));
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <div className={cn('text-center space-y-3', className)}>
      <svg
        viewBox="0 0 48 48"
        className={cn('mx-auto', sizeClasses[size])}
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <clipPath id={clipPathId}>
            <circle cx="24" cy="28" r="16" />
          </clipPath>
        </defs>

        {/* Empty tomato background */}
        <circle cx="24" cy="28" r="16" fill="var(--tomato-empty)" />

        {/* JS-driven fill (animated) */}
        <g clipPath={`url(#${clipPathId})`}>
          <rect ref={fillRef} x="8" y={FILL_BOTTOM} width="32" height="0" fill="var(--tomato-filled)" />
        </g>

        {/* Static full tomato shown under prefers-reduced-motion */}
        <circle className="tomato-loader-static-fill" cx="24" cy="28" r="16" fill="var(--tomato-filled)" />

        <path
          d="M24 12V8M20 10.5C20 10.5 21 12 24 12C27 12 28 10.5 28 10.5M18 8C18 8 19 10 22 11M30 8C30 8 29 10 26 11"
          stroke="#4a7c3f"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>

      {label ? <p className={cn('text-muted-foreground', labelClassName)}>{label}</p> : null}
    </div>
  );
}
