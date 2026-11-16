import React from 'react';

export function GlassContainer({
    children,
    className = "",
    noPadding = false
}: {
    children: React.ReactNode;
    className?: string;
    noPadding?: boolean;
}) {
    return (
        <div
            className={`
                bg-dark-900/40 
                backdrop-blur-xl 
                border border-white/10 
                shadow-minimal 
                transition-all duration-300
                hover:border-white/15 hover:shadow-minimal-hover
                ${noPadding ? '' : 'p-4 md:p-6'}
                rounded-3xl
                ${className}
            `}
        >
            {children}
        </div>
    );
}
