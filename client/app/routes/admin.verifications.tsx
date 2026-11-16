import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import { Layout } from "~/components/Layout/Layout";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { verificationApi } from "~/lib/api";
import { requireUserSession } from "~/services/auth.server";

export const meta: MetaFunction = () => [{ title: "Verification requests - LokDarpan" }];

const STATUSES = ["pending", "approved", "rejected"] as const;
const DOC_LABEL: Record<string, string> = {
    passport: "Passport",
    driving_licence: "Driving licence",
    voter_id: "Voter ID",
    pan: "PAN card",
    aadhaar_masked: "Aadhaar (masked)",
};

type ActionData = { error?: string };

export async function loader({ request }: LoaderFunctionArgs) {
    const { token, user } = await requireUserSession(request);
    const url = new URL(request.url);
    const status = STATUSES.find((s) => s === url.searchParams.get("status")) ?? "pending";
    const id = url.searchParams.get("id");

    const list = await verificationApi.adminList(token, { status, cursor: url.searchParams.get("cursor") ?? undefined });
    if (list.status === 401) throw redirect("/auth/login");
    // Not an admin: the server answers 403. Don't reveal that the panel exists.
    if (list.status === 403) throw redirect("/");

    const detail = id ? await verificationApi.adminGet(id, token) : null;
    return json({
        user,
        status,
        items: list.data?.items ?? [],
        nextCursor: list.data?.nextCursor ?? null,
        listError: list.error,
        detail: detail?.data ?? null,
        detailError: detail?.error ?? null,
    });
}

export async function action({ request }: ActionFunctionArgs) {
    const { token } = await requireUserSession(request);
    const form = await request.formData();
    const intent = String(form.get("intent") ?? "");
    const id = String(form.get("id") ?? "");

    if (intent === "approve") {
        const res = await verificationApi.adminApprove(id, token);
        if (res.error) return json<ActionData>({ error: res.error }, { status: res.status || 400 });
        return redirect("/admin/verifications?status=pending");
    }
    if (intent === "reject") {
        const reason = String(form.get("reason") ?? "").trim();
        if (reason.length < 3) return json<ActionData>({ error: "Give a reason of at least 3 characters" }, { status: 400 });
        const res = await verificationApi.adminReject(id, reason, token);
        if (res.error) return json<ActionData>({ error: res.error }, { status: res.status || 400 });
        return redirect("/admin/verifications?status=pending");
    }
    return json<ActionData>({ error: "Unknown action" }, { status: 400 });
}

export default function AdminVerifications() {
    const { user, status, items, nextCursor, listError, detail, detailError } = useLoaderData<typeof loader>();
    const actionData = useActionData<typeof action>();
    const navigation = useNavigation();
    const busy = navigation.state === "submitting";

    return (
        <Layout user={user}>
            <div className="flex flex-col gap-6">
                <div>
                    <h1 className="font-display text-2xl font-semibold text-white">Verification requests</h1>
                    <p className="text-sm text-dark-400">Review ID photos submitted for manual identity verification.</p>
                </div>

                <nav className="flex gap-2" aria-label="Request status">
                    {STATUSES.map((s) => (
                        <Button key={s} asChild size="sm" variant={s === status ? "default" : "outline"}>
                            <Link to={`/admin/verifications?status=${s}`} className="capitalize">{s}</Link>
                        </Button>
                    ))}
                </nav>

                {listError && <p role="alert" className="text-sm text-red-400">{listError}</p>}

                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
                    <Card className="border-white/10 bg-dark-900">
                        <CardHeader>
                            <CardTitle className="capitalize">{status}</CardTitle>
                            <CardDescription>{items.length ? `${items.length} shown` : "Nothing here."}</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-2">
                            {items.map((r) => (
                                <Link
                                    key={r.id}
                                    to={`/admin/verifications?status=${status}&id=${r.id}`}
                                    className={`rounded-lg border p-3 text-sm transition-colors hover:bg-white/5 ${detail?.id === r.id ? "border-primary-500/60" : "border-white/10"}`}
                                >
                                    <div className="font-medium text-white">{r.legalName}</div>
                                    <div className="text-xs text-dark-400">
                                        {r.user.email ?? r.user.id} · {DOC_LABEL[r.documentType] ?? r.documentType} · {new Date(r.submittedAt).toLocaleString()}
                                    </div>
                                </Link>
                            ))}
                            {nextCursor && (
                                <Button asChild variant="outline" size="sm">
                                    <Link to={`/admin/verifications?status=${status}&cursor=${nextCursor}`}>Next page</Link>
                                </Button>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-white/10 bg-dark-900">
                        {detailError && <CardContent className="pt-6"><p role="alert" className="text-sm text-red-400">{detailError}</p></CardContent>}
                        {!detail && !detailError && (
                            <CardContent className="pt-6 text-sm text-dark-400">Select a request to review it.</CardContent>
                        )}
                        {detail && (
                            <>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        {detail.legalName}
                                        <Badge variant="outline" className="capitalize">{detail.status}</Badge>
                                    </CardTitle>
                                    <CardDescription>
                                        Account: {detail.user.name} ({detail.user.email}) · {DOC_LABEL[detail.documentType] ?? detail.documentType}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="flex flex-col gap-4">
                                    <a href={detail.documentUrl} target="_blank" rel="noreferrer noopener" className="block">
                                        <img
                                            src={detail.documentUrl}
                                            alt={`ID document for ${detail.legalName}`}
                                            className="max-h-96 w-full rounded-lg border border-white/10 object-contain bg-black"
                                        />
                                    </a>
                                    <p className="text-xs text-dark-400">The image link expires after 5 minutes. Reload this page for a new one.</p>

                                    {detail.status === "rejected" && detail.rejectionReason && (
                                        <p className="text-sm text-red-400">Rejected: {detail.rejectionReason}</p>
                                    )}

                                    {detail.status === "pending" && (
                                        <div className="flex flex-col gap-4">
                                            <p className="text-xs text-dark-400">
                                                Check that the name on the ID matches &ldquo;{detail.legalName}&rdquo; and that the photo is genuine and legible.
                                            </p>
                                            {actionData?.error && <p role="alert" className="text-sm text-red-400">{actionData.error}</p>}
                                            <Form method="post">
                                                <input type="hidden" name="intent" value="approve" />
                                                <input type="hidden" name="id" value={detail.id} />
                                                <Button type="submit" disabled={busy}>Approve</Button>
                                            </Form>
                                            <Form method="post" className="flex flex-col gap-2 border-t border-white/10 pt-4">
                                                <input type="hidden" name="intent" value="reject" />
                                                <input type="hidden" name="id" value={detail.id} />
                                                <Label htmlFor="reason">Reason for rejecting (shown to the user)</Label>
                                                <Textarea id="reason" name="reason" rows={2} maxLength={500} required />
                                                <div>
                                                    <Button type="submit" variant="destructive" disabled={busy}>Reject</Button>
                                                </div>
                                            </Form>
                                        </div>
                                    )}
                                </CardContent>
                            </>
                        )}
                    </Card>
                </div>
            </div>
        </Layout>
    );
}
