import { json, redirect, type LoaderFunctionArgs } from '@remix-run/node';
import { Link, useLoaderData, useNavigation } from '@remix-run/react';
import { Layout } from '~/components/Layout/Layout';
import { VideoCard } from '~/components/VideoCard/VideoCard';
import { VideoSkeleton } from '~/components/VideoSkeleton/VideoSkeleton';
import { getServerApiBaseUrl } from '~/lib/api';
import { getUserFromSession } from '~/services/auth.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getUserFromSession(request);
  if (!session) throw redirect('/auth/login?redirectTo=%2Fhistory');
  const response = await fetch(`${getServerApiBaseUrl()}/user/me/history?limit=30`, { headers: { Authorization: `Bearer ${session.token}` } });
  const result = response.ok ? await response.json() : { items: [] };
  return json({ user: session.user, items: result.items || [], error: response.ok ? null : 'Could not load watch history.' });
}

export default function HistoryPage() {
  const { user, items, error } = useLoaderData<typeof loader>();
  const loading = useNavigation().state !== 'idle';
  return (
    <Layout user={user}>
      <main className="mx-auto max-w-7xl space-y-6">
        <h1 className="text-3xl font-bold text-white">Watch history</h1>
        {error && <p role="alert" className="text-red-300">{error}</p>}
        {loading ? (
          <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <VideoSkeleton count={6} />
          </section>
        ) : items.length ? (
          <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.filter((item: any) => !item.unavailable).map((video: any) => (
              <VideoCard
                key={video.id}
                id={video.id}
                title={video.title}
                thumbnailUrl={video.thumbnailUrl}
                channelName={video.channel?.name || 'Creator'}
                channelId={video.channel?.id}
                views={video.views || 0}
                createdAt={video.publishedAt || ''}
                duration={video.durationSeconds || 0}
              />
            ))}
          </section>
        ) : (
          <div className="rounded-2xl bg-dark-900 p-8 text-dark-300">
            Videos you watch will appear here. <Link to="/" className="text-primary-300">Browse videos</Link>
          </div>
        )}
      </main>
    </Layout>
  );
}
