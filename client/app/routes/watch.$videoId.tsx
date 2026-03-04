import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "@remix-run/react";
import { ChameleonCanvas } from "~/components/UI/ChameleonCanvas";
import { AIPanel } from "~/components/AIAssistant/AIPanel";
import { AvatarStack } from "~/components/TheaterLobby/AvatarStack";
import { SemanticScrubber } from "~/components/VideoPlayer/SemanticScrubber";
import { useAppStore } from "~/store/useAppStore";

export default function WatchExperience() {
    const { videoId } = useParams();
    const [controlsVisible, setControlsVisible] = useState(true);
    const { isAIOpen, setAIOpen: setIsAIOpen, isTheaterMode, setTheaterMode: setIsTheaterMode, setTheaterLobbyOpen } = useAppStore();
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
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

    const handleFullscreen = () => {
        if (!containerRef.current) return;
        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            });
        } else {
            document.exitFullscreen();
        }
    };

    return (
        <div className="min-h-screen bg-dark-950 w-full relative overflow-x-hidden pt-16 md:pt-24 pb-20">
            {/* Ambient Background for Cinematic Glow */}
            <div className={`absolute inset-0 h-[80vh] pointer-events-none transition-opacity duration-1000 ${isTheaterMode ? 'opacity-30' : 'opacity-100'}`}>
                <ChameleonCanvas ambientColor="rgba(59, 130, 246, 0.15)" intensity={isTheaterMode ? 'low' : 'high'} />
            </div>

            {/* Immersive Video Player Container. Adapts to AI panel and Theater Mode */}
            <div
                className={`relative w-full transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] z-10 mx-auto
                    ${isAIOpen ? 'md:w-[70%] md:mr-auto md:ml-4 lg:ml-8' : 'max-w-7xl'}
                    ${isTheaterMode ? 'scale-[0.85] origin-top' : 'md:px-6 lg:px-8'}
                `}
            >
                {/* 1. The Video Container (The "Floating Canvas") */}
                <div
                    ref={containerRef}
                    className={`w-full aspect-video relative transition-all duration-700 bg-black flex mx-auto
                    ${isTheaterMode
                            ? 'rounded-[3rem] overflow-hidden shadow-[0_0_100px_rgba(59,130,246,0.3)] ring-1 ring-white/10'
                            : document.fullscreenElement ? 'rounded-none' : 'rounded-none md:rounded-3xl overflow-hidden ring-1 ring-white/5 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)]'
                        }
                `}>

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

                    {/* Gradient Overlay for the top only (to make header legible) */}
                    <div className={`absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/80 to-transparent transition-opacity duration-300 pointer-events-none ${controlsVisible || isAIOpen ? 'opacity-100' : 'opacity-0'}`} />

                    {/* Top Controls */}
                    <div className={`absolute top-0 left-0 right-0 p-4 md:p-8 flex justify-between items-start transition-all duration-300 ease-out z-20 ${controlsVisible || isAIOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
                        <div className="flex items-center gap-4 relative z-10 w-24">
                            <Link
                                to="/"
                                className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/10 hover:scale-105 active:scale-95 transition-all shadow-glow-sm"
                            >
                                <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
                                </svg>
                            </Link>
                        </div>

                        {/* Center Logo - Flat Luminous SVG */}
                        <div className="absolute inset-x-0 top-0 pt-6 md:pt-10 flex justify-center pointer-events-none z-0">
                            <Link to="/" className="flex items-center gap-1 select-none pointer-events-auto group transition-opacity">
                                {/* LOK */}
                                <span className="text-white font-black tracking-[0.2em] text-2xl md:text-3xl font-sans drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] group-hover:text-white/80 transition-colors">
                                    LOK
                                </span>

                                {/* The 'D' with the Play Button inside */}
                                <div className="relative flex items-center justify-center drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                                    <span className="text-white font-black tracking-[0.2em] text-2xl md:text-3xl font-sans group-hover:text-white/80 transition-colors">
                                        D
                                    </span>
                                    {/* Tiny Play Triangle cutting out of the D */}
                                    <div className="absolute left-[30%] w-0 h-0 border-t-[5px] md:border-t-[6px] border-t-transparent border-l-[6px] md:border-l-[10px] border-l-[#0A0A0B] border-b-[5px] md:border-b-[6px] border-b-transparent"></div>
                                </div>

                                {/* ARPAN */}
                                <span className="text-white font-black tracking-[0.2em] text-2xl md:text-3xl font-sans drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] group-hover:text-white/80 transition-colors">
                                    ARPAN
                                </span>
                            </Link>
                        </div>

                        <div className="flex items-center gap-4 relative z-10 w-24 justify-end">
                            {!isTheaterMode && (
                                <button
                                    onClick={() => {
                                        setIsTheaterMode(true);
                                        setTheaterLobbyOpen(true);
                                    }}
                                    className="px-4 py-2 md:px-6 md:py-2.5 rounded-full bg-black/40 backdrop-blur-md flex items-center gap-2 text-white font-bold hover:bg-white/10 hover:shadow-glow-subtle transition-all active:scale-95 text-xs md:text-sm"
                                >
                                    <svg className="w-4 h-4 md:w-5 md:h-5 text-accent-400 group-hover:animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                    <span className="hidden md:inline">Theater</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* 2. The Auto-Hiding Glass Controls */}
                    {/* Bottom Floating Control Pill */}
                    <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 w-[90%] md:w-[70%] max-w-3xl rounded-full bg-white/5 border border-white/10 backdrop-blur-lg px-4 md:px-6 py-3 flex items-center gap-4 md:gap-6 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] shadow-[0_10px_40px_rgba(0,0,0,0.5)] z-20 ${controlsVisible || isAIOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>

                        <button className="text-white hover:text-primary-400 hover:scale-110 active:scale-90 transition-all outline-none shrink-0 group">
                            <svg className="w-8 h-8 md:w-10 md:h-10 fill-current drop-shadow-md" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                        </button>

                        <SemanticScrubber videoRef={videoRef} />

                        <div className="flex items-center gap-3 shrink-0">
                            {/* AI Trigger (Sparkle) */}
                            <button
                                onClick={() => setIsAIOpen(!isAIOpen)}
                                className={`w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full transition-all outline-none border ${isAIOpen ? 'bg-accent-500/20 text-accent-400 border-accent-500/50 shadow-glow-sm scale-110' : 'bg-transparent text-white/90 border-transparent hover:bg-white/10 hover:text-accent-400 hover:scale-110'} active:scale-90 relative`}
                                title="Deep Dive AI"
                            >
                                <div className={`absolute inset-0 rounded-full bg-accent-500/20 blur-md transition-opacity duration-300 ${isAIOpen ? 'opacity-100' : 'opacity-0'}`}></div>
                                <svg className={`w-5 h-5 md:w-6 md:h-6 relative z-10 ${isAIOpen ? 'animate-pulse' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                </svg>
                            </button>

                            <button onClick={handleFullscreen} className="text-white/80 hover:text-white transition-colors outline-none shrink-0 hover:scale-110 active:scale-90">
                                <svg className="w-5 h-5 md:w-6 md:h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" /></svg>
                            </button>
                        </div>
                    </div>
                </div>

                {/* 3. The Metadata & Kinetic Actions (Below the Player) */}
                <div className={`mt-6 md:mt-8 px-4 md:px-0 transition-opacity duration-500 ${isTheaterMode ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100'}`}>
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                        <div className="flex-1 min-w-0">
                            <h1 className="font-display font-extrabold text-2xl md:text-3xl text-white mb-3 tracking-tight">Tears of Steel: The Blender Foundation Epic</h1>

                            <div className="flex items-center gap-4">
                                <Link to="/channel/blender" className="w-12 h-12 rounded-full bg-dark-800 border border-white/10 overflow-hidden hover:ring-2 hover:ring-primary-500/50 transition-all shrink-0">
                                    <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200" alt="Creator" className="w-full h-full object-cover" />
                                </Link>
                                <div>
                                    <Link to="/channel/blender">
                                        <h3 className="font-medium text-white/90 text-lg hover:text-white transition-colors">Blender Studio</h3>
                                    </Link>
                                    <p className="text-sm font-medium text-white/70">1.2M subscribers</p>
                                </div>
                            </div>
                        </div>

                        {/* Action Pill (Sleek frosted glass) */}
                        <div className="flex items-center bg-white/5 backdrop-blur-xl border border-white/10 rounded-full p-1 shadow-glow-sm shrink-0 mt-4 md:mt-0 self-start w-full md:w-auto overflow-x-auto scrollbar-hide">
                            <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-full hover:bg-white/10 transition-all active:scale-90 hover:scale-[1.05] text-white font-medium group">
                                <svg className="w-5 h-5 group-hover:text-primary-400 group-hover:scale-110 transition-all drop-shadow-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                                </svg>
                                12K
                            </button>
                            <div className="w-px h-6 bg-white/10 mx-1"></div>
                            <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-full hover:bg-white/10 transition-all active:scale-90 hover:scale-[1.05] text-white font-medium group">
                                <svg className="w-5 h-5 group-hover:text-accent-400 group-hover:scale-110 transition-all drop-shadow-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                </svg>
                                Share
                            </button>
                            <div className="w-px h-6 bg-white/10 mx-1"></div>
                            <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-full hover:bg-white/10 transition-all active:scale-90 hover:scale-[1.05] text-white font-medium group text-nowrap">
                                <svg className="w-5 h-5 group-hover:text-primary-400 group-hover:scale-110 transition-all drop-shadow-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                </svg>
                                Save
                            </button>
                        </div>
                    </div>

                    {/* Description - Simplified for minimal clutter */}
                    <div className="mt-6 bg-white/5 backdrop-blur-sm border border-white/5 rounded-2xl p-4 md:p-6 text-sm text-white/80 leading-relaxed max-w-4xl hover:bg-white/10 transition-colors cursor-pointer">
                        <p className="line-clamp-2">
                            Tears of Steel was realized with crowd-funding by users of the open source 3D creation tool Blender. Target was to improve and test a complete open and free pipeline for visual effects in film.
                        </p>
                        <span className="font-medium text-white mt-2 block hover:underline">Show more</span>
                    </div>
                </div>
            </div>

            {/* AI Assistant Side Panel */}
            <AIPanel
                isOpen={isAIOpen}
                onClose={() => setIsAIOpen(false)}
                onSeek={handleAISeek}
            />

            {/* Persistent Social Overlay (Bottom-Left) */}
            <AvatarStack />
        </div>
    );
}
