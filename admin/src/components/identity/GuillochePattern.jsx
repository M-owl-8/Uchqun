export function GuillochePattern() {
  return (
    <svg viewBox="0 0 400 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true"
         style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
      <defs>
        <pattern id="adm-grid" width="34" height="34" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <path d="M0 17h34M17 0v34" stroke="currentColor" strokeWidth="0.6" fill="none" />
        </pattern>
      </defs>
      <rect width="400" height="600" fill="url(#adm-grid)" />
      <circle cx="200" cy="300" r="150" stroke="currentColor" strokeWidth="0.8" fill="none" />
      <circle cx="200" cy="300" r="110" stroke="currentColor" strokeWidth="0.8" fill="none" />
      <circle cx="200" cy="300" r="70" stroke="currentColor" strokeWidth="0.8" fill="none" />
    </svg>
  );
}
