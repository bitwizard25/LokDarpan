import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { studioApi } from "~/lib/api";
import { requireUserSession } from "~/services/auth.server";

type ActionData = {
    ok?: boolean;
    message?: string;
    error?: string;
    fieldErrors?: Record<string, string>;
};

export async function loader({ request }: LoaderFunctionArgs) {
    const { token } = await requireUserSession(request);
    const res = await studioApi.getMyChannel(token);
    if (res.status === 401) throw redirect("/auth/login");
    // 404 = the signed-in user has no channel yet.
    let channel = res.data?.channel ?? null;
    if (channel) {
        // The self endpoint may omit counts; the public record has them.
        const pub = await studioApi.getChannel(String(channel.handle ?? channel._id ?? channel.id), token);
        if (pub.data?.channel) channel = { ...channel, ...pub.data.channel };
    }
    return json({ channel, noChannel: res.status === 404, error: res.status === 404 ? null : res.error });
}

export async function action({ request }: ActionFunctionArgs) {
    const { token } = await requireUserSession(request);
    const form = await request.formData();
    const intent = String(form.get("intent") ?? "");

    if (intent === "update") {
        const handle = String(form.get("handle") ?? "").trim().toLowerCase();
        const name = String(form.get("name") ?? "").trim();
        const fieldErrors: Record<string, string> = {};
        if (name.length < 3 || name.length > 50) fieldErrors.name = "Channel name must be 3-50 characters";
        if (handle && !/^[a-z0-9_]{3,30}$/.test(handle)) {
            fieldErrors.handle = "3-30 characters: lowercase letters, numbers and underscores";
        }
        const description = String(form.get("description") ?? "").trim();
        if (description.length > 1000) fieldErrors.description = "Keep the description under 1000 characters";
        if (Object.keys(fieldErrors).length) return json<ActionData>({ fieldErrors }, { status: 400 });

        const res = await studioApi.updateMyChannel(
            {
                name,
                handle: handle || undefined,
                description,
                avatarUrl: String(form.get("avatarUrl") ?? "").trim() || undefined,
                bannerUrl: String(form.get("bannerUrl") ?? "").trim() || undefined,
            },
            token,
        );
        if (res.error) {
            return json<ActionData>(
                res.status === 409 ? { fieldErrors: { handle: "That handle is already taken" } } : { error: res.error },
                { status: res.status || 400 },
            );
        }
        return json<ActionData>({ ok: true, message: "Channel updated" });
    }

    if (intent === "delete") {
        const res = await studioApi.deleteMyChannel(String(form.get("confirmHandle") ?? "").trim(), token);
        if (res.error) return json<ActionData>({ error: res.error }, { status: res.status || 400 });
        return redirect("/profile");
    }

    return json<ActionData>({ error: "Unknown action" }, { status: 400 });
}

export default function StudioChannel() {
    const { channel, noChannel, error } = useLoaderData<typeof loader>();
    const actionData = useActionData<typeof action>();
    const navigation = useNavigation();
    const saving = navigation.state === "submitting" && navigation.formData?.get("intent") === "update";
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [typed, setTyped] = useState("");

    if (noChannel) {
        return (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 py-16 text-center">
                <h2 className="text-lg font-semibold text-white">You don&apos;t have a channel yet</h2>
                <p className="text-sm text-dark-400">Create one to start uploading and building an audience.</p>
                <Button asChild>
                    <Link to="/channel/create">Create channel</Link>
                </Button>
            </div>
        );
    }

    if (!channel) {
        return <p role="alert" className="text-sm text-red-400">{error ?? "Could not load your channel."}</p>;
    }

    const handle = channel.handle ?? "";
    const fe = actionData?.fieldErrors ?? {};

    return (
        <div className="flex max-w-2xl flex-col gap-6">
            <Card className="border-white/10 bg-dark-900">
                <CardHeader>
                    <CardTitle>Channel details</CardTitle>
                    <CardDescription>
                        {(channel.subscriberCount ?? 0).toLocaleString()} subscribers ·{" "}
                        {(channel.videoCount ?? 0).toLocaleString()} videos
                        {(channel._id ?? channel.id) && (
                            <>
                                {" · "}
                                <Link className="underline" to={`/channel/${handle || channel._id || channel.id}`}>
                                    View public page
                                </Link>
                            </>
                        )}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form method="post" className="flex flex-col gap-4">
                        <input type="hidden" name="intent" value="update" />
                        <div className="grid gap-2">
                            <Label htmlFor="ch-name">Channel name</Label>
                            <Input id="ch-name" name="name" defaultValue={channel.name} required minLength={3} maxLength={50} />
                            {fe.name && <p role="alert" className="text-xs text-red-400">{fe.name}</p>}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="ch-handle">Handle</Label>
                            <Input id="ch-handle" name="handle" defaultValue={handle} placeholder="my_channel" />
                            {fe.handle && <p role="alert" className="text-xs text-red-400">{fe.handle}</p>}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="ch-desc">Description</Label>
                            <Textarea id="ch-desc" name="description" defaultValue={channel.description} rows={4} maxLength={1000} />
                            {fe.description && <p role="alert" className="text-xs text-red-400">{fe.description}</p>}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="ch-avatar">Avatar image URL</Label>
                            <Input id="ch-avatar" name="avatarUrl" type="url" defaultValue={channel.avatarUrl ?? channel.logoUrl} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="ch-banner">Banner image URL</Label>
                            <Input id="ch-banner" name="bannerUrl" type="url" defaultValue={channel.bannerUrl} />
                        </div>
                        {actionData?.error && <p role="alert" className="text-sm text-red-400">{actionData.error}</p>}
                        {actionData?.ok && <p role="status" className="text-sm text-emerald-400">{actionData.message}</p>}
                        <div>
                            <Button type="submit" disabled={saving}>
                                {saving ? "Saving…" : "Save changes"}
                            </Button>
                        </div>
                    </Form>
                </CardContent>
            </Card>

            <Card className="border-red-500/30 bg-dark-900">
                <CardHeader>
                    <CardTitle className="text-red-400">Delete channel</CardTitle>
                    <CardDescription>
                        Removes your channel and its subscribers. Your videos are made private, not deleted, and the channel cannot be restored.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
                        Delete channel
                    </Button>
                </CardContent>
            </Card>

            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete {channel.name}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Type <strong>{handle}</strong> to confirm.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <Form method="post" className="flex flex-col gap-4">
                        <input type="hidden" name="intent" value="delete" />
                        <Input
                            name="confirmHandle"
                            value={typed}
                            onChange={(e) => setTyped(e.target.value)}
                            aria-label="Type your channel handle to confirm"
                            autoComplete="off"
                        />
                        <AlertDialogFooter>
                            <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
                            <Button type="submit" variant="destructive" disabled={!handle || typed !== handle}>
                                Delete forever
                            </Button>
                        </AlertDialogFooter>
                    </Form>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
