/**
 * TeacherBackground - Professional educational theme
 * Features: Lavender gradient, subtle geometric patterns, academic feel
 */
const TeacherBackground = () => {
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
          {/* Main gradient - Soft lavender to warm peach */}
          <linearGradient id="teacherGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#E8E0F0" />
            <stop offset="40%" stopColor="#F0EBF7" />
            <stop offset="70%" stopColor="#FDF6F0" />
            <stop offset="100%" stopColor="#FFF8F3" />
          </linearGradient>

          {/* Accent gradient for shapes */}
          <linearGradient id="accentGradient1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#9B7ED9" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#7C5DC4" stopOpacity="0.08" />
          </linearGradient>

          <linearGradient id="accentGradient2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#D4A574" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#C4956A" stopOpacity="0.06" />
          </linearGradient>

          {/* Circle pattern */}
          <pattern id="circlePattern" x="0" y="0" width="120" height="120" patternUnits="userSpaceOnUse">
            <circle cx="60" cy="60" r="2" fill="#9B7ED9" opacity="0.15" />
          </pattern>
        </defs>

        {/* Main background */}
        <rect x="0" y="0" width="1920" height="1080" fill="url(#teacherGradient)" />

        {/* Subtle dot pattern */}
        <rect x="0" y="0" width="1920" height="1080" fill="url(#circlePattern)" opacity="0.4" />

        {/* Top-left decorative arc */}
        <path
          d="M0 0 Q400 200 200 600 L0 600 Z"
          fill="url(#accentGradient1)"
        />

        {/* Top-right decorative circle */}
        <circle cx="1750" cy="150" r="200" fill="#9B7ED9" opacity="0.06" />
        <circle cx="1750" cy="150" r="140" fill="#9B7ED9" opacity="0.04" />
        <circle cx="1750" cy="150" r="80" fill="#9B7ED9" opacity="0.03" />

        {/* Bottom decorative wave */}
        <path
          d="M0 900 C300 820 600 950 900 880 C1200 810 1500 920 1920 850 L1920 1080 L0 1080 Z"
          fill="url(#accentGradient2)"
        />

        {/* Floating geometric shapes */}
        {/* Hexagon 1 */}
        <polygon
          points="150,300 180,280 210,300 210,340 180,360 150,340"
          fill="#9B7ED9"
          opacity="0.08"
        />

        {/* Hexagon 2 */}
        <polygon
          points="1600,500 1640,475 1680,500 1680,550 1640,575 1600,550"
          fill="#D4A574"
          opacity="0.1"
        />

        {/* Circle decorations */}
        <circle cx="300" cy="200" r="6" fill="#9B7ED9" opacity="0.2" />
        <circle cx="1500" cy="300" r="8" fill="#D4A574" opacity="0.15" />
        <circle cx="800" cy="150" r="5" fill="#9B7ED9" opacity="0.18" />
        <circle cx="1200" cy="250" r="7" fill="#9B7ED9" opacity="0.12" />
        <circle cx="400" cy="500" r="6" fill="#D4A574" opacity="0.14" />
        <circle cx="1700" cy="700" r="8" fill="#9B7ED9" opacity="0.1" />

        {/* Subtle lines */}
        <line x1="100" y1="400" x2="250" y2="450" stroke="#9B7ED9" strokeWidth="1" opacity="0.1" />
        <line x1="1650" y1="350" x2="1800" y2="400" stroke="#D4A574" strokeWidth="1" opacity="0.12" />

        {/* Small squares */}
        <rect x="500" y="180" width="15" height="15" fill="#9B7ED9" opacity="0.08" transform="rotate(15 507 187)" />
        <rect x="1400" y="600" width="12" height="12" fill="#D4A574" opacity="0.1" transform="rotate(-10 1406 606)" />
      </svg>

      {/* Subtle overlay for text readability */}
      <div
        className="absolute inset-0"
        style={{
          background: 'rgba(255, 255, 255, 0.02)',
          zIndex: 1
        }}
      />
    </div>
  );
};

export default TeacherBackground;
