import type { MetaFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useNavigation, Link } from "@remix-run/react";
import { Layout } from "~/components/Layout/Layout";
import { getUserFromSession } from "~/services/auth.server";
import { getServerApiBaseUrl } from "~/lib/api";
import { VideoCard } from "~/components/VideoCard/VideoCard";
import { VideoSkeleton } from "~/components/VideoSkeleton/VideoSkeleton";

export const meta: MetaFunction = () => {
    return [{ title: "Explore - LokDarpan" }];
};

export async function loader({ request }: LoaderFunctionArgs) {
    const userSession = await getUserFromSession(request);
    if (!userSession) return json({ user: null, videos: [], error: null });
    const response = await fetch(`${getServerApiBaseUrl()}/user/me/following-feed?limit=30`, { headers: { Authorization: `Bearer ${userSession.token}` } });
    const data = response.ok ? await response.json() : { videos: [] };
    return json({ user: userSession.user, videos: data.videos || data.items || [], error: response.ok ? null : 'Could not load your following feed.' });
}

export default function GenericPage() {
    const { user, videos, error } = useLoaderData<typeof loader>();
    const loading = useNavigation().state !== 'idle';
    return (
        <Layout user={user}>
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                <div className="w-24 h-24 mb-6 rounded-full bg-primary-500/10 flex items-center justify-center shadow-glow-sm">
                    <svg className="w-12 h-12 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                </div>

                <h1 className="text-4xl font-display font-bold text-white mb-4">Following</h1>
                <p className="text-dark-300 max-w-md mb-8 text-lg">Recent videos from channels you follow.</p>
                {error && <p role="alert" className="mb-5 text-red-300">{error}</p>}
                {loading ? <div className="grid w-full grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3"><VideoSkeleton count={6} /></div> : videos.length ? <div className="grid w-full grid-cols-1 gap-5 text-left sm:grid-cols-2 xl:grid-cols-3">{videos.map((video: any) => <VideoCard key={video.id} id={video.id} title={video.title} thumbnailUrl={video.thumbnailUrl} channelName={video.channel?.name || 'Creator'} channelId={video.channel?.id} views={video.views || 0} createdAt={video.publishedAt || ''} duration={video.durationSeconds || 0} />)}</div> : <p className="mb-8 text-dark-300">{user ? 'No videos from followed channels yet.' : 'Sign in to see videos from channels you follow.'}</p>}
                <Link to={user ? '/explore' : '/auth/login'} className="btn-primary flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    {user ? 'Explore channels' : 'Sign in'}
                </Link>
            </div>
        </Layout>
    );
}
