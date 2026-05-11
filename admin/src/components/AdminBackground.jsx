/**
 * AdminBackground - Corporate professional theme
 * Features: Deep teal gradient, geometric patterns, business feel
 */
const AdminBackground = () => {
  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 1920 1080"
        preserveAspectRatio="xMidYMid slice"
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        <defs>
          {/* Main gradient - Cool teal to slate */}
          <linearGradient id="adminGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#E8F4F8" />
            <stop offset="35%" stopColor="#F0F7FA" />
            <stop offset="65%" stopColor="#F5F8FA" />
            <stop offset="100%" stopColor="#F8FAFC" />
          </linearGradient>

          {/* Teal accent */}
          <linearGradient id="tealAccent" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0D9488" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#14B8A6" stopOpacity="0.06" />
          </linearGradient>

          {/* Slate accent */}
          <linearGradient id="slateAccent" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#475569" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#64748B" stopOpacity="0.04" />
          </linearGradient>

          {/* Grid pattern */}
          <pattern id="gridPattern" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
            <path d="M 80 0 L 0 0 0 80" fill="none" stroke="#0D9488" strokeWidth="0.5" opacity="0.08" />
          </pattern>
        </defs>

        {/* Main background */}
        <rect x="0" y="0" width="1920" height="1080" fill="url(#adminGradient)" />

        {/* Grid overlay */}
        <rect x="0" y="0" width="1920" height="1080" fill="url(#gridPattern)" opacity="0.5" />

        {/* Top-left geometric block */}
        <rect x="-50" y="-50" width="400" height="400" fill="url(#tealAccent)" transform="rotate(-15 150 150)" />

        {/* Bottom-right geometric block */}
        <rect x="1550" y="700" width="450" height="450" fill="url(#slateAccent)" transform="rotate(20 1775 925)" />

        {/* Decorative lines - top */}
        <line x1="0" y1="200" x2="600" y2="150" stroke="#0D9488" strokeWidth="2" opacity="0.06" />
        <line x1="0" y1="220" x2="500" y2="180" stroke="#0D9488" strokeWidth="1.5" opacity="0.05" />
        <line x1="0" y1="240" x2="400" y2="210" stroke="#0D9488" strokeWidth="1" opacity="0.04" />

        {/* Decorative lines - bottom */}
        <line x1="1920" y1="850" x2="1300" y2="920" stroke="#475569" strokeWidth="2" opacity="0.06" />
        <line x1="1920" y1="870" x2="1400" y2="930" stroke="#475569" strokeWidth="1.5" opacity="0.05" />
        <line x1="1920" y1="890" x2="1500" y2="940" stroke="#475569" strokeWidth="1" opacity="0.04" />

        {/* Floating rectangles */}
        <rect x="200" y="400" width="40" height="40" fill="#0D9488" opacity="0.06" transform="rotate(45 220 420)" />
        <rect x="1600" y="300" width="30" height="30" fill="#475569" opacity="0.08" transform="rotate(-30 1615 315)" />
        <rect x="900" y="100" width="25" height="25" fill="#0D9488" opacity="0.05" transform="rotate(15 912 112)" />
        <rect x="1200" y="800" width="35" height="35" fill="#475569" opacity="0.06" transform="rotate(-20 1217 817)" />

        {/* Circles */}
        <circle cx="350" cy="600" r="80" fill="none" stroke="#0D9488" strokeWidth="1" opacity="0.08" />
        <circle cx="350" cy="600" r="60" fill="none" stroke="#0D9488" strokeWidth="1" opacity="0.06" />
        <circle cx="1550" cy="200" r="100" fill="none" stroke="#475569" strokeWidth="1" opacity="0.06" />
        <circle cx="1550" cy="200" r="70" fill="none" stroke="#475569" strokeWidth="1" opacity="0.04" />

        {/* Corner accents */}
        <path d="M0 0 L150 0 L0 150 Z" fill="#0D9488" opacity="0.04" />
        <path d="M1920 1080 L1770 1080 L1920 930 Z" fill="#475569" opacity="0.04" />

        {/* Small dots */}
        <circle cx="500" cy="300" r="4" fill="#0D9488" opacity="0.15" />
        <circle cx="1400" cy="500" r="5" fill="#475569" opacity="0.12" />
        <circle cx="700" cy="700" r="4" fill="#0D9488" opacity="0.1" />
        <circle cx="1100" cy="200" r="3" fill="#475569" opacity="0.14" />
      </svg>

      {/* Subtle overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: 'rgba(255, 255, 255, 0.01)',
          zIndex: 1
        }}
      />
    </div>
  );
};

export default AdminBackground;
