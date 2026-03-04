import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "@remix-run/react";
import { ChameleonCanvas } from "~/components/UI/ChameleonCanvas";
import { AIPanel } from "~/components/AIAssistant/AIPanel";
import { TheaterLobby } from "~/components/TheaterLobby/TheaterLobby";

export default function WatchExperience() {
    const { videoId } = useParams();
    const [controlsVisible, setControlsVisible] = useState(true);
    const [isAIOpen, setIsAIOpen] = useState(false);
    const [isTheaterMode, setIsTheaterMode] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Fade out controls after 2.5s of inactivity
    useEffect(() => {
        const resetTimer = () => {
            setControlsVisible(true);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(() => setControlsVisible(false), 2500);
        };

        window.addEventListener('mousemove', resetTimer);
        window.addEventListener('keydown', resetTimer);
        resetTimer();

        return () => {
            window.removeEventListener('mousemove', resetTimer);
            window.removeEventListener('keydown', resetTimer);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    // Simulated handler for when AI wants to seek video
    const handleAISeek = (seconds: number) => {
        console.log(`Seeking video to ${seconds}s`);
        // In a real implementation we would ref the video element and set currentTime
    };

    return (
        <div className="relative w-full h-screen bg-black overflow-hidden select-none">
            {/* Ambient Background for Theater transition */}
            <ChameleonCanvas ambientColor="rgba(59, 130, 246, 0.1)" intensity={isTheaterMode ? 'low' : 'medium'} />

            {/* Immersive Video Player Container. Scales down in theater mode */}
            <div
                className={`absolute inset-0 flex items-center justify-center transition-all duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${isTheaterMode ? 'p-12 md:p-24 scale-[0.85] origin-top' : 'p-0 scale-100'}`}
            >
                <div className={`w-full h-full relative transition-all duration-[800ms] ${isTheaterMode ? 'rounded-[3rem] overflow-hidden shadow-[0_0_100px_rgba(59,130,246,0.3)] ring-1 ring-white/10' : 'rounded-none'}`}>

                    {/* Simulated Video Element */}
                    <img
                        src="https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=2600&auto=format&fit=crop"
                        alt="Immersive Video"
                        className="w-full h-full object-cover"
                    />

                    {/* Gradient Overlay for Controls */}
                    <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 transition-opacity duration-500 pointer-events-none ${controlsVisible || isAIOpen ? 'opacity-100' : 'opacity-0'}`} />

                    {/* Top Controls */}
                    <div className={`absolute top-0 left-0 right-0 p-6 md:p-10 flex justify-between items-start transition-transform duration-500 ${controlsVisible || isAIOpen ? 'translate-y-0' : '-translate-y-full'}`}>
                        <Link
                            to="/"
                            className="w-12 h-12 rounded-full glass-panel flex items-center justify-center text-white hover:bg-white/10 hover:scale-105 active:scale-95 transition-all"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                            </svg>
                        </Link>

                        <div className="flex items-center gap-4">
                            {!isTheaterMode && (
                                <button
                                    onClick={() => setIsTheaterMode(true)}
                                    className="px-6 py-2.5 rounded-full glass-panel flex items-center gap-2 text-white font-bold hover:bg-white/10 hover:shadow-glow-subtle transition-all active:scale-95"
                                >
                                    <svg className="w-5 h-5 text-accent-400 group-hover:animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                    Watch Together
                                </button>
                            )}

                            <button
                                onClick={() => setIsAIOpen(!isAIOpen)}
                                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isAIOpen ? 'bg-accent-500 text-dark-900 shadow-glow-white' : 'glass-panel text-accent-400 hover:bg-white/10 hover:scale-105'} active:scale-95`}
                            >
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Bottom Controls */}
                    <div className={`absolute bottom-0 left-0 right-0 p-6 md:p-10 transition-transform duration-500 ${controlsVisible || isAIOpen ? 'translate-y-0' : 'translate-y-full'}`}>
                        <div className="mb-6">
                            <h1 className="text-3xl md:text-5xl font-display font-bold text-white mb-2 drop-shadow-xl tracking-tight">The Future of Digital Art</h1>
                            <p className="text-dark-300 font-medium tracking-wide">Nexus Channel • 1.2M Views</p>
                        </div>

                        {/* Scrubber Area */}
                        <div className="flex items-center gap-6">
                            <button className="text-white hover:text-primary-400 hover:scale-110 active:scale-95 transition-all">
                                <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                            </button>

                            {/* Glass Timeline */}
                            <div className="flex-1 relative h-3 rounded-full bg-white/20 backdrop-blur-md cursor-pointer group">
                                <div className="absolute top-0 left-0 bottom-0 w-1/3 bg-primary-500 rounded-full shadow-glow-subtle">
                                    <div className="absolute right-0 top-1/2 -mt-2.5 -mr-2.5 w-5 h-5 bg-white rounded-full shadow-minimal opacity-0 group-hover:opacity-100 transition-opacity transform scale-0 group-hover:scale-100" />
                                </div>
                            </div>

                            <span className="text-white text-sm font-bold w-12 shrink-0 tracking-wider">04:20</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* AI Assistant Side Panel */}
            <AIPanel
                isOpen={isAIOpen}
                onClose={() => setIsAIOpen(false)}
                onSeek={handleAISeek}
            />

            {/* Theater Lobby Overlay (If activated) */}
            {isTheaterMode && <TheaterLobby onClose={() => setIsTheaterMode(false)} />}
        </div>
    );
}
