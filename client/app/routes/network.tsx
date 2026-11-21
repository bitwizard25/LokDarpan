import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from '@remix-run/node';
import { Form, Link, useActionData, useLoaderData } from '@remix-run/react';
import { Layout } from '~/components/Layout/Layout';
import { getServerApiBaseUrl } from '~/lib/api';
import { getUserFromSession } from '~/services/auth.server';

type NetworkActionData = { error?: string; ok?: boolean; message?: string };

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getUserFromSession(request);
  if (!session) throw redirect('/auth/login?redirectTo=%2Fnetwork');
  const base = getServerApiBaseUrl();
  const headers = { Authorization: `Bearer ${session.token}` };
  const [created, joined, invites] = await Promise.all([
    fetch(`${base}/user/me/networks?relation=created`, { headers }),
    fetch(`${base}/user/me/networks?relation=joined`, { headers }),
    fetch(`${base}/user/me/network-invitations`, { headers }),
  ]);
  return json({ user: session.user, created: created.ok ? (await created.json()).items : [], joined: joined.ok ? (await joined.json()).items : [], invites: invites.ok ? (await invites.json()).items : [] });
}

export async function action({ request }: ActionFunctionArgs) {
  const session = await getUserFromSession(request);
  if (!session) throw redirect('/auth/login?redirectTo=%2Fnetwork');
  const form = await request.formData();
  const intent = String(form.get('intent') || 'create');
  if (intent === 'accept' || intent === 'decline') {
    const invitationId = String(form.get('invitationId') || '');
    const result = await fetch(`${getServerApiBaseUrl()}/network-invitations/${invitationId}/${intent}`, { method: 'POST', headers: { Authorization: `Bearer ${session.token}` } });
    if (!result.ok) return json<NetworkActionData>({ error: 'Could not update the invitation.' }, { status: result.status });
    return json<NetworkActionData>({ ok: true, message: intent === 'accept' ? 'Invitation accepted.' : 'Invitation declined.' });
  }
  const response = await fetch(`${getServerApiBaseUrl()}/network`, { method: 'POST', headers: { Authorization: `Bearer ${session.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: form.get('name'), description: form.get('description'), visibility: 'private' }) });
  if (!response.ok) return json<NetworkActionData>({ error: 'Could not create the network. Check its name and try again.' }, { status: response.status });
  const data = await response.json();
  return redirect(`/network/${data.network.id || data.network._id}`);
}

export default function NetworkIndex() {
  const { user, created, joined, invites } = useLoaderData<typeof loader>();
  const result = useActionData<NetworkActionData>();
  return <Layout user={user}><main className="mx-auto max-w-5xl space-y-8"><h1 className="text-3xl font-bold text-white">Networks</h1><Form method="post" className="grid gap-3 rounded-2xl bg-dark-900 p-5 sm:grid-cols-3"><input type="hidden" name="intent" value="create" /><input name="name" required maxLength={80} placeholder="Network name" className="rounded-lg bg-black/30 px-3 py-2 text-white" /><input name="description" maxLength={500} placeholder="Description" className="rounded-lg bg-black/30 px-3 py-2 text-white" /><button className="btn-primary" type="submit">Create network</button>{result?.error && <p role="alert" className="text-red-300 sm:col-span-3">{result.error}</p>}</Form><NetworkList title="Created by you" rows={created} /><NetworkList title="Joined" rows={joined} /><section className="space-y-3"><h2 className="text-xl font-semibold text-white">Invitations</h2>{result?.ok && <p role="status" className="text-emerald-300">{result.message}</p>}{invites.length ? invites.map((invite: any) => <div key={invite.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-dark-900 p-4 text-dark-200"><span className="flex-1">{invite.network?.name} · invited by {invite.inviter?.name}</span>{(['accept', 'decline'] as const).map(intent => <Form key={intent} method="post"><input type="hidden" name="intent" value={intent} /><input type="hidden" name="invitationId" value={invite.id} /><button type="submit" className={intent === 'accept' ? 'btn-primary' : 'btn-secondary'}>{intent === 'accept' ? 'Accept' : 'Decline'}</button></Form>)}</div>) : <p className="text-dark-400">No pending invitations.</p>}</section></main></Layout>;
}

function NetworkList({ title, rows }: { title: string; rows: any[] }) {
  return <section className="space-y-3"><h2 className="text-xl font-semibold text-white">{title}</h2>{rows.length ? rows.map((network: any) => <Link key={network.id} to={`/network/${network.id}`} className="block rounded-xl bg-dark-900 p-4 text-white hover:bg-dark-800"><span className="font-semibold">{network.name}</span><span className="ml-3 text-dark-400">{network.memberCount} members</span></Link>) : <p className="text-dark-400">Nothing here yet.</p>}</section>;
}
