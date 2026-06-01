/**
 * DNP Spinner — 17px inline SVG, ~75% arc, 0.7s linear infinite spin.
 * The .dnp-spinner CSS class + @keyframes dnp-spin are defined in index.css.
 */
export function Spinner({ size = 17, color = 'currentColor' }) {
  const r = 7;
  const circumference = 2 * Math.PI * r;
  // ~75% arc visible (25% gap)
  const dashArray = `${circumference * 0.75} ${circumference * 0.25}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 17 17"
      fill="none"
      aria-hidden="true"
      className="dnp-spinner"
    >
      <circle
        cx="8.5"
        cy="8.5"
        r={r}
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={dashArray}
        strokeDashoffset="0"
      />
    </svg>
  );
}
