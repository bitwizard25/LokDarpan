import { json, type MetaFunction, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useNavigation, Link } from "@remix-run/react";
import { useState, useRef, useEffect, useCallback } from "react";
import { Layout } from "~/components/Layout/Layout";
import { getUserFromSession } from "~/services/auth.server";
import { getServerApiBaseUrl } from "~/lib/api";
import { ShortsSkeleton } from "~/components/VideoSkeleton/VideoSkeleton";
import { Heart, Comment, Share, MoreVertical, Play, VolumeMute, ChevronLeft } from "~/components/icons";

export const meta: MetaFunction = () => {
    return [{ title: "Shorts - LokDarpan" }];
};

export async function loader({ request }: LoaderFunctionArgs) {
    const userSession = await getUserFromSession(request);
    const base = getServerApiBaseUrl();
    const headers: HeadersInit = userSession ? { Authorization: `Bearer ${userSession.token}` } : {};
    const response = await fetch(`${base}/video?type=short&limit=24`);
    const data = response.ok ? await response.json() : { videos: [] };
    const shorts = await Promise.all((data.videos || []).map(async (video: any) => {
        try {
            const detail = await fetch(`${base}/video/${video.id}`, { headers });
            const full = detail.ok ? (await detail.json()).video : {};
            return { id: video.id, title: video.title, channel: video.channel?.name || 'Creator', likes: full.likes || 0, comments: full.commentCount || 0, color: '#14B8A6', src: full.videoUrl || full.hlsMasterUrl || '' };
        } catch { return { id: video.id, title: video.title, channel: video.channel?.name || 'Creator', likes: 0, comments: 0, color: '#14B8A6', src: '' }; }
    }));
    return json({ user: userSession?.user || null, shorts, error: response.ok ? null : 'Short videos could not be loaded.' });
}

