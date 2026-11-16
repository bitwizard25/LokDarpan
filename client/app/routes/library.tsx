import { json, redirect, type ActionFunctionArgs, type MetaFunction, type LoaderFunctionArgs } from "@remix-run/node";
import { Form, useLoaderData, useNavigation, Link } from "@remix-run/react";
import { Layout } from "~/components/Layout/Layout";
import { getUserFromSession } from "~/services/auth.server";
import { getServerApiBaseUrl } from "~/lib/api";
import { VideoSkeleton } from "~/components/VideoSkeleton/VideoSkeleton";
import { VideoCard } from "~/components/VideoCard/VideoCard";
import {
    Library as LibraryIcon,
    Clock,
    CreateUpload,
    Theater,
    SettingsGear,
    Plus,
    Play,
} from "~/components/icons";

export const meta: MetaFunction = () => {
    return [{ title: "Your Library - LokDarpan" }];
};

export async function loader({ request }: LoaderFunctionArgs) {
    const userSession = await getUserFromSession(request);
    if (!userSession) throw redirect('/auth/login?redirectTo=%2Flibrary');
    const response = await fetch(`${getServerApiBaseUrl()}/user/me/library`, { headers: { Authorization: `Bearer ${userSession.token}` } });
    const data = response.ok ? await response.json() : { history: { items: [] }, playlists: { items: [] } };
    return json({ user: userSession.user, history: data.history?.items || [], playlists: data.playlists?.items || [], error: response.ok ? null : 'Could not load your library.' });
}

