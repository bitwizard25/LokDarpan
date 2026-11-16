import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useFetcher, useLoaderData } from "@remix-run/react";
import { useEffect, useState } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { LazyImage } from "~/components/ui/lazy-image";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { Textarea } from "~/components/ui/textarea";
import { studioApi, type StudioVideo, type VideoVisibility } from "~/lib/api";
import { requireUserSession } from "~/services/auth.server";

type ActionResult = { ok: boolean; message?: string; error?: string };

export async function loader({ request }: LoaderFunctionArgs) {
    const { token } = await requireUserSession(request);
    const url = new URL(request.url);
    const q = url.searchParams.get("q") ?? "";
    const status = url.searchParams.get("status") ?? "";

    const res = await studioApi.myVideos(token, { q: q || undefined, status: status || undefined });
    if (res.status === 401) throw redirect("/auth/login");

    return json({
        videos: res.data?.items ?? [],
        hasMore: res.data?.hasMore ?? false,
        error: res.error,
        q,
        status,
    });
}

export async function action({ request }: ActionFunctionArgs) {
    const { token } = await requireUserSession(request);
    const form = await request.formData();
    const intent = String(form.get("intent") ?? "");
    const id = String(form.get("id") ?? "");
    if (!id) return json<ActionResult>({ ok: false, error: "Missing video id" }, { status: 400 });

    if (intent === "delete") {
        const res = await studioApi.deleteVideo(id, token);
        return json<ActionResult>(
            res.error ? { ok: false, error: res.error } : { ok: true, message: "Video deleted" },
            { status: res.error ? res.status || 400 : 200 },
        );
    }

    if (intent === "update") {
        const title = String(form.get("title") ?? "").trim();
        if (!title) return json<ActionResult>({ ok: false, error: "Title is required" }, { status: 400 });
        const tags = String(form.get("tags") ?? "")
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean);
        const language = String(form.get("language") ?? "und");
        const format = String(form.get("format") ?? "other");
        const res = await studioApi.updateVideo(
            id,
            {
                title,
                description: String(form.get("description") ?? "").trim(),
                visibility: String(form.get("visibility") ?? "public") as VideoVisibility,
                tags,
                language,
                format,
            },
            token,
        );
        return json<ActionResult>(
            res.error ? { ok: false, error: res.error } : { ok: true, message: "Video updated" },
            { status: res.error ? res.status || 400 : 200 },
        );
    }

    return json<ActionResult>({ ok: false, error: "Unknown action" }, { status: 400 });
}

const STATUS_LABEL: Record<string, string> = {
    published: "Published",
    processing: "Processing",
    uploading: "Uploading",
    failed: "Failed",
    unpublished: "Unpublished",
};

