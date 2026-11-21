import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { Link, useLoaderData } from '@remix-run/react';
import { Layout } from '~/components/Layout/Layout';
import { VideoCard } from '~/components/VideoCard/VideoCard';
import { getServerApiBaseUrl } from '~/lib/api';
import { getUserFromSession } from '~/services/auth.server';

export async function loader({ request, params }: LoaderFunctionArgs) {
  const session = await getUserFromSession(request);
  const response = await fetch(`${getServerApiBaseUrl()}/playlists/${params.playlistId}?limit=50`, { headers: session ? { Authorization: `Bearer ${session.token}` } : {} });
  if (response.status === 404) throw new Response('Playlist not found', { status: 404 });
  if (!response.ok) throw new Response('Could not load playlist', { status: response.status });
  const data = await response.json();
  return json({ user: session?.user || null, ...data });
}

export default function PlaylistPage() {
  const { user, playlist, items } = useLoaderData<typeof loader>();
  return <Layout user={user}><main className="mx-auto max-w-7xl space-y-6"><Link to="/library" className="text-primary-300">← Your library</Link><header className="rounded-2xl bg-dark-900 p-7"><h1 className="text-3xl font-bold text-white">{playlist.name}</h1><p className="mt-2 text-dark-300">{playlist.itemCount} videos · {playlist.visibility}</p></header>{items.length ? <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{items.map((video: any) => <VideoCard key={video.id} id={video.id} title={video.title} thumbnailUrl={video.thumbnailUrl} channelName={video.channel?.name || 'Creator'} channelId={video.channel?.id} views={video.views || 0} createdAt={video.publishedAt || ''} duration={video.durationSeconds || 0} />)}</section> : <p className="text-dark-300">This playlist is empty.</p>}</main></Layout>;
}