export default function Shorts() {
    const { user, shorts, error } = useLoaderData<typeof loader>();
    const loading = useNavigation().state !== 'idle';
    const [activeIndex, setActiveIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);
    const [isMuted, setIsMuted] = useState(true);
    const containerRef = useRef<HTMLDivElement>(null);
    const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

    // Handle scroll snap detection
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleScroll = () => {
            const index = Math.round(container.scrollTop / container.clientHeight);
            if (index !== activeIndex) {
                setActiveIndex(index);
                setIsPlaying(true); // Auto-play new video
            }
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "ArrowUp") {
                e.preventDefault();
                container.scrollBy({ top: -container.clientHeight, behavior: "smooth" });
            } else if (e.key === "ArrowDown") {
                e.preventDefault();
                container.scrollBy({ top: container.clientHeight, behavior: "smooth" });
            } else if (e.key === " ") { // Spacebar to toggle play
                e.preventDefault();
                setIsPlaying(prev => !prev);
            } else if (e.key === "m") { // M to toggle mute
                setIsMuted(prev => !prev);
            }
        };

        container.addEventListener("scroll", handleScroll);
        window.addEventListener("keydown", handleKeyDown);
        return () => {
            container.removeEventListener("scroll", handleScroll);
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [activeIndex]);

    // Manage Video Playback
    useEffect(() => {
        videoRefs.current.forEach((video, index) => {
            if (!video) return;
            if (index === activeIndex) {
                video.currentTime = 0;
                if (isPlaying) video.play().catch(() => { });
                else video.pause();
            } else {
                video.pause();
            }
            video.muted = isMuted;
        });
    }, [activeIndex, isPlaying, isMuted]);

    const activeColor = shorts[activeIndex]?.color || "#14B8A6";

    if (loading && !shorts.length) return <Layout user={user} hideSidebar><div className="mx-auto max-w-4xl pt-10"><ShortsSkeleton count={3} /></div></Layout>;

    return (
        <Layout user={user} hideSidebar={true}>
            {!shorts.length && <div className="fixed inset-0 z-20 flex items-center justify-center bg-dark-950 p-6 text-center"><div><h1 className="text-2xl font-bold text-white">No Shorts yet</h1><p className="mt-2 text-dark-300">{error || 'Published short videos will appear here.'}</p><Link to="/" className="mt-5 inline-block text-primary-300">Back to home</Link></div></div>}
            <div className="fixed inset-0 pt-16 bg-dark-950 flex justify-center overflow-hidden">
                {/* Ambient Background */}
                <div
                    className="absolute inset-0 opacity-20 transition-colors duration-1000 ease-in-out blur-[100px]"
                    style={{ background: `radial-gradient(circle at center, ${activeColor}, transparent 70%)` }}
                />

                <div className="relative w-full max-w-[450px] h-full flex items-center justify-center">

                    {/* Navigation Hints (Desktop) */}
                    <div className="absolute -right-32 top-1/2 -translate-y-1/2 hidden xl:flex flex-col gap-4 text-dark-400 text-xs items-center">
                        <div className="flex flex-col items-center gap-1">
                            <kbd className="px-2 py-1 bg-white/10 rounded border border-white/10 font-sans">↑</kbd>
                            <kbd className="px-2 py-1 bg-white/10 rounded border border-white/10 font-sans">↓</kbd>
                            <span>Scroll</span>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                            <kbd className="px-2 py-1 bg-white/10 rounded border border-white/10 font-sans">Space</kbd>
                            <span>Play/Pause</span>
                        </div>
                    </div>

                    {/* Scroll Container */}
                    <div
                        ref={containerRef}
                        className="w-full h-[calc(100vh-80px)] overflow-y-scroll snap-y snap-mandatory scrollbar-hide rounded-2xl relative bg-black shadow-2xl"
                    >
                        {shorts.map((short, index) => (
                            <div
                                key={short.id}
                                className="w-full h-full snap-start relative flex items-center justify-center bg-dark-900 border-b border-dark-950"
                                onClick={() => setIsPlaying(p => !p)}
                            >
                                {/* Video Player / Placeholder */}
                                <div className="absolute inset-0 bg-dark-800 flex items-center justify-center overflow-hidden">
                                    {short.src ? (
                                        <video
                                            ref={el => videoRefs.current[index] = el}
                                            src={short.src}
                                            className="w-full h-full object-cover"
                                            loop
                                            playsInline
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center relative">
                                            <div className="absolute inset-0 opacity-30" style={{ backgroundColor: short.color }} />
                                            <span className="text-white/20 font-display text-4xl font-bold uppercase tracking-widest z-10">
                                                Video is processing
                                            </span>
                                        </div>
                                    )}

                                    <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/80 pointer-events-none" />

                                    {/* Play/Pause Icon Overlay */}
                                    {!isPlaying && index === activeIndex && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
                                            <Play size={64} className="text-white/80" />
                                        </div>
                                    )}

                                    {/* Mute Indicator */}
                                    {isMuted && (
                                        <div className="absolute top-4 right-4 p-2.5 bg-black/40 rounded-full backdrop-blur pointer-events-none">
                                            <VolumeMute size={20} className="text-white" />
                                        </div>
                                    )}
                                </div>

                                {/* Content Overlay (Bottom) */}
                                <div className="absolute bottom-0 left-0 right-0 p-6 flex items-end gap-4 pointer-events-none">
                                    <div className="flex-1 pointer-events-auto">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur flex items-center justify-center text-white font-bold text-sm border border-white/20">
                                                {short.channel[0]}
                                            </div>
                                            <span className="font-bold text-white drop-shadow-md truncate max-w-[150px]">{short.channel}</span>
                                            <button
                                                className="px-4 py-1.5 bg-white text-black text-xs font-bold rounded-full hover:bg-gray-200 hover:scale-105 transition-all shadow-lg active:scale-95"
                                                onClick={(e) => { e.stopPropagation(); alert(`Subscribed to ${short.channel}`); }}
                                            >
                                                Subscribe
                                            </button>
                                        </div>
                                        <h2 className="text-white text-lg font-medium leading-tight drop-shadow-md mb-2 line-clamp-2">
                                            {short.title}
                                        </h2>
                                        <div className="flex items-center gap-2 text-white/80 text-xs">
                                            <span className="w-2 h-2 rounded-full bg-primary-400 animate-ping" />
                                            <span className="truncate max-w-[200px]">Original Sound - {short.channel}</span>
                                        </div>
                                    </div>

                                    {/* Actions Sidebar (Right) */}
                                    <div className="flex flex-col gap-6 items-center pb-4 pointer-events-auto">
                                        <ActionButton icon="heart" count={short.likes} active={false} />
                                        <ActionButton icon="message" count={short.comments} />
                                        <ActionButton icon="share" label="Share" />
                                        <button aria-label="More options" className="w-10 h-10 rounded-full bg-dark-800/60 backdrop-blur-sm flex items-center justify-center text-white hover:bg-dark-700 transition-colors active:scale-90">
                                            <MoreVertical size={20} />
                                        </button>
                                        <div className="w-10 h-10 rounded-lg bg-dark-800 border-2 border-white/20 overflow-hidden animate-spin-slow shadow-lg">
                                            <div className="w-full h-full bg-gradient-to-tr from-primary-500 to-accent-500" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Return to Feed */}
                <Link to="/" className="fixed top-20 left-4 z-50 px-4 py-2 bg-black/40 backdrop-blur-md rounded-full text-white text-xs font-medium hover:bg-white/10 transition-all border border-white/5 flex items-center gap-2 group active:scale-95">
                    <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    Back to Feed
                </Link>
            </div>
        </Layout>
    );
}

function ActionButton({ icon, count, label, active: initialActive }: { icon: string, count?: number | string, label?: string, active?: boolean }) {
    const [isActive, setIsActive] = useState(initialActive);
    const [scale, setScale] = useState(1);

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsActive(!isActive);
        setScale(1.08); // Fluid bounce effect (as recommended by UI/UX audit)
        setTimeout(() => setScale(1), 160);
    };

    return (
        <button
            type="button"
            aria-pressed={icon === "heart" ? isActive : undefined}
            aria-label={label || (icon === "heart" ? (isActive ? "Unlike" : "Like") : icon)}
            className="flex flex-col items-center gap-1 group"
            onClick={handleClick}
        >
            <div
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${isActive ? 'bg-red-500 text-white shadow-glow-subtle' : 'bg-dark-800/60 backdrop-blur-sm text-white hover:bg-dark-700'}`}
                style={{ transform: `scale(${scale})` }}
            >
                {icon === "heart" && <Heart size={24} variant={isActive ? "filled" : "outline"} />}
                {icon === "message" && <Comment size={24} />}
                {icon === "share" && <Share size={24} />}
            </div>
            {(count || label) && <span className="text-white text-xs font-semibold drop-shadow-md">{formatCount(count)}</span>}
        </button>
    );
}

function formatCount(count?: number | string) {
    if (!count) return "";
    if (typeof count === 'string') return count;
    if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M';
    if (count >= 1000) return (count / 1000).toFixed(1) + 'K';
    return count.toString();
}
