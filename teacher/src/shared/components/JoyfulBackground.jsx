import React from 'react';

/**
 * JoyfulBackground - Sky gradient, sun with face, clouds, green hills, sparkles
 */
const JoyfulBackground = () => {
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
          {/* Sky gradient */}
          <linearGradient id="skyGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#C7E7FF" />
            <stop offset="45%" stopColor="#F4FBFF" />
            <stop offset="100%" stopColor="#FFF7E6" />
          </linearGradient>

          {/* Hill gradients */}
          <linearGradient id="hillGradient1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#B7F7D1" />
            <stop offset="100%" stopColor="#6EE7B7" />
          </linearGradient>

          <linearGradient id="hillGradient2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#9AE6B4" />
            <stop offset="100%" stopColor="#68D391" />
          </linearGradient>

          {/* Sun glow */}
          <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFD36E" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#FFD36E" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Sky background */}
        <rect x="0" y="0" width="1920" height="1080" fill="url(#skyGradient)" />

        {/* Sun glow effect */}
        <circle cx="1700" cy="150" r="120" fill="url(#sunGlow)" />

        {/* Sun */}
        <circle cx="1700" cy="150" r="60" fill="#FFD36E" opacity="0.95" />
        {/* Sun face - eyes */}
        <circle cx="1682" cy="140" r="8" fill="#2B2B2B" opacity="0.25" />
        <circle cx="1718" cy="140" r="8" fill="#2B2B2B" opacity="0.25" />
        {/* Sun face - smile */}
        <path d="M1682 165 Q1700 180 1718 165" stroke="#2B2B2B" strokeWidth="5" fill="none" opacity="0.25" />

        {/* Sparkles */}
        <circle cx="200" cy="120" r="4" fill="#FFFFFF" opacity="0.7" />
        <circle cx="1600" cy="250" r="3" fill="#FFFFFF" opacity="0.6" />
        <circle cx="400" cy="300" r="3.5" fill="#FFFFFF" opacity="0.55" />
        <circle cx="1400" cy="400" r="4" fill="#FFFFFF" opacity="0.65" />
        <circle cx="700" cy="200" r="3" fill="#FFFFFF" opacity="0.5" />
        <circle cx="1100" cy="150" r="3.5" fill="#FFFFFF" opacity="0.6" />
        <circle cx="300" cy="450" r="3" fill="#FFFFFF" opacity="0.5" />
        <circle cx="900" cy="100" r="4" fill="#FFFFFF" opacity="0.55" />
        <circle cx="1500" cy="350" r="3" fill="#FFFFFF" opacity="0.6" />
        <circle cx="600" cy="380" r="3.5" fill="#FFFFFF" opacity="0.5" />

        {/* Clouds */}
        {/* Cloud 1 - Top left */}
        <path
          d="M150 200c20-40 75-45 105-15 25-25 70-20 85 15 35-5 65 20 65 55 0 30-25 55-55 55H165c-35 0-65-25-65-60 0-25 17-45 45-50z"
          fill="#FFFFFF"
          opacity="0.9"
        />

        {/* Cloud 2 - Top center */}
        <path
          d="M800 150c15-30 55-35 78-12 18-18 52-15 62 12 26-4 48 15 48 40 0 22-18 40-40 40H810c-26 0-48-18-48-44 0-18 13-33 33-36z"
          fill="#FFFFFF"
          opacity="0.85"
        />

        {/* Cloud 3 - Right side */}
        <path
          d="M1400 280c18-35 65-40 92-14 22-22 62-18 74 14 30-5 56 18 56 46 0 26-21 46-46 46H1415c-30 0-55-21-55-50 0-21 15-38 38-42z"
          fill="#FFFFFF"
          opacity="0.88"
        />

        {/* Cloud 4 - Lower left */}
        <path
          d="M100 420c12-24 45-28 63-10 15-15 42-12 50 10 22-3 40 12 40 33 0 18-15 33-33 33H110c-22 0-40-15-40-36 0-15 11-27 27-30z"
          fill="#FFFFFF"
          opacity="0.82"
        />

        {/* Cloud 5 - Center */}
        <path
          d="M550 350c14-28 52-32 72-11 17-17 48-14 58 11 25-4 46 14 46 38 0 21-17 38-38 38H560c-25 0-45-17-45-41 0-17 12-31 31-35z"
          fill="#FFFFFF"
          opacity="0.8"
        />

        {/* Hills - Back layer */}
        <path
          d="M0 750 C200 650 400 800 600 700 C800 620 1000 750 1200 680 C1400 620 1600 700 1920 650 L1920 1080 L0 1080 Z"
          fill="url(#hillGradient1)"
          opacity="0.75"
        />

        {/* Hills - Front layer */}
        <path
          d="M0 820 C250 740 450 870 700 780 C900 720 1100 830 1350 760 C1550 710 1750 780 1920 730 L1920 1080 L0 1080 Z"
          fill="url(#hillGradient2)"
          opacity="0.65"
        />

        {/* Small decorative flowers/grass on hills */}
        <circle cx="150" cy="870" r="5" fill="#68D391" opacity="0.6" />
        <circle cx="160" cy="865" r="4" fill="#68D391" opacity="0.5" />
        <circle cx="400" cy="820" r="5" fill="#68D391" opacity="0.6" />
        <circle cx="410" cy="815" r="4" fill="#68D391" opacity="0.5" />
        <circle cx="700" cy="840" r="5" fill="#68D391" opacity="0.6" />
        <circle cx="710" cy="835" r="4" fill="#68D391" opacity="0.5" />
        <circle cx="1000" cy="800" r="5" fill="#68D391" opacity="0.6" />
        <circle cx="1010" cy="795" r="4" fill="#68D391" opacity="0.5" />
        <circle cx="1300" cy="820" r="5" fill="#68D391" opacity="0.6" />
        <circle cx="1310" cy="815" r="4" fill="#68D391" opacity="0.5" />
        <circle cx="1600" cy="780" r="5" fill="#68D391" opacity="0.6" />
        <circle cx="1610" cy="775" r="4" fill="#68D391" opacity="0.5" />
      </svg>

      {/* Subtle overlay for better text readability */}
      <div
        className="absolute inset-0"
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          zIndex: 1
        }}
      />
    </div>
  );
};

export default JoyfulBackground;
