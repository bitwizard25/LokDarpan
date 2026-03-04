import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { useState } from "react";
import { Layout } from "~/components/Layout/Layout";
import { CategoryChips } from "~/components/CategoryChips/CategoryChips";
import { CinematicHero } from "~/components/Hero/CinematicHero";
import { ChameleonCanvas } from "~/components/UI/ChameleonCanvas";
import { SmartHoverTooltip } from "~/components/VideoCard/SmartHoverTooltip";
import { getUserFromSession } from "~/services/auth.server";

export const meta: MetaFunction = () => {
    return [
        { title: "LokDarpan - The Chameleon Gallery" },
        { name: "description", content: "Experience videos in an immersive spatial UI" },
    ];
};

// Mock Data Enriched with Ambient Colors
const trendingVideos = [
    { _id: "t1", title: "Cyberpunk Cityscapes", thumbnailUrl: "https://picsum.photos/seed/cyber/640/360", channelName: "NeonVibes", channelAvatar: "N", views: 88000, duration: 420, isLive: false, ambient: "rgba(236, 72, 153, 0.15)", aiSummary: ["Complete breakdown of neon composition", "Best practices for night renders", "Free assets included"] },
    { _id: "t2", title: "Lofi Beats to Code To", thumbnailUrl: "https://picsum.photos/seed/lofi/640/360", channelName: "ChillHop", channelAvatar: "C", views: 12000, duration: 3600, isLive: true, ambient: "rgba(167, 139, 250, 0.15)", aiSummary: ["Continuous focus mix", "Curated for deep work", "No distracting vocals"] },
    { _id: "t3", title: "React 19 Features Explained", thumbnailUrl: "https://picsum.photos/seed/react/640/360", channelName: "DevDaily", channelAvatar: "D", views: 45000, duration: 890, isLive: false, ambient: "rgba(96, 165, 250, 0.15)", aiSummary: ["Compiler optimizations decoded", "New hook APIs", "Migration guide strategies"] },
    { _id: "t4", title: "Meditation for Focus", thumbnailUrl: "https://picsum.photos/seed/meditate/640/360", channelName: "Mindful", channelAvatar: "M", views: 23000, duration: 600, isLive: false, ambient: "rgba(52, 211, 153, 0.15)", aiSummary: ["10-minute guided session", "Box breathing technique", "Perfect for mid-day resets"] },
];

const techVideos = [
    { _id: "t5", title: "Building SaaS in 24 Hours", thumbnailUrl: "https://picsum.photos/seed/saas/640/360", channelName: "IndieHacker", channelAvatar: "I", views: 67000, duration: 1500, isLive: false, ambient: "rgba(245, 158, 11, 0.15)" },
    { _id: "t6", title: "Abstract Art Tutorial", thumbnailUrl: "https://picsum.photos/seed/art/640/360", channelName: "CreativeFlow", channelAvatar: "C", views: 12000, duration: 900, isLive: false, ambient: "rgba(244, 63, 94, 0.15)" },
    { _id: "t7", title: "Van Life: 1 Year Later", thumbnailUrl: "https://picsum.photos/seed/van/640/360", channelName: "NomadLife", channelAvatar: "N", views: 156000, duration: 1250, isLive: false, ambient: "rgba(16, 185, 129, 0.15)" },
    { _id: "t8", title: "Zero Waste Kitchen Switch", thumbnailUrl: "https://picsum.photos/seed/green/640/360", channelName: "EcoWarrior", channelAvatar: "E", views: 34000, duration: 540, isLive: false, ambient: "rgba(132, 204, 22, 0.15)" },
];

const shortsData = [
    { _id: "s1", title: "Crazy AI Art in 30 Seconds", thumbnailUrl: "https://picsum.photos/seed/short1/400/700", views: 1200000, ambient: "rgba(217, 70, 239, 0.15)" },
    { _id: "s2", title: "One-Minute Yoga Flow", thumbnailUrl: "https://picsum.photos/seed/short2/400/700", views: 890000, ambient: "rgba(56, 189, 248, 0.15)" },
    { _id: "s3", title: "Hidden iPhone Feature", thumbnailUrl: "https://picsum.photos/seed/short3/400/700", views: 2100000, ambient: "rgba(250, 204, 21, 0.15)" },
    { _id: "s4", title: "Epic Drone Fail", thumbnailUrl: "https://picsum.photos/seed/short4/400/700", views: 560000, ambient: "rgba(248, 113, 113, 0.15)" },
];

// Combine all mock spaces
const SPACES = [
    { title: "Trending Now", items: trendingVideos, type: "video" as const },
    { title: "Bite-Sized (Shorts)", items: shortsData, type: "short" as const },
    { title: "Late Night Coding & Tech", items: techVideos, type: "video" as const },
];

export async function loader({ request }: LoaderFunctionArgs) {
    const userSession = await getUserFromSession(request);
    return json({ user: userSession?.user || null });
}

