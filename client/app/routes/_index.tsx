import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { Layout } from "~/components/Layout/Layout";
import { CategoryChips } from "~/components/CategoryChips/CategoryChips";
import { VideoCard } from "~/components/VideoCard/VideoCard";
import { FeaturedHero } from "~/components/Hero/FeaturedHero";
import { getUserFromSession } from "~/services/auth.server";

export const meta: MetaFunction = () => {
    return [
        { title: "LokDarpan - The Chameleon Gallery" },
        { name: "description", content: "Experience videos in an immersive spatial UI" },
    ];
};

// Mock Data Enriched with Ambient Colors
const trendingVideos = [
    { _id: "t1", title: "The Future of Digital Art", thumbnailUrl: "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=640&auto=format&fit=crop", channelName: "NeonVibes", channelAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop", views: 88000, duration: 420, isLive: false, ambient: "rgba(236, 72, 153, 0.15)", aiSummary: ["Complete breakdown of neon composition", "Best practices for night renders", "Free assets included"] },
    { _id: "t2", title: "Building a Next.js App from Scratch", thumbnailUrl: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=640&auto=format&fit=crop", channelName: "DevDaily", channelAvatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=150&auto=format&fit=crop", views: 120000, duration: 3600, isLive: true, ambient: "rgba(167, 139, 250, 0.15)", aiSummary: ["Continuous focus mix", "Curated for deep work", "No distracting vocals"] },
    { _id: "t3", title: "React 19 Features Explained", thumbnailUrl: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=640&auto=format&fit=crop", channelName: "TechWeekly", channelAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop", views: 45000, duration: 890, isLive: false, ambient: "rgba(96, 165, 250, 0.15)", aiSummary: ["Compiler optimizations decoded", "New hook APIs", "Migration guide strategies"] },
    { _id: "t4", title: "Cinematic Lighting for Small Studios", thumbnailUrl: "https://images.unsplash.com/photo-1559136555-e660502afce4?q=80&w=640&auto=format&fit=crop", channelName: "CreatorHQ", channelAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&auto=format&fit=crop", views: 23000, duration: 600, isLive: false, ambient: "rgba(52, 211, 153, 0.15)", aiSummary: ["10-minute guided session", "Box breathing technique", "Perfect for mid-day resets"] },
];

const techVideos = [
    { _id: "t5", title: "Mastering Glassmorphism in TailwindCSS", thumbnailUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=640&auto=format&fit=crop", channelName: "IndieHacker", channelAvatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=150&auto=format&fit=crop", views: 67000, duration: 1500, isLive: false, ambient: "rgba(245, 158, 11, 0.15)" },
    { _id: "t6", title: "Designing with Framer Motion Elements", thumbnailUrl: "https://images.unsplash.com/photo-1561070791-2526d30994b5?q=80&w=640&auto=format&fit=crop", channelName: "CreativeFlow", channelAvatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=150&auto=format&fit=crop", views: 12000, duration: 900, isLive: false, ambient: "rgba(244, 63, 94, 0.15)" },
    { _id: "t7", title: "Why the Default UI Paradigm is Dead", thumbnailUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=640&auto=format&fit=crop", channelName: "DesignInsight", channelAvatar: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?q=80&w=150&auto=format&fit=crop", views: 156000, duration: 1250, isLive: false, ambient: "rgba(16, 185, 129, 0.15)" },
    { _id: "t8", title: "The Perfect Developer Work Setup", thumbnailUrl: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?q=80&w=640&auto=format&fit=crop", channelName: "WorkspaceHub", channelAvatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=150&auto=format&fit=crop", views: 34000, duration: 540, isLive: false, ambient: "rgba(132, 204, 22, 0.15)" },
];

const shortsData = [
    { _id: "s1", title: "Crazy AI Art in 30 Seconds", thumbnailUrl: "https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?q=80&w=400&h=700&auto=format&fit=crop", views: 1200000, ambient: "rgba(217, 70, 239, 0.15)" },
    { _id: "s2", title: "Neon Cyberpunk Concepts", thumbnailUrl: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=400&h=700&auto=format&fit=crop", views: 890000, ambient: "rgba(56, 189, 248, 0.15)" },
    { _id: "s3", title: "Abstract 3D Animations", thumbnailUrl: "https://images.unsplash.com/photo-1605806616949-1e87b487cb2a?q=80&w=400&h=700&auto=format&fit=crop", views: 2100000, ambient: "rgba(250, 204, 21, 0.15)" },
    { _id: "s4", title: "Cinematic Lighting Setup", thumbnailUrl: "https://images.unsplash.com/photo-1534080164805-728bdf61247d?q=80&w=400&h=700&auto=format&fit=crop", views: 560000, ambient: "rgba(248, 113, 113, 0.15)" },
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

const FEATURED = {
    id: "t2",
    title: "Monsoon Session: what changed in the House this week",
    description:
        "Three bills, two walkouts and a debate that ran past midnight. Lok Report breaks down what passed, what stalled and what it means for you.",
    imageUrl: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=2600&auto=format&fit=crop",
    channelName: "Lok Report",
    watching: "12.4k",
    presenters: "Ananya Rao, Vikram Sethi",
    language: "Hindi, English subtitles",
};

// Horizontal rail item width: ~4.5 cards visible on wide screens so the next card peeks in.
const RAIL_ITEM = "min-w-0 shrink-0 grow-0 snap-start basis-[clamp(168px,calc((100%_-_80px)/4.5),300px)]";
const RAIL = "flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory pt-1 pb-2";

export default function Index() {
    const { user } = useLoaderData<typeof loader>();

    return (
        <Layout user={user} shell>
            <FeaturedHero item={FEATURED} />

            <div className="max-w-full overflow-x-auto scrollbar-hide">
                <CategoryChips categories={["For You", "Late Night Coding", "Weekend Thrillers", "Learn Something", "Music", "Vibes"]} />
            </div>

            {SPACES.map((space) => (
                <section key={space.title} className="flex flex-col gap-4">
                    <div className="flex items-baseline justify-between gap-4">
                        <h2 className="m-0 font-display font-semibold text-white text-[clamp(20px,2vw,25px)]">{space.title}</h2>
                        <Link
                            to={space.type === "short" ? "/shorts" : "/explore"}
                            className="py-2 text-sm font-semibold text-dark-200 hover:text-white no-underline transition-colors"
                        >
                            See all
                        </Link>
                    </div>

                    <div className={RAIL}>
                        {space.type === "short"
                            ? space.items.map((item) => (
                                <Link
                                    key={item._id}
                                    to={`/shorts/${item._id}`}
                                    aria-label={item.title}
                                    className="flex-none snap-start w-[clamp(140px,16vw,200px)] flex flex-col gap-2 no-underline"
                                >
                                    <div className="aspect-[9/16] overflow-hidden rounded-2xl bg-dark-800 border border-white/5">
                                        <img src={item.thumbnailUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                                    </div>
                                    <span className="text-white font-semibold text-sm leading-snug line-clamp-2">{item.title}</span>
                                    <span className="text-dark-400 text-sm">
                                        {Intl.NumberFormat("en-US", { notation: "compact" }).format(item.views)} views
                                    </span>
                                </Link>
                            ))
                            : space.items.map((item) => (
                                <div key={item._id} className={RAIL_ITEM}>
                                    <VideoCard
                                        id={item._id}
                                        title={item.title}
                                        thumbnailUrl={item.thumbnailUrl}
                                        channelName={(item as any).channelName}
                                        views={item.views}
                                        createdAt=""
                                        duration={(item as any).duration}
                                        isLive={(item as any).isLive}
                                    />
                                </div>
                            ))}
                    </div>
                </section>
            ))}
        </Layout>
    );
}
