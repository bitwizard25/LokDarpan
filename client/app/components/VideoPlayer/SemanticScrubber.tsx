import { useState, useRef, useCallback, useEffect } from "react";

// Mock data for AI-detected chapters and engagement heatmap
const mockChapters = [
    { time: 0, label: "Intro — City Overview", color: "rgba(59, 130, 246, 0.6)" },
    { time: 120, label: "The Ancient Temple", color: "rgba(236, 72, 153, 0.6)" },
    { time: 300, label: "Street Food Adventure", color: "rgba(16, 185, 129, 0.6)" },
    { time: 480, label: "Hidden Alleyways", color: "rgba(245, 158, 11, 0.6)" },
    { time: 600, label: "Sunset at the Shrine", color: "rgba(168, 85, 247, 0.6)" },
];

// Simulated engagement heatmap (normalized 0-1)
const heatmapData = [
    0.3, 0.4, 0.5, 0.6, 0.8, 0.95, 1.0, 0.9, 0.85, 0.7,
    0.5, 0.4, 0.6, 0.8, 0.9, 0.95, 0.7, 0.5, 0.3, 0.4,
    0.5, 0.7, 0.85, 0.9, 1.0, 0.95, 0.8, 0.6, 0.4, 0.3,
    0.5, 0.6, 0.7, 0.8, 0.6, 0.5, 0.4, 0.6, 0.8, 0.9,
];

// Generate scene descriptions for hover preview
function getSceneDescription(progress: number): string {
    if (progress < 0.17) return "Aerial establishing shot of the ancient city at dawn";
    if (progress < 0.33) return "Close-up of intricate temple carvings and golden statues";
    if (progress < 0.5) return "Bustling night market with neon-lit food stalls";
    if (progress < 0.67) return "Atmospheric exploration of narrow cobblestone alleyways";
    if (progress < 0.83) return "Golden hour light filtering through cherry blossom trees";
    return "Panoramic time-lapse of sunset reflecting on the river";
}

function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

interface SemanticScrubberProps {
    videoRef: React.RefObject<HTMLVideoElement>;
    duration?: number;
    currentTime?: number;
}

