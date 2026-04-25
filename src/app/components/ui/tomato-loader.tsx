import React, { useId } from 'react';
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

export function TomatoLoader({
  label = 'Loading...',
  size = 'md',
  className,
  labelClassName,
}: TomatoLoaderProps) {
  const clipPathId = useId().replace(/:/g, '');

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

        <circle cx="24" cy="28" r="16" fill="var(--tomato-empty)" />

        <g className="tomato-loader-fill" clipPath={`url(#${clipPathId})`}>
          <rect x="8" y="44" width="32" height="0" fill="var(--tomato-filled)">
            <animate attributeName="y" values="44;12" dur="1.8s" repeatCount="indefinite" />
            <animate attributeName="height" values="0;32" dur="1.8s" repeatCount="indefinite" />
          </rect>
        </g>

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