export default function Index() {
    const { user } = useLoaderData<typeof loader>();
    const [ambientColor, setAmbientColor] = useState("rgba(59, 130, 246, 0.05)");
    const [hoveredVideoId, setHoveredVideoId] = useState<string | null>(null);

    return (
        <Layout user={user} hideSidebar={true}>
            {/* Ambient Overlay to provide the Chameleon Effect */}
            <ChameleonCanvas ambientColor={ambientColor} intensity="medium" />

            {/* Sidebar Replacement for Spaces - Floating Top Categories */}
            <div className="sticky top-[80px] z-40 py-2 mb-6 -mx-4 px-4 bg-dark-950/80 backdrop-blur-md border-b border-white/5">
                <CategoryChips categories={["For You", "Late Night Coding", "Weekend Thrillers", "Learn Something", "Music", "Vibes"]} />
            </div>

            {/* Hero Section */}
            <section className="mb-12">
                <CinematicHero />
            </section>

            {/* Render Spaces */}
            <div className="flex flex-col gap-16 pb-20">
                {SPACES.map((space, idx) => (
                    <section key={idx} className="relative z-0">
                        <div className="flex items-center gap-3 mb-6">
                            <h2 className="text-2xl font-display font-bold text-white group cursor-pointer flex items-center gap-2">
                                {space.title}
                                <svg className="w-5 h-5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </h2>
                        </div>

                        {/* Space Rail - Horizontal Scroll with Parallax effect */}
                        <div className="flex gap-6 overflow-x-auto pb-6 pt-2 scrollbar-hide -mx-4 px-4 lg:-mx-8 lg:px-8 snap-x snap-mandatory perspective-1000">
                            {space.items.map((item) => (
                                <Link
                                    key={item._id}
                                    to={space.type === "short" ? `/shorts/${item._id}` : `/watch/${item._id}`}
                                    className={`group flex-shrink-0 snap-center relative transition-transform duration-500 ease-out hover:-translate-y-2 active:scale-95 active:animate-bounce-elastic ${space.type === "short" ? 'w-48' : 'w-72 md:w-80'}`}
                                    onMouseEnter={() => {
                                        setAmbientColor(item.ambient);
                                        setHoveredVideoId(item._id);
                                    }}
                                    onMouseLeave={() => setHoveredVideoId(null)}
                                >
                                    {/* Smart Hover Tooltip */}
                                    <div className="absolute -top-4 w-full flex justify-center z-50 pointer-events-none">
                                        <SmartHoverTooltip
                                            title={item.title}
                                            summaryBullets={(item as any).aiSummary || ["AI analyzing context...", "Extracting key moments", "Generating summary"]}
                                            isVisible={hoveredVideoId === item._id}
                                        />
                                    </div>
                                    <div className="flex flex-col gap-3">
                                        <div className={`rounded-2xl overflow-hidden glass-panel ${space.type === "short" ? 'aspect-[9/16]' : 'aspect-video'} ring-1 ring-white/10 group-hover:ring-white/30 transition-all duration-300 relative group-hover:shadow-glow-subtle`}>
                                            <img
                                                src={item.thumbnailUrl}
                                                alt={item.title}
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-dark-950/90 via-transparent to-transparent opacity-80 group-hover:opacity-50 transition-opacity duration-300" />

                                            {/* Badges */}
                                            {space.type === "video" && (
                                                <div className="absolute bottom-3 right-3 px-2 py-1 rounded bg-black/60 backdrop-blur-sm text-[11px] font-bold text-white border border-white/10">
                                                    {Math.floor((item as any).duration / 60)}:{((item as any).duration % 60).toString().padStart(2, '0')}
                                                </div>
                                            )}
                                        </div>

                                        {/* Metadata */}
                                        <div className="flex gap-3 px-1">
                                            {space.type === "video" && (
                                                <div className="w-10 h-10 rounded-full bg-dark-800 flex items-center justify-center text-sm font-bold text-white shrink-0 border border-white/10 group-hover:border-primary-400/50 transition-colors">
                                                    {(item as any).channelAvatar}
                                                </div>
                                            )}
                                            <div className="flex flex-col min-w-0 justify-center">
                                                <h3 className="text-white font-semibold text-sm md:text-base leading-snug line-clamp-2 group-hover:text-primary-300 transition-colors">
                                                    {item.title}
                                                </h3>
                                                <p className="text-dark-400 text-xs md:text-sm mt-1">
                                                    {space.type === "video" && `${(item as any).channelName} • `}
                                                    {Intl.NumberFormat('en-US', { notation: "compact" }).format(item.views)} views
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </section>
                ))}
            </div>

            <div className="flex justify-center mb-10">
                <button className="nav-pill border-white/20 hover:border-white/40 text-white">Load more spaces</button>
            </div>
        </Layout>
    );
}
