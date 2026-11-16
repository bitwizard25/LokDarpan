import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { Link, useLoaderData } from '@remix-run/react';
import { Layout } from '~/components/Layout/Layout';
import { HlsPlayer } from '~/components/VideoPlayer/HlsPlayer';
import { getServerApiBaseUrl } from '~/lib/api';
import { getUserFromSession } from '~/services/auth.server';

export async function loader({ request, params }: LoaderFunctionArgs) {
  const session = await getUserFromSession(request);
  const response = await fetch(`${getServerApiBaseUrl()}/video/${params.videoId}`, { headers: session ? { Authorization: `Bearer ${session.token}` } : {} });
  if (response.status === 404) throw new Response('Short not found', { status: 404 });
  if (!response.ok) throw new Response('Could not load short', { status: response.status });
  const data = await response.json();
  if (data.video.type !== 'short') throw new Response('This video is not a Short', { status: 404 });
  return json({ user: session?.user || null, video: data.video });
}

export default function ShortDetail() {
  const { user, video } = useLoaderData<typeof loader>();
  const src = video.hlsMasterUrl || video.videoUrl;
  return <Layout user={user} hideSidebar><main className="mx-auto flex max-w-5xl flex-col gap-5"><Link to="/shorts" className="text-primary-300">← All Shorts</Link><div className="mx-auto aspect-[9/16] w-full max-w-[420px] overflow-hidden rounded-3xl bg-black">{src ? src.includes('.m3u8') ? <HlsPlayer src={src} poster={video.thumbnailUrl} className="h-full w-full object-cover" autoPlay /> : <video src={src} poster={video.thumbnailUrl} controls autoPlay playsInline className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center p-6 text-center text-white">This Short is still processing.</div>}</div><section className="mx-auto w-full max-w-[420px]"><h1 className="text-xl font-bold text-white">{video.title}</h1><p className="mt-1 text-sm text-dark-300">{video.channel?.name || 'Creator'} · {video.views || 0} views</p><p className="mt-3 whitespace-pre-wrap text-dark-200">{video.description}</p></section></main></Layout>;
}
