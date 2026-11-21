import { json, redirect, type LoaderFunctionArgs } from '@remix-run/node';
import { Link, useLoaderData } from '@remix-run/react';
import { Layout } from '~/components/Layout/Layout';
import { getServerApiBaseUrl } from '~/lib/api';
import { getUserFromSession } from '~/services/auth.server';

export async function loader({ request, params }: LoaderFunctionArgs) {
  const session = await getUserFromSession(request);
  if (!session) throw redirect('/auth/login');
  const base = getServerApiBaseUrl();
  const headers = { Authorization: `Bearer ${session.token}` };
  const [networkResponse, memberResponse] = await Promise.all([
    fetch(`${base}/network/${params.networkId}`, { headers }),
    fetch(`${base}/network/${params.networkId}/members?limit=50`, { headers }),
  ]);
  if (networkResponse.status === 404) throw new Response('Network not found', { status: 404 });
  if (!networkResponse.ok) throw new Response('Could not load network', { status: networkResponse.status });
  const network = (await networkResponse.json()).network;
  const members = memberResponse.ok ? (await memberResponse.json()).items : [];
  return json({ user: session.user, network, members });
}

export default function NetworkDetail() {
  const { user, network, members } = useLoaderData<typeof loader>();
  return <Layout user={user}><main className="mx-auto max-w-5xl space-y-6"><Link to="/network" className="text-primary-300">← Networks</Link><header className="rounded-2xl bg-dark-900 p-7"><h1 className="text-3xl font-bold text-white">{network.name}</h1><p className="mt-2 text-dark-300">{network.description || 'Private network'} · {network.memberCount} members</p></header><section className="space-y-3"><h2 className="text-xl font-semibold text-white">Members</h2>{members.map((member: any) => <div key={member.id} className="flex items-center gap-3 rounded-xl bg-dark-900 p-4 text-white"><div className="flex size-10 items-center justify-center rounded-full bg-primary-500/20">{member.avatarUrl ? <img src={member.avatarUrl} alt="" className="size-10 rounded-full object-cover" /> : member.name?.[0]}</div><span>{member.name}</span><span className="ml-auto text-sm text-dark-400">{member.role}</span></div>)}</section></main></Layout>;
}
