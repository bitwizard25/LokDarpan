import React from 'react';

interface KineticButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'glass';
    size?: 'sm' | 'md' | 'lg' | 'icon';
    children: React.ReactNode;
    activeGlowColor?: string; // Hex or rgba for the chameleon inherited color
}

export function KineticButton({
    children,
    variant = 'primary',
    size = 'md',
    className = "",
    activeGlowColor,
    style,
    ...props
}: KineticButtonProps) {

    // Base kinetic styles
    const baseStyles = "inline-flex items-center justify-center font-bold tracking-wide rounded-full transition-all duration-300 active:scale-95 active:animate-bounce-elastic outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white/20";

    const sizeMap = {
        sm: "px-4 py-2 text-xs",
        md: "px-6 py-3 text-sm",
        lg: "px-8 py-4 text-base",
        icon: "p-3" // For icon-only buttons
    };

    const variantStyles = {
        primary: "bg-white text-black hover:bg-dark-200 hover:shadow-[0_0_20px_rgba(255,255,255,0.4)] border border-transparent",
        secondary: "bg-dark-800 text-white border border-white/10 hover:bg-dark-700 hover:border-white/20",
        ghost: "bg-transparent text-dark-300 hover:text-white hover:bg-white/10",
        glass: "bg-white/5 backdrop-blur-md text-white border border-white/10 hover:bg-white/10 hover:border-white/20"
    };

    // If an active color is provided (chameleon effect), override primary hover
    let dynamicStyles = {};
    if (activeGlowColor && variant === 'primary') {
        dynamicStyles = {
            boxShadow: `0 0 20px ${activeGlowColor}`,
            // In a real implementation we might also slightly tint the background
        };
    }

    return (
        <button
            className={`${baseStyles} ${sizeMap[size]} ${variantStyles[variant]} ${className}`}
            style={{ ...style, ...dynamicStyles }}
            {...props}
        >
            {children}
        </button>
    );
}
