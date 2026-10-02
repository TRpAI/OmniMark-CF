import React from 'react';

interface BrandLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ className = '', size = 'md' }) => {
  const sizeMap = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-11 h-11',
    xl: 'w-14 h-14',
  };

  return (
    <div
      className={`relative flex items-center justify-center shrink-0 rounded-xl overflow-hidden transition-transform duration-300 select-none ${sizeMap[size]} ${className}`}
    >
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-sm"
      >
        <defs>
          {/* Main Gradient */}
          <linearGradient id="omni-grad-1" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="50%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>

          {/* Ribbon Accent Gradient */}
          <linearGradient id="omni-grad-2" x1="40" y1="8" x2="8" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#f43f5e" />
            <stop offset="60%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>

          {/* Inner Glow */}
          <radialGradient id="omni-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Outer Hex-Squircle Shield Backing */}
        <rect
          x="2"
          y="2"
          width="44"
          height="44"
          rx="12"
          fill="url(#omni-grad-1)"
        />

        {/* Subtle Dark Overlay for Depth */}
        <rect
          x="3"
          y="3"
          width="42"
          height="42"
          rx="11"
          fill="#09090b"
          fillOpacity="0.12"
        />

        {/* Futuristic Interlocking "O" & Bookmark Core Ribbon */}
        {/* Left arc */}
        <path
          d="M24 10C16.268 10 10 16.268 10 24C10 31.732 16.268 38 24 38C27.5 38 30.68 36.72 33.12 34.6L27.8 29.28C26.7 30.05 25.4 30.5 24 30.5C20.41 30.5 17.5 27.59 17.5 24C17.5 20.41 20.41 17.5 24 17.5C27.59 17.5 30.5 20.41 30.5 24H38C38 16.268 31.732 10 24 10Z"
          fill="white"
          fillOpacity="0.95"
        />

        {/* Dynamic Chevron Bookmark Crest cutting into O */}
        <path
          d="M26 12L38 24L38 12L26 12Z"
          fill="url(#omni-grad-2)"
        />

        {/* Precision North-East Launch Notch */}
        <polygon
          points="24,24 38,24 38,38 31,31 31,24"
          fill="white"
          fillOpacity="0.8"
        />

        {/* Glowing Center Core Dot */}
        <circle cx="24" cy="24" r="3" fill="#ffffff" />
        <circle cx="24" cy="24" r="5" fill="url(#omni-glow)" />
      </svg>
    </div>
  );
};
