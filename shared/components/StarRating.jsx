import { useState } from 'react';
import { Star } from 'lucide-react';

/**
 * Shared 5-star rating input — used across all portals so the rating UX is
 * identical for parents, government, admin, and any future rater.
 *
 * Accessibility: radiogroup of 5 radio buttons. ArrowLeft/Right + Up/Down
 * move the value; click commits. Hover previews. Disabled state blocks
 * interaction without losing the visual value.
 *
 * Pulled from the GOV-RATING-STARS implementation in
 * government/src/pages/SchoolDetail.jsx — extracted here so every portal
 * uses one source of truth instead of copy-pasting the radio + svg pattern.
 */
const StarRating = ({ value = 0, onChange, name = 'rating', disabled = false, size = 'md' }) => {
  const [hoverVal, setHoverVal] = useState(0);
  const display = hoverVal || value;

  const sizeClass = size === 'sm' ? 'w-4 h-4'
                  : size === 'lg' ? 'w-7 h-7'
                  : 'w-6 h-6';

  return (
    <div
      role="radiogroup"
      aria-label={name}
      className="flex items-center gap-0.5"
    >
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          role="radio"
          aria-checked={value === s}
          aria-label={String(s)}
          disabled={disabled}
          onClick={() => !disabled && onChange(s)}
          onMouseEnter={() => !disabled && setHoverVal(s)}
          onMouseLeave={() => setHoverVal(0)}
          onKeyDown={(e) => {
            if (disabled) return;
            if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
              e.preventDefault();
              onChange(Math.min(5, (value || 0) + 1));
            }
            if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
              e.preventDefault();
              onChange(Math.max(1, (value || 0) - 1));
            }
          }}
          className="focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 rounded-sm disabled:cursor-not-allowed p-0.5"
        >
          <Star
            className={`${sizeClass} transition-colors duration-100 ${
              s <= display
                ? hoverVal
                  ? 'fill-yellow-300 text-yellow-300'
                  : 'fill-yellow-400 text-yellow-400'
                : disabled
                  ? 'text-gray-200'
                  : 'text-gray-300 hover:text-yellow-200'
            }`}
          />
        </button>
      ))}
    </div>
  );
};

export default StarRating;
