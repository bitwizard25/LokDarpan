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
    const videoRef = useRef<HTMLVideoElement>(null);
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
        window.addEventListener('touchstart', resetTimer);
        resetTimer();

        return () => {
            window.removeEventListener('mousemove', resetTimer);
            window.removeEventListener('keydown', resetTimer);
            window.removeEventListener('touchstart', resetTimer);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    const handleAISeek = (seconds: number) => {
        if (videoRef.current) {
            videoRef.current.currentTime = seconds;
            videoRef.current.play().catch(e => console.log("Auto-play prevented", e));
        }
    };

    return (
        <div className="relative w-full h-screen bg-black overflow-hidden select-none">
            {/* Ambient Background for Theater transition */}
            <ChameleonCanvas ambientColor="rgba(59, 130, 246, 0.1)" intensity={isTheaterMode ? 'low' : 'medium'} />

            {/* Immersive Video Player Container. Adapts to AI panel and Theater Mode */}
            <div
                className={`absolute inset-0 flex items-center justify-center transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] z-10 ${isTheaterMode
                        ? 'p-12 md:p-24 scale-[0.85] origin-top'
                        : isAIOpen
                            ? 'p-0 md:py-6 md:pl-6 md:pr-[424px]' // 400px panel + 24px padding = 424px
                            : 'p-0 md:p-6'
                    }`}
            >
                <div className={`w-full h-full relative transition-all duration-700 bg-dark-950 flex shadow-2xl ${isTheaterMode
                        ? 'rounded-[3rem] overflow-hidden shadow-[0_0_100px_rgba(59,130,246,0.3)] ring-1 ring-white/10'
                        : 'rounded-none md:rounded-3xl overflow-hidden ring-1 ring-white/5'
                    }`}>

                    {/* Actual Video Element */}
                    <video
                        ref={videoRef}
                        src="http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4"
                        className="w-full h-full object-cover"
                        autoPlay
                        loop
                        playsInline
                        muted
                    />

                    {/* Gradient Overlay for the top only (to make back button legible) */}
                    <div className={`absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/80 to-transparent transition-opacity duration-300 pointer-events-none ${controlsVisible || isAIOpen ? 'opacity-100' : 'opacity-0'}`} />

                    {/* Top Controls */}
                    <div className={`absolute top-0 left-0 right-0 p-6 md:p-8 flex justify-between items-start transition-all duration-300 ease-out ${controlsVisible || isAIOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
                        <div className="flex items-center gap-4">
                            <Link
                                to="/"
                                className="w-12 h-12 rounded-full glass-panel flex items-center justify-center text-white hover:bg-white/10 hover:scale-105 active:scale-95 transition-all shadow-glow-sm"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                                </svg>
                            </Link>
                            <div className="hidden md:block">
                                <h1 className="text-xl font-bold text-white drop-shadow-md">The Immersive Cinema</h1>
                                <p className="text-white/70 text-sm">Nexus Channel</p>
                            </div>
                        </div>

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
                        </div>
                    </div>

                    {/* Bottom Floating Control Pill */}
                    <div className={`absolute bottom-6 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-[80%] max-w-4xl rounded-3xl md:rounded-full bg-white/5 border border-white/10 backdrop-blur-md px-4 md:px-8 py-4 flex flex-col md:flex-row items-center gap-4 transition-all duration-300 ease-out shadow-2xl z-20 ${controlsVisible || isAIOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>

                        <div className="flex items-center gap-4 w-full md:w-auto shrink-0 justify-between md:justify-start">
                            <button className="text-white hover:text-primary-400 hover:scale-110 active:scale-95 transition-all outline-none">
                                <svg className="w-8 h-8 md:w-10 md:h-10 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                            </button>
                            <span className="text-white/90 text-xs font-bold font-mono tracking-wider tabular-nums">04:20 / 12:00</span>
                        </div>

                        {/* Glass Timeline */}
                        <div className="w-full flex-1 relative h-2 md:h-2.5 rounded-full bg-white/10 backdrop-blur-sm cursor-pointer group flex items-center">
                            <div className="absolute left-0 h-full w-1/3 bg-primary-500 rounded-full shadow-glow-subtle transition-all">
                                <div className="absolute right-0 top-1/2 -mt-2.5 -mr-2.5 w-5 h-5 bg-white rounded-full shadow-minimal opacity-0 group-hover:opacity-100 transition-opacity transform scale-0 group-hover:scale-100" />
                            </div>
                        </div>

                        <div className="flex items-center gap-4 w-full md:w-auto justify-end shrink-0">
                            <button className="text-white/80 hover:text-white transition-colors outline-none shrink-0 hidden md:block">
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" /></svg>
                            </button>

                            {/* AI Trigger */}
                            <button
                                onClick={() => setIsAIOpen(!isAIOpen)}
                                className={`flex items-center justify-center gap-2 px-4 py-2 rounded-full transition-all outline-none border ${isAIOpen ? 'bg-accent-500/20 text-accent-400 border-accent-500/50 shadow-glow-sm' : 'bg-white/5 text-white/90 border-transparent hover:bg-white/10 hover:text-accent-400 hover:border-accent-500/30'} active:scale-95`}
                            >
                                <svg className={`w-5 h-5 ${isAIOpen ? 'animate-pulse' : ''}`} fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                                </svg>
                                <span className="font-bold text-sm tracking-wide hidden md:block">Nexus AI</span>
                            </button>

                            <button className="text-white/80 hover:text-white transition-colors outline-none shrink-0">
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" /></svg>
                            </button>
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
