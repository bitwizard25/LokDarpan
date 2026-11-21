import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { Layout } from "~/components/Layout/Layout";
import { VideoCard } from "~/components/VideoCard/VideoCard";
import { studioApi } from "~/lib/api";
import { getServerApiBaseUrl } from "~/lib/api";
import { getUserFromSession } from "~/services/auth.server";

export const meta: MetaFunction = () => {
    return [
        { title: "Your Channel - LokDarpan" },
        { name: "description", content: "Manage your channel and videos" },
    ];
};

export async function loader({ request }: LoaderFunctionArgs) {
    const userSession = await getUserFromSession(request);

    if (!userSession?.user) {
        return redirect("/auth/login");
    }

    const url = new URL(request.url);
    const tab = ['videos', 'playlists', 'about'].includes(url.searchParams.get('tab') || '') ? url.searchParams.get('tab')! : 'videos';
    const [channelRes, videosRes, playlistsRes] = await Promise.all([
        studioApi.getMyChannel(userSession.token),
        studioApi.myVideos(userSession.token, { limit: 24 }),
        fetch(`${getServerApiBaseUrl()}/user/me/playlists?limit=30`, { headers: { Authorization: `Bearer ${userSession.token}` } }),
    ]);
    const channel = channelRes.data?.channel ?? null;
    const videos = (videosRes.data?.items ?? []).filter((v) => v.status === "COMPLETED");
    const playlistsData = playlistsRes.ok ? await playlistsRes.json() : { items: [] };

    return json({
        user: userSession.user,
        channel,
        videos,
        playlists: playlistsData.items || [],
        tab,
        stats: {
            totalViews: videos.reduce((sum, v) => sum + (v.views ?? 0), 0),
            subscribers: channel?.subscriberCount ?? 0,
            totalVideos: channel?.videoCount ?? videos.length,
        },
    });
}

export default function Profile() {
    const { user, channel, videos, playlists, tab, stats } = useLoaderData<typeof loader>();
    const displayName = channel?.name ?? user.name;
    const handle = channel?.handle ?? user.name.toLowerCase().replace(/\s+/g, "");

    return (
        <Layout user={user}>
            {/* Channel banner */}
            <div className="relative h-48 md:h-64 -mx-4 lg:-mx-6 -mt-4 lg:-mt-6 mb-6 bg-gradient-to-br from-primary-500/30 via-dark-900 to-orange-500/20 overflow-hidden">
                {/* Animated gradient background */}
                <div className="absolute inset-0 animated-gradient opacity-30" />

                {/* Banner pattern */}
                <div className="absolute inset-0 opacity-10">
                    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5" />
                        </pattern>
                        <rect width="100" height="100" fill="url(#grid)" />
                    </svg>
                </div>
            </div>

            {/* Profile section */}
            <div className="flex flex-col md:flex-row items-start md:items-end gap-6 -mt-20 md:-mt-16 mb-8 relative z-10">
                {/* Avatar */}
                <div className="avatar-xl w-32 h-32 md:w-40 md:h-40 flex items-center justify-center bg-gradient-to-br from-primary-500 to-orange-500 text-white text-4xl md:text-5xl font-bold ring-4 ring-dark-1000 shadow-glow">
                    {/* TODO: If user has a channel with logo, show it here. For now, use user initials */}
                    {displayName.charAt(0).toUpperCase()}
                </div>

                {/* Channel info */}
                <div className="flex-1">
                    <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
                        {displayName}
                    </h1>
                    <p className="text-gray-400 mb-4">
                        @{handle} • {stats.subscribers.toLocaleString()} subscribers • {stats.totalVideos} videos
                    </p>
                    <div className="flex flex-wrap gap-3">
                        <Link to="/studio" className="btn-primary">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65z" />
                            </svg>
                            Manage Channel
                        </Link>
                        <Link to="/upload" className="btn-secondary">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4zM14 13h-3v3H9v-3H6v-2h3V8h2v3h3v2z" />
                            </svg>
                            Upload Video
                        </Link>
                        {!user.channel && (
                            <Link to="/channel/create" className="btn-secondary bg-primary-500/10 text-primary-400 border-primary-500/20">
                                Create Channel
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <div className="glass-card p-6 text-center">
                    <p className="text-3xl font-bold text-gradient mb-1">{stats.totalViews.toLocaleString()}</p>
                    <p className="text-gray-400 text-sm">Total Views</p>
                </div>
                <div className="glass-card p-6 text-center">
                    <p className="text-3xl font-bold text-gradient mb-1">{stats.subscribers.toLocaleString()}</p>
                    <p className="text-gray-400 text-sm">Subscribers</p>
                </div>
                <div className="glass-card p-6 text-center">
                    <p className="text-3xl font-bold text-gradient mb-1">{stats.totalVideos}</p>
                    <p className="text-gray-400 text-sm">Videos</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 border-b border-dark-800" role="tablist" aria-label="Profile sections">
                <Link role="tab" aria-selected={tab === 'videos'} to="/profile?tab=videos" className={`px-6 py-3 font-medium ${tab === 'videos' ? 'text-white border-b-2 border-primary-500' : 'text-gray-400 hover:text-white'}`}>
                    Videos
                </Link>
                <Link role="tab" aria-selected={tab === 'playlists'} to="/profile?tab=playlists" className={`px-6 py-3 font-medium ${tab === 'playlists' ? 'text-white border-b-2 border-primary-500' : 'text-gray-400 hover:text-white'}`}>
                    Playlists
                </Link>
                <Link role="tab" aria-selected={tab === 'about'} to="/profile?tab=about" className={`px-6 py-3 font-medium ${tab === 'about' ? 'text-white border-b-2 border-primary-500' : 'text-gray-400 hover:text-white'}`}>
                    About
                </Link>
            </div>

            {/* Videos grid */}
            {tab === 'videos' && <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
                {videos.map((video) => (
                    <VideoCard
                        key={video.id ?? video._id}
                        id={(video.id ?? video._id) as string}
                        title={video.title}
                        thumbnailUrl={video.thumbnailUrl}
                        channelName={displayName}
                        views={video.views}
                        createdAt={video.createdAt}
                        duration={video.duration}
                    />
                ))}
            </div>}

            {tab === 'playlists' && <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{playlists.map((playlist: any) => <Link key={playlist.id} to={`/playlist/${playlist.id}`} className="rounded-2xl bg-dark-900 p-6 text-white hover:bg-dark-800"><h2 className="font-semibold">{playlist.name}</h2><p className="mt-2 text-sm text-gray-400">{playlist.itemCount} videos · {playlist.visibility}</p></Link>)}{!playlists.length && <p className="text-gray-400">You haven’t created any playlists yet.</p>}</section>}
            {tab === 'about' && <section className="max-w-3xl rounded-2xl bg-dark-900 p-6 text-gray-300"><h2 className="mb-3 text-xl font-semibold text-white">About {displayName}</h2><p className="whitespace-pre-wrap">{channel?.description || 'No channel description yet.'}</p><p className="mt-4 text-sm text-gray-400">Joined {channel?.createdAt ? new Date(channel.createdAt).toLocaleDateString() : 'recently'}</p></section>}

            {/* Empty state */}
            {tab === 'videos' && videos.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 glass-card">
                    <div className="w-20 h-20 rounded-full bg-dark-800 flex items-center justify-center mb-4">
                        <svg className="w-10 h-10 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">No videos yet</h3>
                    <p className="text-gray-400 mb-4">Upload your first video to get started!</p>
                    <Link to="/upload" className="btn-primary">
                        Upload Video
                    </Link>
                </div>
            )}
        </Layout>
    );
}
