import React, { useState, useEffect, useRef } from "react";
import {
  Home,
  Explore,
  Trending,
  Shorts,
  Following,
  Library,
  Theater,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  VolumeHigh,
  VolumeMute,
  Fullscreen,
  ExitFullscreen,
  SettingsGear,
  CaptionsCC,
  PictureInPicture,
  Heart,
  Comment,
  Share,
  Bookmark,
  MoreVertical,
  Search,
  Plus,
  Notifications,
  Music,
  Gaming,
  Film,
  LiveCamera,
} from "~/components/icons";

export function FluidIconShowcase() {
  const [activeTab, setActiveTab] = useState<string>("home");
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isLiked, setIsLiked] = useState<boolean>(true);
  const [likeCount, setLikeCount] = useState<number>(14200);
  const [isBookmarked, setIsBookmarked] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(42);
  const [isAutoPlayDemo, setIsAutoPlayDemo] = useState<boolean>(true);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number; clicking: boolean; visible: boolean }>({
    x: 80,
    y: 120,
    clicking: false,
    visible: true,
  });

  // Automated Stageshow Choreography Loop
  useEffect(() => {
    if (!isAutoPlayDemo) {
      setCursorPos((prev) => ({ ...prev, visible: false }));
      return;
    }

    let isMounted = true;
    let timer: NodeJS.Timeout;

    const runScript = async () => {
      const wait = (ms: number) => new Promise((res) => (timer = setTimeout(res, ms)));

      while (isMounted && isAutoPlayDemo) {
        // Step 1: Cursor starts near Home, hovers over Explore
        setCursorPos({ x: 90, y: 130, clicking: false, visible: true });
        await wait(900);
        if (!isMounted) break;

        // Step 2: Move down to Shorts nav item
        setCursorPos({ x: 90, y: 220, clicking: false, visible: true });
        await wait(600);
        if (!isMounted) break;

        // Click Shorts
        setCursorPos({ x: 90, y: 220, clicking: true, visible: true });
        setActiveTab("shorts");
        await wait(220);
        setCursorPos({ x: 90, y: 220, clicking: false, visible: true });
        await wait(800);
        if (!isMounted) break;

        // Step 3: Move cursor to the floating Heart icon
        setCursorPos({ x: 620, y: 180, clicking: false, visible: true });
        await wait(800);
        if (!isMounted) break;

        // Click Heart (triggers fluid bounce)
        setCursorPos({ x: 620, y: 180, clicking: true, visible: true });
        setIsLiked((prev) => {
          const next = !prev;
          setLikeCount((c) => (next ? c + 1 : c - 1));
          return next;
        });
        await wait(200);
        setCursorPos({ x: 620, y: 180, clicking: false, visible: true });
        await wait(1000);
        if (!isMounted) break;

        // Step 4: Move to video player Play/Pause button
        setCursorPos({ x: 260, y: 355, clicking: false, visible: true });
        await wait(900);
        if (!isMounted) break;

        // Click Pause
        setCursorPos({ x: 260, y: 355, clicking: true, visible: true });
        setIsPlaying((p) => !p);
        await wait(220);
        setCursorPos({ x: 260, y: 355, clicking: false, visible: true });
        await wait(1200);
        if (!isMounted) break;

        // Step 5: Move to Volume Mute icon
        setCursorPos({ x: 380, y: 355, clicking: false, visible: true });
        await wait(700);
        if (!isMounted) break;

        // Click Mute
        setCursorPos({ x: 380, y: 355, clicking: true, visible: true });
        setIsMuted((m) => !m);
        await wait(200);
        setCursorPos({ x: 380, y: 355, clicking: false, visible: true });
        await wait(900);
        if (!isMounted) break;

        // Step 6: Return to Home
        setCursorPos({ x: 90, y: 88, clicking: false, visible: true });
        await wait(900);
        if (!isMounted) break;
        setCursorPos({ x: 90, y: 88, clicking: true, visible: true });
        setActiveTab("home");
        await wait(200);
        setCursorPos({ x: 90, y: 88, clicking: false, visible: true });
        await wait(1500);
      }
    };

    runScript();

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [isAutoPlayDemo]);

  // Scrubber simulator
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setProgress((p) => (p >= 100 ? 0 : p + 0.5));
    }, 400);
    return () => clearInterval(interval);
  }, [isPlaying]);

  return (
    <section className="relative w-full max-w-5xl mx-auto my-12 p-4 md:p-8 rounded-3xl bg-dark-950/80 border border-white/10 backdrop-blur-2xl shadow-2xl overflow-hidden">
      {/* Top Banner with Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-primary-400 animate-pulse" />
            <h2 className="text-xl md:text-2xl font-display font-bold text-white tracking-tight">
              Stageshow: Fluid Custom Icon System
            </h2>
          </div>
          <p className="text-xs md:text-sm text-dark-400 mt-1">
            Bespoke 1.75px SVG icons crafted for LokDarpan with fluid physics, active highlights, and micro-interactions.
          </p>
        </div>

        {/* Demo Mode Toggle */}
        <div className="flex items-center gap-2 bg-dark-900/90 border border-white/10 p-1.5 rounded-full text-xs">
          <button
            type="button"
            onClick={() => setIsAutoPlayDemo(true)}
            className={`px-3 py-1.5 rounded-full font-medium transition-all ${
              isAutoPlayDemo
                ? "bg-primary-500 text-white shadow-glow-subtle font-semibold"
                : "text-dark-400 hover:text-white"
            }`}
          >
            Auto Walkthrough
          </button>
          <button
            type="button"
            onClick={() => setIsAutoPlayDemo(false)}
            className={`px-3 py-1.5 rounded-full font-medium transition-all ${
              !isAutoPlayDemo
                ? "bg-primary-500 text-white shadow-glow-subtle font-semibold"
                : "text-dark-400 hover:text-white"
            }`}
          >
            Manual Playground
          </button>
        </div>
      </div>

      {/* The Miniature Product Window (Stageshow Frame) */}
      <div className="relative w-full rounded-2xl bg-dark-900/90 border border-white/15 shadow-minimal overflow-hidden select-none">
        {/* Window Chrome / Titlebar */}
        <div className="h-10 px-4 bg-dark-950/90 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-yellow-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-green-500/80 inline-block" />
          </div>

          <div className="px-4 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] text-dark-300 font-mono tracking-wider flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            lokdarpan.tv/cinematic
          </div>

          <div className="w-12 flex justify-end">
            <span className="text-dark-500 text-xs font-mono">24×24</span>
          </div>
        </div>

        {/* Window Interior Grid */}
        <div className="flex min-h-[460px]">
          {/* Left Mini Sidebar */}
          <div className="w-52 p-3 border-r border-white/10 bg-dark-950/40 flex flex-col gap-1">
            <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-dark-500 font-display">
              Navigation
            </div>

            {[
              { id: "home", label: "Home", Icon: Home },
              { id: "explore", label: "Explore", Icon: Explore },
              { id: "trending", label: "Trending", Icon: Trending },
              { id: "shorts", label: "Shorts", Icon: Shorts },
              { id: "following", label: "Following", Icon: Following },
              { id: "library", label: "Library", Icon: Library },
            ].map(({ id, label, Icon }) => {
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setIsAutoPlayDemo(false);
                    setActiveTab(id);
                  }}
                  className={`relative h-11 px-3 rounded-xl flex items-center gap-3 text-sm transition-all duration-200 ${
                    active
                      ? "bg-white/10 text-white font-semibold shadow-sm"
                      : "text-dark-400 hover:text-white hover:bg-white/5 font-medium"
                  }`}
                >
                  {active && (
                    <span className="absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-r-full bg-primary-400 shadow-glow-subtle" />
                  )}
                  <Icon
                    size={22}
                    variant={active ? "filled" : "outline"}
                    className="transition-transform duration-150 active:scale-90"
                  />
                  <span>{label}</span>
                </button>
              );
            })}

            <div className="mt-auto pt-3 border-t border-white/10">
              <div className="flex items-center gap-2 px-3 py-2 text-xs text-primary-300 bg-primary-500/10 border border-primary-500/20 rounded-xl">
                <Theater size={18} variant="outline" />
                <span>Theater Mode</span>
              </div>
            </div>
          </div>

          {/* Center Stage & Player */}
          <div className="flex-1 p-5 flex flex-col gap-4 bg-gradient-to-b from-dark-900/60 to-dark-950/80">
            {/* Top Mock Header */}
            <div className="flex items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search size={16} className="absolute left-3.5 top-2.5 text-dark-400 pointer-events-none" />
                <input
                  type="text"
                  readOnly
                  placeholder="Search 4K HDR live streams..."
                  className="w-full h-9 pl-10 pr-3 rounded-full bg-white/5 border border-white/10 text-xs text-white placeholder-dark-500 outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="h-8 px-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center gap-1.5 text-xs text-white transition-all active:scale-95"
                >
                  <Plus size={14} />
                  <span>Create</span>
                </button>
                <button
                  type="button"
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white transition-all active:scale-95"
                >
                  <Notifications size={16} />
                </button>
              </div>
            </div>

            {/* Cinematic Video Card & Controls */}
            <div className="relative flex-1 rounded-2xl overflow-hidden border border-white/15 bg-black flex flex-col justify-between group">
              {/* Ambient Glow */}
              <div
                className="absolute inset-0 opacity-40 blur-3xl pointer-events-none transition-all duration-700"
                style={{
                  background:
                    activeTab === "shorts"
                      ? "radial-gradient(circle at 60% 50%, #EF4444 0%, transparent 60%)"
                      : "radial-gradient(circle at 50% 40%, #3B82F6 0%, transparent 65%)",
                }}
              />

              {/* Center Playhead Overlay */}
              <div className="relative z-10 flex-1 flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsAutoPlayDemo(false);
                    setIsPlaying((p) => !p);
                  }}
                  className="w-16 h-16 rounded-full bg-black/40 border border-white/20 backdrop-blur-md flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-all shadow-glow-white"
                >
                  {isPlaying ? <Pause size={28} /> : <Play size={28} />}
                </button>
              </div>

              {/* Floating Shorts Action Bar (Right side) */}
              <div className="absolute right-4 bottom-20 z-20 flex flex-col gap-3 items-center">
                {/* Heart Button with fluid bounce */}
                <button
                  type="button"
                  onClick={() => {
                    setIsAutoPlayDemo(false);
                    setIsLiked((prev) => {
                      const next = !prev;
                      setLikeCount((c) => (next ? c + 1 : c - 1));
                      return next;
                    });
                  }}
                  className={`w-11 h-11 rounded-full flex flex-col items-center justify-center backdrop-blur-md border border-white/15 transition-all duration-200 active:scale-90 ${
                    isLiked
                      ? "bg-red-500 text-white shadow-lg shadow-red-500/30 scale-105"
                      : "bg-dark-800/80 text-white hover:bg-dark-700"
                  }`}
                >
                  <Heart size={20} variant={isLiked ? "filled" : "outline"} />
                </button>
                <span className="text-[10px] font-semibold text-white/90 drop-shadow">
                  {(likeCount / 1000).toFixed(1)}k
                </span>

                {/* Comment Button */}
                <button
                  type="button"
                  className="w-11 h-11 rounded-full bg-dark-800/80 hover:bg-dark-700 text-white backdrop-blur-md border border-white/15 flex items-center justify-center transition-all active:scale-90"
                >
                  <Comment size={20} />
                </button>

                {/* Share Button */}
                <button
                  type="button"
                  className="w-11 h-11 rounded-full bg-dark-800/80 hover:bg-dark-700 text-white backdrop-blur-md border border-white/15 flex items-center justify-center transition-all active:scale-90"
                >
                  <Share size={20} />
                </button>

                {/* Bookmark Button */}
                <button
                  type="button"
                  onClick={() => {
                    setIsAutoPlayDemo(false);
                    setIsBookmarked((b) => !b);
                  }}
                  className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-md border border-white/15 transition-all active:scale-90 ${
                    isBookmarked
                      ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20"
                      : "bg-dark-800/80 text-white hover:bg-dark-700"
                  }`}
                >
                  <Bookmark size={20} variant={isBookmarked ? "filled" : "outline"} />
                </button>

                {/* More Options */}
                <button
                  type="button"
                  className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white/80 flex items-center justify-center transition-all"
                >
                  <MoreVertical size={16} />
                </button>
              </div>

              {/* Bottom Video Player Scrub & Control Bar */}
              <div className="relative z-10 px-4 py-2.5 bg-gradient-to-t from-dark-950 via-dark-950/80 to-transparent flex flex-col gap-2">
                {/* Scrubber Bar */}
                <div
                  className="relative w-full h-1.5 hover:h-2 bg-white/20 rounded-full cursor-pointer transition-all overflow-hidden"
                  onClick={(e) => {
                    setIsAutoPlayDemo(false);
                    const rect = e.currentTarget.getBoundingClientRect();
                    const clickX = e.clientX - rect.left;
                    setProgress(Math.round((clickX / rect.width) * 100));
                  }}
                >
                  <div
                    className="h-full bg-primary-400 rounded-full transition-all duration-150"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                {/* Control Icons Row */}
                <div className="flex items-center justify-between text-white text-xs">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIsPlaying((p) => !p)}
                      className="p-1 hover:text-primary-300 transition-colors active:scale-90"
                    >
                      {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setProgress((p) => Math.max(0, p - 10))}
                      className="p-1 text-dark-300 hover:text-white transition-colors active:scale-90"
                    >
                      <SkipBack size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setProgress((p) => Math.min(100, p + 10))}
                      className="p-1 text-dark-300 hover:text-white transition-colors active:scale-90"
                    >
                      <SkipForward size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsMuted((m) => !m)}
                      className="p-1 text-dark-300 hover:text-white transition-colors active:scale-90"
                    >
                      {isMuted ? <VolumeMute size={18} /> : <VolumeHigh size={18} />}
                    </button>
                    <span className="text-[11px] text-dark-400 font-mono">
                      02:{Math.floor(progress * 0.6).toString().padStart(2, "0")} / 05:40
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-dark-300">
                    <button type="button" className="p-1 hover:text-white transition-colors">
                      <CaptionsCC size={18} />
                    </button>
                    <button type="button" className="p-1 hover:text-white transition-colors">
                      <PictureInPicture size={18} />
                    </button>
                    <button type="button" className="p-1 hover:text-white transition-colors">
                      <SettingsGear size={18} />
                    </button>
                    <button type="button" className="p-1 hover:text-white transition-colors">
                      <Fullscreen size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Category Ribbon */}
            <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-hide">
              {[
                { label: "Live Cinema", Icon: LiveCamera },
                { label: "Original Music", Icon: Music },
                { label: "AAA Gaming", Icon: Gaming },
                { label: "Documentary", Icon: Film },
              ].map(({ label, Icon }) => (
                <button
                  key={label}
                  type="button"
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center gap-2 text-xs text-dark-200 transition-all shrink-0 active:scale-95"
                >
                  <Icon size={16} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Animated Stageshow Cursor (Choreographed Pointer) */}
        {cursorPos.visible && (
          <div
            className="absolute z-50 pointer-events-none transition-all duration-500 ease-out"
            style={{
              left: `${cursorPos.x}px`,
              top: `${cursorPos.y}px`,
              transform: `translate(-2px, -2px) scale(${cursorPos.clicking ? 0.85 : 1})`,
            }}
          >
            {/* Smooth SVG Cursor */}
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              className="drop-shadow-lg"
            >
              <path
                d="M5.5 3.5l11.5 11.5h-5.5l-3 6.5-2.5-1 3-6.5-3.5-0.5z"
                fill="#3B82F6"
                stroke="#FFFFFF"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
            {cursorPos.clicking && (
              <span className="absolute -left-1 -top-1 w-6 h-6 rounded-full bg-primary-400/40 animate-ping pointer-events-none" />
            )}
          </div>
        )}
      </div>

      {/* Feature Pills under window */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
        <div className="p-3 rounded-xl bg-dark-900/60 border border-white/10">
          <span className="text-primary-400 font-semibold text-xs block mb-1">1.75px Consistent Weight</span>
          <p className="text-[11px] text-dark-400">Zero disappearing strokes on OLED dark backgrounds.</p>
        </div>
        <div className="p-3 rounded-xl bg-dark-900/60 border border-white/10">
          <span className="text-primary-400 font-semibold text-xs block mb-1">Outline → Filled States</span>
          <p className="text-[11px] text-dark-400">Smooth negative space cutouts with evenodd clipping.</p>
        </div>
        <div className="p-3 rounded-xl bg-dark-900/60 border border-white/10">
          <span className="text-primary-400 font-semibold text-xs block mb-1">1.08x Fluid Bounce</span>
          <p className="text-[11px] text-dark-400">Spring physics on Heart, Bookmark, and action buttons.</p>
        </div>
        <div className="p-3 rounded-xl bg-dark-900/60 border border-white/10">
          <span className="text-primary-400 font-semibold text-xs block mb-1">Zero Overhead</span>
          <p className="text-[11px] text-dark-400">Saves ~230KB by replacing Phosphor & Lucide runtimes.</p>
        </div>
      </div>
    </section>
  );
}

