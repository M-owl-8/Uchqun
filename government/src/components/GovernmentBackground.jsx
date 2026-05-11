/**
 * GovernmentBackground - Professional theme matching admin panel
 * Features: Light gradient background similar to admin panel
 */
const GovernmentBackground = () => {
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
          {/* Main gradient - Light purple/blue similar to admin */}
          <linearGradient id="governmentGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F5F3FF" />
            <stop offset="35%" stopColor="#F0F7FA" />
            <stop offset="65%" stopColor="#F5F8FA" />
            <stop offset="100%" stopColor="#F8FAFC" />
          </linearGradient>

          {/* Purple accent */}
          <linearGradient id="purpleAccent" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.06" />
          </linearGradient>
        </defs>

        {/* Main background */}
        <rect x="0" y="0" width="1920" height="1080" fill="url(#governmentGradient)" />

        {/* Top-left geometric block */}
        <rect x="-50" y="-50" width="400" height="400" fill="url(#purpleAccent)" transform="rotate(-15 150 150)" />

        {/* Bottom-right geometric block */}
        <rect x="1550" y="700" width="450" height="450" fill="url(#purpleAccent)" transform="rotate(20 1775 925)" opacity="0.5" />
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

export default GovernmentBackground;
