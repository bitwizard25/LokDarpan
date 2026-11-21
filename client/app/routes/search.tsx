import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { Form, Link, useLoaderData, useNavigation } from '@remix-run/react';
import { Layout } from '~/components/Layout/Layout';
import { VideoCard } from '~/components/VideoCard/VideoCard';
import { getServerApiBaseUrl } from '~/lib/api';
import { getUserFromSession } from '~/services/auth.server';
import { VideoSkeleton } from '~/components/VideoSkeleton/VideoSkeleton';

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const q = url.searchParams.get('q')?.trim() || '';
  const session = await getUserFromSession(request);
  let videos: any[] = [];
  let error: string | null = null;
  if (q) {
    try {
      const response = await fetch(`${getServerApiBaseUrl()}/search?${new URLSearchParams({ q, type: 'videos', limit: '24' })}`);
      if (!response.ok) throw new Error(`Search failed (${response.status})`);
      const data = await response.json();
      videos = data.videos?.items || data.videos?.videos || [];
    } catch (cause) { error = cause instanceof Error ? cause.message : 'Search is unavailable'; }
  }
  return json({ user: session?.user || null, q, videos, error });
}

export default function SearchPage() {
  const { user, q, videos, error } = useLoaderData<typeof loader>();
  const loading = useNavigation().state !== 'idle';
  return <Layout user={user}><main className="mx-auto max-w-7xl space-y-6">
    <h1 className="text-3xl font-bold text-white">Search</h1>
    <Form method="get" role="search" className="flex gap-3"><input name="q" defaultValue={q} placeholder="Search videos" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-dark-900 px-4 py-3 text-white" /><button className="btn-primary" type="submit">Search</button></Form>
    {error && <p role="alert" className="text-red-300">{error}</p>}
    {loading && <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"><VideoSkeleton count={6} /></section>}
    {!loading && (!q ? <p className="text-dark-300">Search titles and descriptions across published videos.</p> : videos.length ? <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{videos.map((video: any) => <VideoCard key={video.id || video._id} id={video.id || video._id} title={video.title} thumbnailUrl={video.thumbnailUrl} channelName={video.channel?.name || 'Creator'} channelId={video.channel?.id} views={video.views || 0} createdAt={video.publishedAt || ''} duration={video.durationSeconds || 0} />)}</section> : !error && <p className="text-dark-300">No videos found for “{q}”.</p>)}
    <Link to="/" className="text-primary-300">Back to home</Link>
  </main></Layout>;
}