function formatDuration(s?: number) {
    if (!s) return "";
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

const idOf = (v: StudioVideo) => (v.id ?? v._id) as string;

export default function StudioVideos() {
    const { videos, error, q, status, hasMore } = useLoaderData<typeof loader>();
    const [editing, setEditing] = useState<StudioVideo | null>(null);
    const [deleting, setDeleting] = useState<StudioVideo | null>(null);

    return (
        <div className="flex flex-col gap-4">
            <Form method="get" className="flex flex-wrap gap-2">
                <Input name="q" defaultValue={q} placeholder="Search your videos" aria-label="Search your videos" className="max-w-xs" />
                <select
                    name="status"
                    defaultValue={status}
                    aria-label="Filter by status"
                    className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                >
                    <option value="" className="bg-dark-900">All statuses</option>
                    {Object.entries(STATUS_LABEL).map(([value, label]) => (
                        <option key={value} value={value} className="bg-dark-900">
                            {label}
                        </option>
                    ))}
                </select>
                <Button type="submit" variant="secondary">Filter</Button>
            </Form>

            {error && <p role="alert" className="text-sm text-red-400">{error}</p>}

            {videos.length === 0 && !error ? (
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 py-16 text-center">
                    <h2 className="text-lg font-semibold text-white">No videos found</h2>
                    <p className="text-sm text-dark-400">Upload your first video to see it here.</p>
                    <Button asChild>
                        <Link to="/upload">Upload video</Link>
                    </Button>
                </div>
            ) : videos.length > 0 ? (
                <div className="rounded-2xl border border-white/10">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Video</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="hidden md:table-cell">Visibility</TableHead>
                                <TableHead className="hidden md:table-cell text-right">Views</TableHead>
                                <TableHead className="hidden lg:table-cell">Uploaded</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {videos.map((v) => (
                                <TableRow key={idOf(v)}>
                                    <TableCell>
                                        <div className="flex items-center gap-3 min-w-0">
                                            <LazyImage
                                                src={v.thumbnailUrl}
                                                wrapperClassName="w-28 shrink-0 aspect-video rounded-md bg-dark-800"
                                            />
                                            <div className="min-w-0">
                                                <Link
                                                    to={`/watch/${idOf(v)}`}
                                                    className="block truncate font-medium text-white hover:underline"
                                                >
                                                    {v.title}
                                                </Link>
                                                <span className="text-xs text-dark-400">{formatDuration(v.duration)}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={v.status === "failed" ? "destructive" : "secondary"}>
                                            {STATUS_LABEL[v.status] ?? v.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell capitalize">{v.visibility ?? "public"}</TableCell>
                                    <TableCell className="hidden md:table-cell text-right">{(v.views ?? 0).toLocaleString()}</TableCell>
                                    <TableCell className="hidden lg:table-cell">
                                        {new Date(v.createdAt).toLocaleDateString("en-IN")}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button size="sm" variant="ghost" onClick={() => setEditing(v)}>
                                                Edit
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-red-400 hover:text-red-300"
                                                onClick={() => setDeleting(v)}
                                            >
                                                Delete
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            ) : null}

            {hasMore && (
                <p className="text-xs text-dark-400">
                    Showing the first {videos.length} videos. Use search to find others.
                </p>
            )}

            <EditVideoDialog video={editing} onClose={() => setEditing(null)} />
            <DeleteVideoDialog video={deleting} onClose={() => setDeleting(null)} />
        </div>
    );
}

function EditVideoDialog({ video, onClose }: { video: StudioVideo | null; onClose: () => void }) {
    const fetcher = useFetcher<ActionResult>();
    const [visibility, setVisibility] = useState<VideoVisibility>("public");
    const [language, setLanguage] = useState<string>("und");
    const [format, setFormat] = useState<string>("other");

    useEffect(() => {
        if (video) {
            setVisibility(video.visibility ?? "public");
            setLanguage(video.language ?? "und");
            setFormat(video.format ?? "other");
        }
    }, [video]);

    useEffect(() => {
        if (fetcher.state === "idle" && fetcher.data?.ok) onClose();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fetcher.state, fetcher.data]);

    return (
        <Dialog open={!!video} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Edit video</DialogTitle>
                    <DialogDescription>Changes appear on the watch page and in feeds.</DialogDescription>
                </DialogHeader>
                {video && (
                    <fetcher.Form method="post" className="flex flex-col gap-4">
                        <input type="hidden" name="intent" value="update" />
                        <input type="hidden" name="id" value={idOf(video)} />
                        <input type="hidden" name="visibility" value={visibility} />
                        <input type="hidden" name="language" value={language} />
                        <input type="hidden" name="format" value={format} />
                        <div className="grid gap-2">
                            <Label htmlFor="edit-title">Title</Label>
                            <Input id="edit-title" name="title" defaultValue={video.title} required maxLength={200} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-desc">Description</Label>
                            <Textarea id="edit-desc" name="description" defaultValue={video.description} rows={4} maxLength={5000} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-tags">Tags (comma separated)</Label>
                            <Input id="edit-tags" name="tags" defaultValue={video.tags?.join(", ")} />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="edit-language">Language</Label>
                                <Select value={language} onValueChange={setLanguage}>
                                    <SelectTrigger id="edit-language">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="hi">Hindi</SelectItem>
                                        <SelectItem value="mr">Marathi</SelectItem>
                                        <SelectItem value="en">English</SelectItem>
                                        <SelectItem value="und">Not sure</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="edit-format">Format</Label>
                                <Select value={format} onValueChange={setFormat}>
                                    <SelectTrigger id="edit-format">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="explainer">Explainers</SelectItem>
                                        <SelectItem value="story">Stories</SelectItem>
                                        <SelectItem value="discussion">Discussions</SelectItem>
                                        <SelectItem value="tutorial">How-to videos</SelectItem>
                                        <SelectItem value="performance">Performances</SelectItem>
                                        <SelectItem value="update">Quick updates</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-visibility">Visibility</Label>
                            <Select value={visibility} onValueChange={(value) => setVisibility(value as VideoVisibility)}>
                                <SelectTrigger id="edit-visibility">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="public">Public</SelectItem>
                                    <SelectItem value="unlisted">Unlisted</SelectItem>
                                    <SelectItem value="private">Private</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {fetcher.data?.error && (
                            <p role="alert" className="text-sm text-red-400">{fetcher.data.error}</p>
                        )}
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={fetcher.state !== "idle"}>
                                {fetcher.state !== "idle" ? "Saving…" : "Save changes"}
                            </Button>
                        </DialogFooter>
                    </fetcher.Form>
                )}
            </DialogContent>
        </Dialog>
    );
}

function DeleteVideoDialog({ video, onClose }: { video: StudioVideo | null; onClose: () => void }) {
    const fetcher = useFetcher<ActionResult>();

    useEffect(() => {
        if (fetcher.state === "idle" && fetcher.data?.ok) onClose();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fetcher.state, fetcher.data]);

    return (
        <AlertDialog open={!!video} onOpenChange={(open) => !open && onClose()}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete this video?</AlertDialogTitle>
                    <AlertDialogDescription>
                        &ldquo;{video?.title}&rdquo; will be removed permanently. This cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                {fetcher.data?.error && (
                    <p role="alert" className="text-sm text-red-400">{fetcher.data.error}</p>
                )}
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        className="bg-red-600 hover:bg-red-700 text-white"
                        disabled={fetcher.state !== "idle"}
                        onClick={(event) => {
                            event.preventDefault();
                            if (video) fetcher.submit({ intent: "delete", id: idOf(video) }, { method: "post" });
                        }}
                    >
                        {fetcher.state !== "idle" ? "Deleting…" : "Delete"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
