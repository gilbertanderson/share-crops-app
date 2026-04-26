import { useState } from 'react';

interface TomatoRatingProps {
  rating: number;
  onChange?: (rating: number) => void;
  size?: 'sm' | 'md' | 'lg';
  readonly?: boolean;
  showLabel?: boolean;
}

const TOMATO_LABELS = [
  { value: 1, label: 'Poor' },
  { value: 2, label: 'Fair' },
  { value: 3, label: 'Good' },
  { value: 4, label: 'Very Good' },
  { value: 5, label: 'Excellent' },
];

function RottenTomatoIcon({ isFilled, opacity = 1 }: { isFilled: boolean; opacity?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
      style={{ opacity }}
    >
      {/* Rotten tomato body */}
      <circle
        cx="12"
        cy="14"
        r="8"
        style={{ fill: isFilled ? 'var(--tomato-rotten)' : 'var(--tomato-empty)' }}
      />
      {/* Wrinkles/texture for rotten appearance - darker lines */}
      {isFilled && (
        <>
          <path
            d="M 9 11 Q 10 12 11 11"
            stroke="rgba(0, 0, 0, 0.3)"
            strokeWidth="0.6"
            strokeLinecap="round"
          />
          <path
            d="M 13 11 Q 14 12 15 11"
            stroke="rgba(0, 0, 0, 0.3)"
            strokeWidth="0.6"
            strokeLinecap="round"
          />
          <path
            d="M 8 14 Q 9 15 10 14"
            stroke="rgba(0, 0, 0, 0.25)"
            strokeWidth="0.6"
            strokeLinecap="round"
          />
          <path
            d="M 14 14 Q 15 15 16 14"
            stroke="rgba(0, 0, 0, 0.25)"
            strokeWidth="0.6"
            strokeLinecap="round"
          />
          <path
            d="M 10 17 Q 11 18 12 17"
            stroke="rgba(0, 0, 0, 0.2)"
            strokeWidth="0.5"
            strokeLinecap="round"
          />
          <path
            d="M 12 17 Q 13 18 14 17"
            stroke="rgba(0, 0, 0, 0.2)"
            strokeWidth="0.5"
            strokeLinecap="round"
          />
        </>
      )}
      {/* Green stem */}
      <path
        d="M12 6V3M10 4.5C10 4.5 10.5 5.5 12 5.5C13.5 5.5 14 4.5 14 4.5M9 3C9 3 9.5 4 10.5 4.5M15 3C15 3 14.5 4 13.5 4.5"
        stroke="#4a7c3f"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={isFilled ? 1 : 0.5}
      />
    </svg>
  );
}

export function TomatoRating({
  rating,
  onChange,
  size = 'md',
  readonly = false,
  showLabel = false,
}: TomatoRatingProps) {
  const [hoverRating, setHoverRating] = useState(0);

  const sizes = {
    sm: 'w-5 h-5',
    md: 'w-7 h-7',
    lg: 'w-10 h-10',
  };

  const displayRating = hoverRating || rating;
  const label = TOMATO_LABELS.find((l) => l.value === Math.floor(displayRating))?.label;

  const handleClick = (value: number) => {
    if (!readonly && onChange) {
      onChange(value);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((value) => {
          const isFilled = value <= displayRating;
          const isHovering = !readonly && value <= hoverRating;

          return (
            <button
              key={value}
              type="button"
              disabled={readonly}
              onClick={() => handleClick(value)}
              onMouseEnter={() => !readonly && setHoverRating(value)}
              onMouseLeave={() => !readonly && setHoverRating(0)}
              className={`${sizes[size]} transition-all duration-200 ${
                readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'
              } focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded`}
              aria-label={`${value} tomato${value > 1 ? 'es' : ''}`}
            >
              {value === 1 ? (
                <RottenTomatoIcon isFilled={isFilled} opacity={isHovering ? 0.8 : 1} />
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-full h-full"
                >
                  {/* Tomato body */}
                  <path
                    d="M12 22C16.4183 22 20 18.4183 20 14C20 9.58172 16.4183 6 12 6C7.58172 6 4 9.58172 4 14C4 18.4183 7.58172 22 12 22Z"
                    fill={
                      isFilled
                        ? isHovering
                          ? 'var(--tomato-hover)'
                          : 'var(--tomato-filled)'
                        : 'var(--tomato-empty)'
                    }
                    className="transition-colors duration-200"
                  />
                  {/* Tomato stem/leaf */}
                  <path
                    d="M12 6V3M10 4.5C10 4.5 10.5 5.5 12 5.5C13.5 5.5 14 4.5 14 4.5M9 3C9 3 9.5 4 10.5 4.5M15 3C15 3 14.5 4 13.5 4.5"
                    stroke="#4a7c3f"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={isFilled ? 1 : 0.5}
                  />
                </svg>
              )}
            </button>
          );
        })}
      </div>
      {showLabel && label && (
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
      )}
    </div>
  );
}

export function TomatoRatingDisplay({ rating, count }: { rating: number; count?: number }) {
  const roundedRating = Math.round(rating);

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((value) => (
          <div key={value} className="w-4 h-4">
            {value === 1 && roundedRating === 1 ? (
              <RottenTomatoIcon isFilled={value <= roundedRating} />
            ) : (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full"
              >
                <path
                  d="M12 22C16.4183 22 20 18.4183 20 14C20 9.58172 16.4183 6 12 6C7.58172 6 4 9.58172 4 14C4 18.4183 7.58172 22 12 22Z"
                  fill={
                    value <= roundedRating
                      ? 'var(--tomato-filled)'
                      : 'var(--tomato-empty)'
                  }
                />
                <path
                  d="M12 6V3M10 4.5C10 4.5 10.5 5.5 12 5.5C13.5 5.5 14 4.5 14 4.5M9 3C9 3 9.5 4 10.5 4.5M15 3C15 3 14.5 4 13.5 4.5"
                  stroke="#4a7c3f"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={value <= roundedRating ? 1 : 0.5}
                />
              </svg>
            )}
          </div>
        ))}
      </div>
      <span className="text-sm text-muted-foreground">
        {rating.toFixed(1)} {count !== undefined && `(${count})`}
      </span>
    </div>
  );
}
