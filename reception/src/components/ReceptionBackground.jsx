/**
 * ReceptionBackground - Warm welcoming theme
 * Features: Coral/peach gradient, flowing waves, hospitality feel
 */
const ReceptionBackground = () => {
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
          {/* Main gradient - Warm coral to cream */}
          <linearGradient id="receptionGradient" x1="0" y1="0" x2="0.5" y2="1">
            <stop offset="0%" stopColor="#FFF5F0" />
            <stop offset="30%" stopColor="#FFF8F5" />
            <stop offset="60%" stopColor="#FFFBF8" />
            <stop offset="100%" stopColor="#FFFDFB" />
          </linearGradient>

          {/* Coral accent */}
          <linearGradient id="coralAccent" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F97316" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#FB923C" stopOpacity="0.05" />
          </linearGradient>

          {/* Rose accent */}
          <linearGradient id="roseAccent" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#FB7185" stopOpacity="0.04" />
          </linearGradient>

          {/* Amber accent */}
          <linearGradient id="amberAccent" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#FBBF24" stopOpacity="0.04" />
          </linearGradient>
        </defs>

        {/* Main background */}
        <rect x="0" y="0" width="1920" height="1080" fill="url(#receptionGradient)" />

        {/* Top flowing wave */}
        <path
          d="M0 0 L1920 0 L1920 250 Q1600 180 1200 220 Q800 260 400 200 Q200 170 0 200 Z"
          fill="url(#coralAccent)"
        />

        {/* Middle decorative wave */}
        <path
          d="M0 400 Q300 350 600 380 Q900 410 1200 360 Q1500 310 1920 350 L1920 500 Q1500 460 1200 490 Q900 520 600 480 Q300 440 0 480 Z"
          fill="url(#roseAccent)"
        />

        {/* Bottom wave */}
        <path
          d="M0 800 Q250 750 500 780 Q750 810 1000 770 Q1250 730 1500 760 Q1750 790 1920 750 L1920 1080 L0 1080 Z"
          fill="url(#amberAccent)"
        />

        {/* Decorative circles - top right */}
        <circle cx="1700" cy="200" r="120" fill="#F97316" opacity="0.05" />
        <circle cx="1700" cy="200" r="80" fill="#F97316" opacity="0.04" />
        <circle cx="1700" cy="200" r="40" fill="#F97316" opacity="0.03" />

        {/* Decorative circles - bottom left */}
        <circle cx="200" cy="850" r="150" fill="#F43F5E" opacity="0.04" />
        <circle cx="200" cy="850" r="100" fill="#F43F5E" opacity="0.03" />
        <circle cx="200" cy="850" r="50" fill="#F43F5E" opacity="0.02" />

        {/* Floating soft circles */}
        <circle cx="400" cy="300" r="8" fill="#F97316" opacity="0.15" />
        <circle cx="1500" cy="600" r="10" fill="#F43F5E" opacity="0.12" />
        <circle cx="800" cy="500" r="7" fill="#F59E0B" opacity="0.14" />
        <circle cx="1200" cy="300" r="6" fill="#F97316" opacity="0.1" />
        <circle cx="300" cy="600" r="9" fill="#FB923C" opacity="0.13" />
        <circle cx="1600" cy="400" r="8" fill="#F43F5E" opacity="0.11" />
        <circle cx="600" cy="200" r="5" fill="#F59E0B" opacity="0.16" />
        <circle cx="1100" cy="700" r="7" fill="#F97316" opacity="0.12" />

        {/* Subtle curved lines */}
        <path
          d="M100 200 Q300 150 500 200"
          fill="none"
          stroke="#F97316"
          strokeWidth="2"
          opacity="0.08"
        />
        <path
          d="M1400 700 Q1600 650 1800 700"
          fill="none"
          stroke="#F43F5E"
          strokeWidth="2"
          opacity="0.08"
        />

        {/* Small decorative elements */}
        <ellipse cx="900" cy="150" rx="30" ry="15" fill="#F97316" opacity="0.06" />
        <ellipse cx="1000" cy="900" rx="40" ry="20" fill="#F59E0B" opacity="0.05" />
      </svg>

      {/* Subtle warm overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: 'rgba(255, 250, 245, 0.02)',
          zIndex: 1
        }}
      />
    </div>
  );
};

export default ReceptionBackground;