export function SemanticScrubber({ videoRef, duration = 720, currentTime = 0 }: SemanticScrubberProps) {
    const scrubberRef = useRef<HTMLDivElement>(null);
    const [hoverPosition, setHoverPosition] = useState<number | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [internalTime, setInternalTime] = useState(currentTime);

    // Sync with actual video time
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        const onTimeUpdate = () => setInternalTime(video.currentTime);
        video.addEventListener('timeupdate', onTimeUpdate);
        return () => video.removeEventListener('timeupdate', onTimeUpdate);
    }, [videoRef]);

    const progress = duration > 0 ? internalTime / duration : 0;

    const getPositionFromEvent = useCallback((e: React.MouseEvent | MouseEvent) => {
        if (!scrubberRef.current) return 0;
        const rect = scrubberRef.current.getBoundingClientRect();
        return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    }, []);

    const seekTo = useCallback((pos: number) => {
        if (videoRef.current) {
            videoRef.current.currentTime = pos * duration;
        }
    }, [videoRef, duration]);

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        const pos = getPositionFromEvent(e);
        seekTo(pos);
    };

    useEffect(() => {
        if (!isDragging) return;
        const handleMouseMove = (e: MouseEvent) => {
            const pos = getPositionFromEvent(e);
            seekTo(pos);
        };
        const handleMouseUp = () => setIsDragging(false);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, getPositionFromEvent, seekTo]);

    // Get current chapter
    const currentChapter = [...mockChapters].reverse().find(c => internalTime >= c.time);

    return (
        <div className="flex items-center gap-3 w-full flex-1">
            {/* Elapsed Time */}
            <span className="text-white/90 text-[10px] md:text-xs font-bold font-mono tracking-wider tabular-nums shrink-0">
                {formatTime(internalTime)}
            </span>

            {/* The Semantic Timeline */}
            <div className="flex-1 flex flex-col gap-1 relative">
                {/* Chapter Label */}
                {currentChapter && (
                    <div className="absolute -top-6 left-0 right-0 flex items-center gap-2 opacity-0 group-hover/timeline:opacity-100 transition-opacity pointer-events-none">
                        <span className="text-[10px] font-medium text-white/60 truncate">{currentChapter.label}</span>
                    </div>
                )}

                {/* Scrubber Track */}
                <div
                    ref={scrubberRef}
                    className="relative h-2 md:h-2.5 rounded-full cursor-pointer group/timeline overflow-hidden"
                    onMouseDown={handleMouseDown}
                    onMouseMove={(e) => setHoverPosition(getPositionFromEvent(e))}
                    onMouseLeave={() => setHoverPosition(null)}
                >
                    {/* Background — Engagement Heatmap */}
                    <div className="absolute inset-0 flex rounded-full overflow-hidden">
                        {heatmapData.map((intensity, i) => (
                            <div
                                key={i}
                                className="h-full flex-1"
                                style={{
                                    backgroundColor: `rgba(255, 255, 255, ${0.04 + intensity * 0.12})`,
                                }}
                            />
                        ))}
                    </div>

                    {/* Chapter Markers (tiny glowing dots) */}
                    {mockChapters.slice(1).map((chapter, i) => (
                        <div
                            key={i}
                            className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 md:w-2 md:h-2 rounded-full z-10 pointer-events-none"
                            style={{
                                left: `${(chapter.time / duration) * 100}%`,
                                backgroundColor: chapter.color,
                                boxShadow: `0 0 6px ${chapter.color}`,
                            }}
                        />
                    ))}

                    {/* Progress Fill */}
                    <div
                        className="absolute left-0 h-full rounded-full z-[5] transition-[width] duration-100"
                        style={{
                            width: `${progress * 100}%`,
                            background: 'linear-gradient(90deg, rgba(59, 130, 246, 0.8), rgba(139, 92, 246, 0.8))',
                            boxShadow: '0 0 12px rgba(59, 130, 246, 0.5)',
                        }}
                    >
                        {/* Scrub Handle */}
                        <div className={`absolute right-0 top-1/2 -translate-y-1/2 -mr-2 w-4 h-4 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)] z-20 transition-all ${isDragging ? 'scale-125 opacity-100' : 'scale-0 opacity-0 group-hover/timeline:scale-100 group-hover/timeline:opacity-100'}`} />
                    </div>

                    {/* Hover Indicator Line */}
                    {hoverPosition !== null && !isDragging && (
                        <div
                            className="absolute top-0 h-full w-[2px] bg-white/40 z-10 pointer-events-none"
                            style={{ left: `${hoverPosition * 100}%` }}
                        />
                    )}
                </div>

                {/* Hover Preview Tooltip */}
                {hoverPosition !== null && !isDragging && (
                    <div
                        className="absolute -top-[72px] z-30 pointer-events-none transition-opacity"
                        style={{
                            left: `${Math.max(10, Math.min(90, hoverPosition * 100))}%`,
                            transform: 'translateX(-50%)',
                        }}
                    >
                        <div className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-lg px-3 py-2 shadow-[0_10px_30px_rgba(0,0,0,0.6)] min-w-[160px] max-w-[220px]">
                            <div className="text-white font-mono text-xs font-bold mb-1">
                                {formatTime(hoverPosition * duration)}
                            </div>
                            <p className="text-white/60 text-[10px] leading-tight">
                                {getSceneDescription(hoverPosition)}
                            </p>
                        </div>
                        {/* Tooltip Arrow */}
                        <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-black/80 mx-auto" />
                    </div>
                )}
            </div>

            {/* Total Duration */}
            <span className="text-white/50 text-[10px] md:text-xs font-bold font-mono tracking-wider tabular-nums shrink-0">
                {formatTime(duration)}
            </span>
        </div>
    );
}
