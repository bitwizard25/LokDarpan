import React from 'react';

export interface SmartHoverTooltipProps {
    title: string;
    summaryBullets: string[];
    isVisible: boolean;
}

export function SmartHoverTooltip({ title, summaryBullets, isVisible }: SmartHoverTooltipProps) {
    return (
        <div
            className={`absolute z-50 left-1/2 -ml-36 bottom-[105%] w-72 bg-dark-900/80 backdrop-blur-2xl p-5 border border-white/10 rounded-2xl shadow-minimal-hover pointer-events-none transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] origin-bottom ${isVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'}`}
        >
            <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 rounded-full bg-primary-500/20 flex items-center justify-center">
                    <svg className="w-3 h-3 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                </div>
                <span className="text-[10px] font-bold text-primary-400 uppercase tracking-widest">AI Insight</span>
            </div>

            <h4 className="text-sm font-bold text-white mb-3 line-clamp-1">{title}</h4>

            <ul className="flex flex-col gap-2.5">
                {summaryBullets.map((bullet, idx) => (
                    <li key={idx} className="text-xs text-dark-300 flex items-start gap-2 leading-relaxed">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent-500/50 mt-1 shrink-0 shadow-glow-subtle" />
                        <span>{bullet}</span>
                    </li>
                ))}
            </ul>

            {/* Tooltip Triangle Arrow */}
            <div className="absolute -bottom-2 left-1/2 -ml-2 w-4 h-4 bg-dark-900/80 border-b border-r border-white/10 transform rotate-45 backdrop-blur-2xl" />
        </div>
    );
}
