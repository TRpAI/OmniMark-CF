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
        viewBox="0 0 512 512"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-sm"
      >
        <defs>
          <linearGradient id="bl-bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0a0f1d" />
            <stop offset="50%" stopColor="#111827" />
            <stop offset="100%" stopColor="#090d16" />
          </linearGradient>

          <linearGradient id="bl-cyberGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="45%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>

          <linearGradient id="bl-ribbonGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ec4899" />
            <stop offset="50%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>

          <linearGradient id="bl-rimGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.6" />
            <stop offset="50%" stopColor="#6366f1" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0.5" />
          </linearGradient>
        </defs>

        {/* Base Squircle */}
        <rect
          x="32"
          y="32"
          width="448"
          height="448"
          rx="104"
          fill="url(#bl-bgGrad)"
          stroke="url(#bl-rimGrad)"
          strokeWidth="6"
        />

        {/* Ribbon Body */}
        <path
          d="M 176 112 C 176 100, 186 92, 198 92 L 314 92 C 326 92, 336 100, 336 112 L 336 392 L 256 324 L 176 392 Z"
          fill="url(#bl-cyberGrad)"
        />

        {/* Inset Facet */}
        <path
          d="M 256 120 L 320 120 L 320 366 L 256 312 Z"
          fill="url(#bl-ribbonGrad)"
          opacity="0.8"
        />

        {/* Dark Cutout */}
        <path
          d="M 216 132 L 296 132 L 296 290 L 256 256 L 216 290 Z"
          fill="#0a0f1d"
          opacity="0.92"
        />

        {/* Glowing Compass Star */}
        <g transform="translate(256, 212)">
          <path
            d="M 0 -54 Q 0 0 -54 0 Q 0 0 0 54 Q 0 0 54 0 Q 0 0 0 -54 Z"
            fill="#ffffff"
          />
          <circle cx="0" cy="0" r="10" fill="#fef08a" />
          <circle cx="0" cy="0" r="5" fill="#ffffff" />
        </g>
      </svg>
    </div>
  );
};
