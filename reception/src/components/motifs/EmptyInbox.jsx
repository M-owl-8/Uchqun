export function EmptyInbox({ size = 80, ...props }) {
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
      <rect x="10" y="20" width="60" height="44" rx="4" />
      <path d="M10 30 L40 48 L70 30" />
      <line x1="10" y1="52" x2="25" y2="38" />
      <line x1="70" y1="52" x2="55" y2="38" />
    </svg>
  );
}
