export function EmptyFolders({ size = 80, ...props }) {
  return (
    <svg
      viewBox="0 0 80 80"
      width={size}
      height={size}
      fill="none"
      stroke="#EFD58C"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <rect x="8" y="28" width="56" height="40" rx="4" />
      <path d="M8 34 Q8 28 14 28 L30 28 L35 22 L64 22 Q70 22 70 28 L70 34" />
      <rect x="14" y="34" width="44" height="28" rx="3" opacity="0.5" />
    </svg>
  );
}
