import { useState, useEffect } from "react";
import { Link } from "@remix-run/react";

interface HeroItem {
    id: string;
    title: string;
    description: string;
    imageUrl: string;
    category: string;
    duration: string;
    ambient: string;
}

const HERO_ITEMS: HeroItem[] = [
    {
        id: "h1",
        title: "The Future of Digital Art",
        description: "Explore how AI and human creativity are merging to create stunning new forms of expression in the digital age.",
        imageUrl: "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=2600&auto=format&fit=crop",
        category: "Technology",
        duration: "12 min",
        ambient: "rgba(236, 72, 153, 0.25)"
    },
    {
        id: "h2",
        title: "Hidden Gems of Kyoto",
        description: "A cinematic journey through the ancient streets, temples, and tea houses of Japan's cultural capital.",
        imageUrl: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=2600&auto=format&fit=crop",
        category: "Travel",
        duration: "8 min",
        ambient: "rgba(59, 130, 246, 0.25)"
    },
    {
        id: "h3",
        title: "Minimalist Workspace Setup",
        description: "How to design a distraction-free environment that boosts productivity and mental clarity.",
        imageUrl: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?q=80&w=2600&auto=format&fit=crop",
        category: "Lifestyle",
        duration: "15 min",
        ambient: "rgba(16, 185, 129, 0.25)"
    }
];

export function CinematicHero({ onSlideChange }: { onSlideChange?: (color: string) => void }) {
    const [currentIndex, setCurrentIndex] = useState(0);

    // Auto-advance carousel
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % HERO_ITEMS.length);
        }, 6000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (onSlideChange) onSlideChange(HERO_ITEMS[currentIndex].ambient);
    }, [currentIndex, onSlideChange]);

    const currentItem = HERO_ITEMS[currentIndex];

    return (
        <div className="relative w-[100vw] ml-[calc(-50vw+50%)] h-[85vh] md:h-[90vh] overflow-hidden mb-8 group bg-dark-1000">
            {/* Background Image with Transition */}
            {HERO_ITEMS.map((item, index) => (
                <div
                    key={item.id}
                    className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentIndex ? "opacity-100" : "opacity-0"
                        }`}
                >
                    <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-full h-full object-cover transform scale-[1.02] group-hover:scale-[1.05] transition-transform duration-[10000ms] ease-out mix-blend-screen"
                    />
                    {/* Dark gradient mapping for legibility and cinematic feel */}
                    <div className="absolute inset-0 bg-gradient-to-t from-dark-950 via-dark-950/20 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-r from-dark-950/90 via-dark-950/40 to-transparent" />
                </div>
            ))}

            {/* Content Container - Centered to max-width so it aligns with page content while background is edge-to-edge */}
            <div className="absolute inset-0 w-full max-w-[1920px] mx-auto pointer-events-none">
                <div className="absolute bottom-12 md:bottom-24 left-4 md:left-8 p-0 w-full max-w-3xl z-10 flex flex-col items-start gap-5 pointer-events-auto pl-4 lg:pl-0 xl:ml-8">
                    <div className="flex items-center gap-3 animate-fade-in">
                        {/* Nexus: Glass pill overlays */}
                        <div className="px-4 py-1.5 bg-dark-900/40 backdrop-blur-md text-white text-xs font-bold uppercase tracking-wider rounded-full border border-white/20 shadow-minimal">
                            {currentItem.category}
                        </div>
                        <div className="px-4 py-1.5 bg-dark-900/30 backdrop-blur-md text-dark-200 text-xs font-medium flex items-center gap-1.5 rounded-full border border-white/10">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            {currentItem.duration}
                        </div>
                    </div>

                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-display font-bold text-white leading-[1.1] drop-shadow-2xl animate-slide-up">
                        {currentItem.title}
                    </h1>

                    <p className="text-dark-200 text-lg md:text-2xl max-w-2xl line-clamp-2 drop-shadow-md animate-slide-up font-medium" style={{ animationDelay: "100ms" }}>
                        {currentItem.description}
                    </p>

                    <div className="flex gap-4 mt-6 animate-slide-up" style={{ animationDelay: "200ms" }}>
                        {/* Use Kinetic button base classes implicitly */}
                        <Link to={`/watch/Hero-${currentItem.id}`} className="inline-flex items-center justify-center font-bold tracking-wide rounded-full transition-all duration-300 active:scale-95 active:animate-bounce-elastic outline-none px-8 py-4 text-base bg-white text-black hover:bg-dark-200 hover:shadow-[0_0_30px_rgba(255,255,255,0.4)] border border-transparent gap-3 group">
                            <div className="w-8 h-8 rounded-full bg-black/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <svg className="w-4 h-4 fill-current ml-1" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                            </div>
                            Play Now
                        </Link>
                        <button className="inline-flex items-center justify-center font-bold tracking-wide rounded-full transition-all duration-300 active:scale-95 active:animate-bounce-elastic outline-none px-8 py-4 text-base bg-white/5 backdrop-blur-md text-white border border-white/10 hover:bg-white/10 hover:border-white/20 hover:shadow-[0_0_20px_rgba(255,255,255,0.15)]">
                            Add to List
                        </button>
                    </div>
                </div>
            </div>

            {/* Pagination Indicators - updated to glass pills */}
            <div className="absolute bottom-8 right-8 flex gap-2 z-20 bg-dark-900/40 backdrop-blur-md px-3 py-2 rounded-full border border-white/10">
                {HERO_ITEMS.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => setCurrentIndex(index)}
                        className={`h-2 rounded-full transition-all duration-500 ease-out ${index === currentIndex ? "w-8 bg-white shadow-glow-white" : "w-2 bg-white/30 hover:bg-white/60"
                            }`}
                        aria-label={`Go to slide ${index + 1}`}
                    />
                ))}
            </div>
        </div>
    );
}
