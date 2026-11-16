import React from 'react';

interface ChameleonCanvasProps {
    ambientColor?: string;
    intensity?: 'low' | 'medium' | 'high';
}

export function ChameleonCanvas({
    ambientColor = "rgba(59, 130, 246, 0.05)",
    intensity = 'medium'
}: ChameleonCanvasProps) {

    // Adjust opacity based on intensity
    const getOpacityMap = () => {
        switch (intensity) {
            case 'low': return { base: 0.3, glow: 0.1 };
            case 'high': return { base: 0.8, glow: 0.4 };
            default: return { base: 0.6, glow: 0.2 }; // medium
        }
    };

    const opacities = getOpacityMap();

    return (
        <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden bg-dark-950">
            <div
                className="absolute inset-0 transition-colors duration-[1500ms] ease-in-out blur-[120px]"
                style={{
                    backgroundColor: ambientColor,
                    opacity: opacities.base
                }}
            />

            {/* Soft decorative secondary glows to add depth */}
            <div
                className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[150px] transition-colors duration-[2000ms] ease-in-out mix-blend-screen"
                style={{
                    backgroundColor: ambientColor,
                    opacity: opacities.glow
                }}
            />

            <div
                className="absolute bottom-[-10%] right-[-20%] w-[50%] h-[50%] rounded-full blur-[150px] transition-colors duration-[2500ms] ease-in-out mix-blend-screen"
                style={{
                    backgroundColor: ambientColor,
                    opacity: opacities.glow * 0.8
                }}
            />
        </div>
    );
}
