export function EmptyDesk({ size = 120, ...props }) {
  return (
    <svg
      viewBox="0 0 160 160"
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
      {/* Desk surface */}
      <rect x="20" y="90" width="120" height="8" rx="3" />
      {/* Desk legs */}
      <line x1="35" y1="98" x2="35" y2="130" />
      <line x1="125" y1="98" x2="125" y2="130" />
      {/* Monitor */}
      <rect x="55" y="50" width="50" height="36" rx="4" />
      <line x1="80" y1="86" x2="80" y2="90" />
      <line x1="68" y1="90" x2="92" y2="90" />
      {/* Folder stack on desk */}
      <rect x="22" y="75" width="24" height="15" rx="2" />
      <rect x="24" y="71" width="20" height="4" rx="1" />
      {/* Coffee cup */}
      <rect x="110" y="80" width="14" height="10" rx="2" />
      <path d="M124 83 Q130 83 130 88 Q130 93 124 93" />
      {/* Monitor screen lines */}
      <line x1="63" y1="63" x2="97" y2="63" />
      <line x1="63" y1="70" x2="87" y2="70" />
    </svg>
  );
}
