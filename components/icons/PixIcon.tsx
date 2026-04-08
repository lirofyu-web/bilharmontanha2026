import React from 'react';

export const PixIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2.5" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className={className}
    >
        <path d="M12 2L4 12l8 10 8-10L12 2z" />
        <path d="M12 7l-5 5 5 5 5-5-5-5z" />
    </svg>
);
