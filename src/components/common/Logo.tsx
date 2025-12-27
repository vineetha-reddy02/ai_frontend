import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';

interface LogoProps {
    className?: string;
    showIcon?: boolean; // If we want to support an icon version later
}

export const Logo: React.FC<LogoProps> = ({ className = '' }) => {
    const { theme } = useSelector((state: RootState) => state.ui);

    // According to rules:
    // Edu -> Red
    // Talks -> Black
    // Colors must NOT change in dark mode.
    // "Ensure enough contrast so black 'Talks' text is still readable in dark mode"

    // To ensure readability of Black text on Dark background without changing the text color,
    // we might need a light backdrop for the logo text if the theme is dark.
    // However, the user said "Logo background should remain transparent".
    // This is a conflict.
    // Compromise: Add a subtle white glow/drop-shadow in dark mode to separate "Talks" from the dark background.

    const textShadowStyle = theme === 'dark'
        ? { textShadow: '0 0 1px rgba(255,255,255,0.8), 0 0 10px rgba(255,255,255,0.5)' }
        : {};

    return (
        <div className={`flex items-center gap-1 font-bold text-2xl tracking-tight ${className}`} aria-label="EduTalks Logo">
            <span className="text-red-600">Edu</span>
            <span className="text-black" style={textShadowStyle}>Talks</span>
        </div>
    );
};
