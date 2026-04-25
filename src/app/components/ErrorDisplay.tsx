import React from 'react';
import { RottenTomato } from './ui/rotten-tomato';

interface ErrorDisplayProps {
  message: string;
  showIcon?: boolean;
  className?: string;
}

export function ErrorDisplay({
  message,
  showIcon = true,
  className = '',
}: ErrorDisplayProps) {
  return (
    <div
      role="alert"
      className={`bg-error/10 border border-error rounded-md p-4 space-y-2 ${className}`}
    >
      {showIcon && (
        <div className="w-10 h-10 mx-auto">
          <RottenTomato size="sm" showAnimation={false} />
        </div>
      )}
      <p className="text-sm text-error text-center">{message}</p>
    </div>
  );
}