export async function action({ request }: ActionFunctionArgs) {
    const session = await getUserFromSession(request);
    if (!session) throw redirect('/auth/login?redirectTo=%2Flibrary');
    const form = await request.formData();
    const response = await fetch(`${getServerApiBaseUrl()}/user/me/playlists`, {
        method: 'POST', headers: { Authorization: `Bearer ${session.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.get('name') }),
    });
    if (!response.ok) return json({ error: 'Could not create the playlist. Enter a name and try again.' }, { status: response.status });
    const data = await response.json();
    return redirect(`/playlist/${data.playlist.id}`);
}

export default function Library() {
    const { user, history, playlists, error } = useLoaderData<typeof loader>();
    const loading = useNavigation().state !== 'idle';

    return (
        <Layout user={user}>
            <div className="max-w-7xl mx-auto px-2">
                {error && <p role="alert" className="mb-5 text-red-300">{error}</p>}

                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 rounded-xl bg-dark-800 border border-white/10 flex items-center justify-center">
                        <LibraryIcon size={24} className="text-primary-400" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-display font-bold text-white">Your Library</h1>
                        <p className="text-dark-400 text-sm">Manage your content and watch history</p>
                    </div>
                </div>

                {/* Dashboard Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Main Column: History & Stats */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* History Section */}
                        <section className="glass-panel p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Clock size={20} className="text-accent-500" />
                                    Recent History
                                </h2>
                                <Link to="/history" className="text-primary-400 text-sm font-medium hover:text-primary-300">View All</Link>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {loading ? <VideoSkeleton count={4} /> : history.map((video: any) => (
                                    <Link to={`/watch/${video.id}`} key={video.id} className="group flex gap-4 p-3 rounded-xl bg-dark-800/50 hover:bg-dark-800 border border-transparent hover:border-white/5 transition-all">
                                        <div className="relative w-32 aspect-video rounded-lg overflow-hidden shrink-0">
                                            <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />
                                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-dark-900">
                                                <div className="h-1 bg-accent-500" style={{ width: `${video.progress}%` }} />
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-white font-medium text-sm line-clamp-2 mb-1 group-hover:text-primary-400 transition-colors">{video.title}</h3>
                                            <p className="text-dark-400 text-xs">{video.channel?.name || 'Creator'}</p>
                                        </div>
                                    </Link>
                                ))}
                                {!loading && !history.length && <p className="text-dark-400">Your watch history will appear here.</p>}
                            </div>
                        </section>

                        {/* Quick Functions */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <Link
                                to="/upload"
                                className="p-4 rounded-2xl bg-dark-900 border border-white/5 hover:border-primary-500/50 flex flex-col items-center justify-center gap-2 group transition-all active:scale-95"
                            >
                                <div className="w-11 h-11 rounded-full bg-primary-500/10 flex items-center justify-center text-primary-400 group-hover:scale-110 group-hover:bg-primary-500/20 transition-all duration-300">
                                    <CreateUpload size={22} />
                                </div>
                                <span className="font-semibold text-white text-sm">Upload Video</span>
                                <span className="text-xs text-dark-400">Publish new content</span>
                            </Link>

                            <Link
                                to="/studio"
                                className="p-4 rounded-2xl bg-dark-900 border border-white/5 hover:border-accent-500/50 flex flex-col items-center justify-center gap-2 group transition-all active:scale-95"
                            >
                                <div className="w-11 h-11 rounded-full bg-accent-500/10 flex items-center justify-center text-accent-400 group-hover:scale-110 group-hover:bg-accent-500/20 transition-all duration-300">
                                    <Theater size={22} />
                                </div>
                                <span className="font-semibold text-white text-sm">Your Uploads</span>
                                <span className="text-xs text-dark-400">Studio & video manager</span>
                            </Link>

                            <Link
                                to="/settings"
                                className="p-4 rounded-2xl bg-dark-900 border border-white/5 hover:border-white/20 flex flex-col items-center justify-center gap-2 group transition-all active:scale-95"
                            >
                                <div className="w-11 h-11 rounded-full bg-white/5 flex items-center justify-center text-dark-300 group-hover:scale-110 group-hover:text-white transition-all duration-300">
                                    <SettingsGear size={22} />
                                </div>
                                <span className="font-semibold text-white text-sm">Settings</span>
                                <span className="text-xs text-dark-400">Account & preferences</span>
                            </Link>
                        </div>
                    </div>

                    {/* Sidebar: Playlists */}
                    <aside className="glass-panel p-6 h-fit">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-white">Playlists</h2>
                            <details className="relative"><summary aria-label="Create playlist" title="Create playlist" className="list-none w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 text-white transition-colors cursor-pointer"><Plus size={18} className="text-white" /></summary><Form method="post" className="absolute right-0 top-10 z-20 w-64 rounded-xl border border-white/10 bg-dark-900 p-4 shadow-xl"><label className="mb-2 block text-sm text-white" htmlFor="new-playlist-name">New playlist</label><input id="new-playlist-name" name="name" required maxLength={80} placeholder="Playlist name" className="mb-3 w-full rounded-lg bg-black/30 px-3 py-2 text-white" /><button type="submit" className="btn-primary w-full">Create</button></Form></details>
                        </div>

                        <div className="space-y-4">
                            {playlists.map((playlist: any) => (
                                <Link to={`/playlist/${playlist.id}`} key={playlist.id} className="group relative overflow-hidden rounded-xl aspect-[2/1] cursor-pointer block">
                                    {/* Background Gradient */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-primary-600 to-cyan-500 opacity-80 group-hover:opacity-100 transition-opacity" />

                                    {/* Pattern Overlay */}
                                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(white 1px, transparent 1px)', backgroundSize: '10px 10px' }} />

                                    <div className="absolute inset-0 p-4 flex flex-col justify-end">
                                        <h3 className="text-white font-bold text-lg leading-tight">{playlist.name}</h3>
                                        <p className="text-white/80 text-xs font-medium">{playlist.itemCount} videos</p>

                                        <div className="absolute top-4 right-4 w-8 h-8 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0">
                                            <Play size={16} className="text-white ml-0.5" />
                                        </div>
                                    </div>
                                </Link>
                            ))}
                            {!playlists.length && <p className="text-sm text-dark-400">Create a playlist to collect videos.</p>}
                        </div>
                    </aside>
                </div>
            </div>
        </Layout>
    );
}
