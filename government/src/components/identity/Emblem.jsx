export function Emblem({ size = 64, stroke = 1.7 }) {
  const s = size;
  return (
    <svg width={s} height={s} viewBox="0 0 64 64" fill="none"
         stroke="currentColor" strokeWidth={stroke}
         strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <g opacity="0.95">
        <path d="M14 48c-3-6-3.6-13-2-20" />
        <path d="M11.4 31.5c1.8-.2 3.3.7 4 2.4M11 36.5c1.8-.2 3.3.7 4 2.4M11.2 41.5c1.8-.2 3.3.7 4 2.4" />
        <path d="M50 48c3-6 3.6-13 2-20" />
        <path d="M52.6 31.5c-1.8-.2-3.3.7-4 2.4M53 36.5c-1.8-.2-3.3.7-4 2.4M52.8 41.5c-1.8-.2-3.3.7-4 2.4" />
      </g>
      <path d="M32 9 18 14v15c0 10.5 6 17.5 14 21 8-3.5 14-10.5 14-21V14L32 9Z"
            fill="currentColor" fillOpacity="0.08" />
      <circle cx="24.5" cy="22" r="2.4" />
      <circle cx="32" cy="20.5" r="2.7" />
      <circle cx="39.5" cy="22" r="2.4" />
      <path d="M27 40v-5.5a5 5 0 0 1 10 0V40" />
      <path d="M25 40h14" />
    </svg>
  );
}
