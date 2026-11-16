import { json, type MetaFunction, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useNavigation, Link } from "@remix-run/react";
import { Layout } from "~/components/Layout/Layout";
import { getUserFromSession } from "~/services/auth.server";
import { VideoCard } from "~/components/VideoCard/VideoCard";
import { getServerApiBaseUrl } from "~/lib/api";
import { VideoSkeleton } from "~/components/VideoSkeleton/VideoSkeleton";

export const meta: MetaFunction = () => {
    return [{ title: "Trending - LokDarpan" }];
};

export async function loader({ request }: LoaderFunctionArgs) {
    const userSession = await getUserFromSession(request);
    const url = new URL(request.url);
    const category = url.searchParams.get("category");
    const qs = new URLSearchParams({ section: "trending", limit: "24" });
    if (category) qs.set("category", category);

    const response = await fetch(`${getServerApiBaseUrl()}/video?${qs.toString()}`);
    const data = response.ok ? await response.json() : { videos: [] };
    const videos = (data.videos || []).map((video: any, index: number) => ({ ...video, rank: index + 1, channelName: video.channel?.name || 'Creator', duration: video.durationSeconds || 0 }));
    return json({ user: userSession?.user || null, videos, category, error: response.ok ? null : 'Trending videos could not be loaded.' });
}

export default function Trending() {
    const { user, videos, error } = useLoaderData<typeof loader>();
    const loading = useNavigation().state !== 'idle';
    if (loading && !videos.length) return <Layout user={user}><main className="mx-auto max-w-6xl"><h1 className="mb-6 text-3xl font-bold text-white">Trending Now</h1><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"><VideoSkeleton count={6} /></div></main></Layout>;
    if (!videos.length) return <Layout user={user}><main className="mx-auto max-w-6xl"><h1 className="mb-4 text-3xl font-bold text-white">Trending Now</h1><p role={error ? 'alert' : undefined} className="text-dark-300">{error || 'No published videos are trending yet.'}</p></main></Layout>;
    const heroVideo = videos[0];
    const rankingVideos = videos.slice(1);

    return (
        <Layout user={user}>
            <div className="max-w-6xl mx-auto">

                {/* Header */}
                <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-8">
                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-accent-500 to-red-500 flex items-center justify-center shadow-lg shadow-accent-500/20 animate-pulse-slow shrink-0">
                        <svg className="w-6 h-6 md:w-8 md:h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-4xl font-display font-bold text-white mb-1 md:mb-2">Trending Now</h1>
                        <p className="text-dark-400 text-sm md:text-base">The most popular videos on LokDarpan today.</p>
                    </div>
                </div>

                {/* Hero #1 Rank */}
                <div className="mb-8 md:mb-12 relative group">
                    <div className="absolute -left-2 -top-2 md:-left-6 md:-top-6 w-14 h-14 md:w-24 md:h-24 bg-accent-500 text-black font-display font-bold text-3xl md:text-6xl flex items-center justify-center rounded-full z-20 shadow-glow-accent border-2 md:border-4 border-dark-950 transform -rotate-12 group-hover:rotate-0 transition-transform duration-500">
                        #1
                    </div>
                    <div className="bg-dark-900 rounded-3xl overflow-hidden border border-white/10 shadow-2xl group-hover:border-accent-500/30 transition-all duration-500">
                        <div className="grid grid-cols-1 lg:grid-cols-2">
                            <div className="relative aspect-video lg:aspect-auto h-full min-h-[300px]">
                                <img src={heroVideo.thumbnailUrl} alt={heroVideo.title} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-dark-900" />
                                <Link to={`/watch/${heroVideo._id}`} className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/40">
                                    <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center pl-1 hover:scale-110 transition-transform">
                                        <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                    </div>
                                </Link>
                            </div>
                            <div className="p-8 flex flex-col justify-center">
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="px-3 py-1 rounded-full bg-accent-500/20 text-accent-400 text-sm font-bold border border-accent-500/20">Viral</span>
                                    <span className="text-dark-400 text-sm">• {(heroVideo.views / 1000000).toFixed(1)}M views</span>
                                </div>
                                <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-4 leading-tight">
                                    {heroVideo.title}
                                </h2>
                                <p className="text-dark-300 text-lg mb-6 line-clamp-3">
                                    {heroVideo.description}
                                </p>

                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-400 font-bold">
                                            {heroVideo.channelName[0]}
                                        </div>
                                        <div>
                                            <p className="font-bold text-white">{heroVideo.channelName}</p>
                                    <p className="text-dark-400 text-sm">{(heroVideo.channel?.name || 'Creator')}</p>
                                        </div>
                                    </div>
                                    <button className="ml-auto btn-primary">Watch Now</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Ranked List */}
                <div className="space-y-6">
                    {rankingVideos.map((video: any) => (
                        <div key={video._id} className="group flex flex-col md:flex-row gap-6 p-4 rounded-2xl hover:bg-white/5 transition-all duration-300 border border-transparent hover:border-white/5">
                            {/* Rank Number */}
                            <div className="hidden md:flex flex-col items-center justify-center w-16 shrink-0">
                                <span className={`text-5xl font-display font-bold ${video.rank <= 3 ? 'text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]' : 'text-dark-600'
                                    }`}>
                                    {video.rank}
                                </span>
                                {video.rank <= 3 && <span className="text-accent-500 text-xs font-bold mt-1 tracking-widest uppercase">Top 3</span>}
                            </div>

                            {/* Thumbnail */}
                            <div className="relative aspect-video md:w-64 rounded-xl overflow-hidden shrink-0 group-hover:shadow-glow-sm transition-all duration-300">
                                <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                <span className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/80 text-white text-xs rounded">
                                    {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}
                                </span>
                            </div>

                            {/* Info */}
                            <div className="flex-1 py-1">
                                <Link to={`/watch/${video._id}`}>
                                    <h3 className="text-xl font-bold text-white mb-2 group-hover:text-primary-400 transition-colors">
                                        {video.title}
                                    </h3>
                                </Link>
                                <div className="flex items-center gap-2 text-dark-400 text-sm mb-3">
                                    <span className="font-medium text-dark-300 hover:text-white transition-colors">{video.channelName}</span>
                                    <span>•</span>
                                    <span>{(video.views / 1000).toFixed(0)}K views</span>
                                    <span>•</span>
                                    <span>5 hours ago</span>
                                </div>
                                <p className="text-dark-400 text-sm line-clamp-2 hidden md:block">
                                    Join the discussion on this trending topic. Community interaction is at an all-time high for this video.
                                </p>
                            </div>

                            {/* Action (Desktop) */}
                            <div className="hidden md:flex items-center">
                                <button className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-dark-300 hover:text-white hover:bg-white/10 transition-all opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

            </div>
        </Layout>
    );
}
