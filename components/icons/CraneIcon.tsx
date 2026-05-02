// components/icons/CraneIcon.tsx
import React from 'react';

export const CraneIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 64 64"
    className={className || 'w-6 h-6'}
    role="img"
    aria-label="Claw Machine Icon"
  >
    <defs>
      <linearGradient id="craneGlass" x1="0.5" y1="0" x2="0.5" y2="1">
        <stop offset="0" stopColor="#cce7ff" />
        <stop offset="1" stopColor="#a3d5ff" />
      </linearGradient>
       <linearGradient id="cranePink" x1="0.5" y1="0" x2="0.5" y2="1">
        <stop offset="0" stopColor="#ff7eb9" />
        <stop offset="1" stopColor="#ff63a5" />
      </linearGradient>
       <linearGradient id="craneBlue" x1="0.5" y1="0" x2="0.5" y2="1">
        <stop offset="0" stopColor="#6cb6ff" />
        <stop offset="1" stopColor="#3a9dff" />
      </linearGradient>
    </defs>
    {/* Main Frame */}
    <path fill="#e6e6e6" d="M12 2h40v60H12z" />
    <path fill="#f2f2f2" d="M14 4h36v56H14z" />
    
    {/* Top Panel */}
    <path fill="url(#cranePink)" d="M14 4h36v10H14z" />
    <path fill="#3a3a3a" d="M14 14h36v2H14z" />
    
    {/* Stars */}
    <path fill="#ffd700" d="m42 8 1.1 .8 -.4 1.3-1.3-.1 -.8 1.1 -.8-1.1-1.3.1-.4-1.3L39 8l.4-1.3 1.3.1L41.5 6l.8 1.1 1.3-.1z"/>
    <path fill="#87ceeb" d="m47 9l1.1 .8 -.4 1.3-1.3-.1 -.8 1.1 -.8-1.1-1.3.1-.4-1.3L44 9l.4-1.3 1.3.1.8-1.1.8 1.1 1.3-.1z"/>
    
    {/* Glass Area */}
    <rect x="16" y="18" width="32" height="26" fill="url(#craneGlass)" />
    <path fill="none" stroke="#fff" strokeWidth="1.5" strokeOpacity="0.7" d="M18 20 Q 32 25, 46 20" />

    {/* Prizes */}
    <circle cx="22" cy="42" r="4" fill="#a8e6cf"/>
    <circle cx="29" cy="42" r="5" fill="#dcedc1"/>
    <circle cx="38" cy="42" r="5" fill="#ffd3b6"/>
    <circle cx="45" cy="42" r="4" fill="#ffaaa5"/>
    
    {/* Claw mechanism */}
    <line x1="32" y1="18" x2="32" y2="28" stroke="#505050" strokeWidth="1.5" />
    <path fill="#c0c0c0" d="M32 28 a 2 2 0 0 1 0 4 a 2 2 0 0 1 0 -4" />
    <path stroke="#c0c0c0" strokeWidth="1.5" d="M32 32 L 29 35 M32 32 L 35 35 M32 32 L 32 35" />
    
    {/* Teddy bear in claw */}
    <g transform="translate(28.5 32)">
        <path d="M0 5.5 a 1.5 1.5 0 1 1 3 0" fill="#bf8f5a" />
        <path d="M6 5.5 a 1.5 1.5 0 1 1 3 0" fill="#bf8f5a" />
        <path d="M1.5 3.5 a 3 3.5 0 1 1 6 0 a 3 3.5 0 1 1 -6 0" fill="#d2b48c" />
        <circle cx="4.5" cy="3" r=".5" fill="black" />
        <circle cx="2.5" cy="3.2" r=".2" fill="black" />
        <circle cx="6.5" cy="3.2" r=".2" fill="black" />
    </g>

    {/* Bottom Control Panel */}
    <path fill="#3a3a3a" d="M14 46h36v2H14z" />
    <path fill="url(#craneBlue)" d="M14 48h36v12H14z" />
    
    {/* Joystick */}
    <path fill="#4682b4" d="M18 50h10v8H18z" />
    <circle cx="23" cy="54" r="4.5" fill="#606060" />
    <circle cx="23" cy="54" r="1.5" fill="#ff6347" />
    <line x1="23" y1="49" x2="23" y2="54" stroke="#ff6347" strokeWidth="1.5" />

    {/* Buttons */}
    <rect x="32" y="50" width="8" height="8" fill="#a8e6cf" rx="1" />
    <rect x="42" y="50" width="8" height="8" fill="#ffaaa5" rx="1" />
    <circle cx="46" cy="54" r="1" fill="white" />
  </svg>
);
