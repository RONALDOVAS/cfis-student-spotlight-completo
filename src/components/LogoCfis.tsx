import React from 'react';

interface LogoCfisProps {
  className?: string;
  variant?: 'full' | 'compact' | 'icon' | 'white';
  showSubtitle?: boolean;
}

export const LogoCfis: React.FC<LogoCfisProps> = ({
  className = 'h-11',
  variant = 'full',
  showSubtitle = true,
}) => {
  const isWhite = variant === 'white';
  const greenPrimary = isWhite ? '#FFFFFF' : '#0B6B38';
  const greenDark = isWhite ? '#F1F5F9' : '#064E26';
  const yellowAccent = isWhite ? '#FDE047' : '#F59E0B';
  const yellowGold = isWhite ? '#FEF08A' : '#EAB308';
  const textColor = isWhite ? '#FFFFFF' : '#095C2F';
  const subtextColor = isWhite ? '#E2E8F0' : '#14532D';

  if (variant === 'icon') {
    return (
      <div className={`inline-flex items-center justify-center select-none ${className}`}>
        <svg
          viewBox="0 0 90 90"
          className="h-full w-auto aspect-square overflow-visible"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Subtle Glow/Backdrop */}
          <circle cx="45" cy="45" r="42" fill={greenPrimary} fillOpacity={isWhite ? "0.2" : "0.08"} />
          
          {/* Main Central Sphere */}
          <circle cx="48" cy="48" r="19" fill={greenPrimary} />
          
          {/* Constellation Nodes - Progressive Orbit */}
          <circle cx="20" cy="68" r="7.5" fill={greenPrimary} />
          <circle cx="31" cy="67" r="5.5" fill={greenDark} />
          <circle cx="16" cy="49" r="8" fill={greenPrimary} />
          <circle cx="28" cy="49" r="5" fill={greenDark} />
          <circle cx="21" cy="31" r="7" fill={yellowAccent} />
          <circle cx="34" cy="33" r="5" fill={greenPrimary} />
          <circle cx="34" cy="18" r="8" fill={yellowAccent} />
          <circle cx="51" cy="19" r="6" fill={greenPrimary} />
          <circle cx="68" cy="24" r="5" fill={yellowGold} />
          <circle cx="48" cy="32" r="4" fill={greenPrimary} />
          <circle cx="63" cy="37" r="4" fill={greenPrimary} />
        </svg>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 select-none ${className}`}>
      <svg
        viewBox="0 0 360 84"
        className="h-full w-auto max-h-12 overflow-visible"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="cfisGreenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={isWhite ? "#FFFFFF" : "#0D7A40"} />
            <stop offset="100%" stopColor={isWhite ? "#E2E8F0" : "#054D25"} />
          </linearGradient>
          <linearGradient id="cfisYellowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={yellowAccent} />
            <stop offset="100%" stopColor={yellowGold} />
          </linearGradient>
        </defs>

        {/* --- ICON SYMBOL: SPHERICAL CONSTELLATION --- */}
        <g id="cfis-symbol" transform="translate(4, 2)">
          {/* Main Central Sphere */}
          <circle cx="52" cy="40" r="18" fill="url(#cfisGreenGrad)" />
          
          {/* Outer constellation bubbles representing dynamic learning and ascent */}
          <circle cx="22" cy="62" r="7" fill={greenPrimary} />
          <circle cx="34" cy="59" r="5" fill={greenDark} />
          <circle cx="16" cy="44" r="7.5" fill={greenPrimary} />
          <circle cx="28" cy="43" r="4.5" fill={greenDark} />
          <circle cx="20" cy="26" r="6.5" fill="url(#cfisYellowGrad)" />
          <circle cx="33" cy="27" r="4.5" fill={greenPrimary} />
          <circle cx="32" cy="13" r="7.5" fill="url(#cfisYellowGrad)" />
          <circle cx="48" cy="14" r="5.5" fill={greenPrimary} />
          <circle cx="64" cy="18" r="4.5" fill="url(#cfisYellowGrad)" />
          <circle cx="46" cy="26" r="3.5" fill={greenPrimary} />
          <circle cx="60" cy="30" r="3.5" fill={greenPrimary} />
        </g>

        {/* --- WORDMARK: CFIS --- */}
        <g id="cfis-wordmark" fill={textColor}>
          {/* C */}
          <path
            d="M 126 23 C 122.5 18.5 116 16 107.5 16 C 93.5 16 83 26.5 83 41.5 C 83 56.5 93.5 67 107.5 67 C 116 67 122.5 64.5 126 60 L 122.5 53 C 119 56.5 114.5 58.5 107.5 58.5 C 98.5 58.5 92.5 51 92.5 41.5 C 92.5 32 98.5 24.5 107.5 24.5 C 114.5 24.5 119 26.5 122.5 30 Z"
            fill="url(#cfisGreenGrad)"
          />

          {/* F */}
          <path
            d="M 136 18 H 164 V 26.5 H 145.5 V 37.5 H 161.5 V 45.5 H 145.5 V 65 H 136 Z"
            fill="url(#cfisGreenGrad)"
          />

          {/* I */}
          <path
            d="M 174 18 H 183.5 V 65 H 174 Z"
            fill="url(#cfisGreenGrad)"
          />

          {/* S */}
          <path
            d="M 201 27 C 205 20.5 212.5 17 221.5 17 C 234 17 242 23.5 242 33 C 242 42.5 234.5 46.5 224.5 49 L 217 51 C 210 52.5 206.5 55 206.5 59.5 C 206.5 64.5 211.5 67.5 218.5 67.5 C 225.5 67.5 231 64 234.5 60.5 L 239 67 C 234 71.5 226.5 74.5 218.5 74.5 C 206.5 74.5 197.5 68 197.5 58.5 C 197.5 49.5 204.5 45 214 42.5 L 221.5 40.5 C 228.5 38.5 232.5 36 232.5 31 C 232.5 26.5 228 24 221.5 24 C 215.5 24 210.5 26.5 206.5 30.5 Z"
            fill="url(#cfisGreenGrad)"
          />

          {/* Registered Trademark ® */}
          <g transform="translate(247, 20)">
            <circle cx="5" cy="5" r="4.5" stroke={greenPrimary} strokeWidth="1" fill="none" />
            <text
              x="5"
              y="7.5"
              fontSize="6"
              fontFamily="system-ui, sans-serif"
              fontWeight="bold"
              textAnchor="middle"
              fill={greenPrimary}
            >
              R
            </text>
          </g>
        </g>

        {/* --- SUBTITLE: CURSOS PROFISSIONALIZANTES --- */}
        {showSubtitle && (
          <g id="cfis-subtitle">
            <text
              x="172"
              y="78"
              fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
              fontSize="10.5"
              fontWeight="800"
              letterSpacing="3"
              fill={subtextColor}
              textAnchor="middle"
            >
              CURSOS PROFISSIONALIZANTES
            </text>
          </g>
        )}
      </svg>
    </div>
  );
};
