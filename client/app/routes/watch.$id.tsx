import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useFetcher, Link, useLocation } from "@remix-run/react";
import { useRef, useState } from "react";
import { Layout } from "~/components/Layout/Layout";
import { getUserFromSession } from "~/services/auth.server";
import { getServerApiBaseUrl } from "~/lib/api";
import { HlsPlayer } from "~/components/VideoPlayer/HlsPlayer";
import { VideoCard } from "~/components/VideoCard/VideoCard";
import { usePlaybackTracking } from "~/hooks/usePlaybackTracking";
import type { Tracking } from "~/lib/tracker.client";

type WatchActionData = { error?: string; ok?: boolean; intent?: string };

export const meta: MetaFunction<typeof loader> = ({ data }) => {
    return [
        { title: data?.video?.title ? `${data.video.title} - LokDarpan` : "Watch - LokDarpan" },
        { name: "description", content: data?.video?.description || "Watch this video on LokDarpan" },
    ];
};

export async function loader({ params, request }: LoaderFunctionArgs) {
    const userSession = await getUserFromSession(request);
    const videoId = params.id;
    if (!videoId) {
        throw new Response("Not found", { status: 404 });
    }

    const base = getServerApiBaseUrl();
    const headers: HeadersInit = userSession ? { Authorization: `Bearer ${userSession.token}` } : {};
    const res = await fetch(`${base}/video/${videoId}`, { headers });
    if (!res.ok) {
        throw new Response("Not found", { status: 404 });
    }
    const data = (await res.json()) as { video: Record<string, unknown> };
    const v = data.video;
    const user = v.user_id as { name?: string; channel?: { name?: string; logoUrl?: string } } | undefined;

    const channelName =
        (v.channelName as string) ||
        user?.channel?.name ||
        user?.name ||
        "Creator";
    const channelLogo = (v.channelLogo as string) || user?.channel?.logoUrl;

    const video = {
        ...v,
        _id: String(v._id),
        title: String(v.title ?? ""),
        description: String(v.description ?? ""),
        channelName,
        channelLogo,
        subscribers: 0,
        views: typeof v.views === "number" ? v.views : 0,
        likes: typeof v.likes === "number" ? v.likes : 0,
        dislikes: typeof v.dislikes === "number" ? v.dislikes : 0,
        videoUrl: (v.hlsMasterUrl as string) || (v.videoUrl as string) || "",
        thumbnailUrl: v.thumbnailUrl as string | undefined,
        duration: (v.durationSeconds as number) || (v.duration as number),
        status: v.status as string | undefined,
        processingError: v.processingError as string | undefined,
        createdAt: typeof v.createdAt === "string" ? v.createdAt : new Date().toISOString(),
        reaction: (v.reaction as "like" | "dislike" | null) || null,
        isSubscribed: Boolean(v.isSubscribed),
    };

    const [commentsResponse, savedResponse, relatedResponse] = await Promise.all([
        fetch(`${base}/comment/${videoId}/comments?limit=30`),
        userSession ? fetch(`${base}/user/me/saved-videos?limit=50`, { headers }) : Promise.resolve(null),
        fetch(`${base}/video/${videoId}/related?limit=12`, { headers }),
    ]);
    const commentsData = commentsResponse.ok ? await commentsResponse.json() : { items: [] };
    const savedData = savedResponse?.ok ? await savedResponse.json() : { items: [] };
    const relatedData = relatedResponse.ok ? await relatedResponse.json() : { items: [], requestId: '' };
    const isSaved = Boolean(savedData.items?.some((item: { id?: string }) => item.id === videoId));

    return json({
        video,
        user: userSession?.user || null,
        isSaved,
        comments: commentsData.items || [],
        related: relatedData.items || relatedData.videos || [],
        relatedRequestId: relatedData.requestId || '',
    });
}

export async function action({ request, params }: ActionFunctionArgs) {
    const session = await getUserFromSession(request);
    if (!session) return json<WatchActionData>({ error: 'Sign in to use this action.' }, { status: 401 });
    const form = await request.formData();
    const intent = String(form.get('intent') || '');
    const base = getServerApiBaseUrl();
    const headers = { Authorization: `Bearer ${session.token}`, 'Content-Type': 'application/json' };
    let response: Response;
    if (intent === 'reaction') {
        const reaction = String(form.get('reaction'));
        response = form.get('current') === reaction
            ? await fetch(`${base}/video/${params.id}/reaction`, { method: 'DELETE', headers })
            : await fetch(`${base}/video/${params.id}/reaction`, { method: 'PUT', headers, body: JSON.stringify({ reaction }) });
    } else if (intent === 'save') {
        response = await fetch(`${base}/user/me/saved-videos/${params.id}`, { method: form.get('saved') === 'true' ? 'DELETE' : 'PUT', headers });
    } else if (intent === 'comment') {
        response = await fetch(`${base}/comment/${params.id}/comments`, { method: 'POST', headers, body: JSON.stringify({ comment_text: String(form.get('comment_text') || '') }) });
    } else if (intent === 'history') {
        response = await fetch(`${base}/user/me/history`, { method: 'PUT', headers, body: JSON.stringify({ videoId: params.id, positionSeconds: Number(form.get('positionSeconds')) }) });
    } else return json<WatchActionData>({ error: 'Unknown action.' }, { status: 400 });
    if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        return json<WatchActionData>({ error: body.error?.message || body.message || 'The action could not be completed.' }, { status: response.status });
    }
    return json<WatchActionData>({ ok: true, intent });
}

function formatViews(views: number): string {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(0)}K`;
    return `${views}`;
}

function formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    const intervals = [
        { label: "year", seconds: 31536000 },
        { label: "month", seconds: 2592000 },
        { label: "week", seconds: 604800 },
        { label: "day", seconds: 86400 },
        { label: "hour", seconds: 3600 },
        { label: "minute", seconds: 60 },
    ];

    for (const interval of intervals) {
        const count = Math.floor(seconds / interval.seconds);
        if (count >= 1) {
            return `${count} ${interval.label}${count > 1 ? "s" : ""} ago`;
        }
    }
    return "Just now";
}

export default function Watch() {
    const { video, user, isSaved, comments, related, relatedRequestId } = useLoaderData<typeof loader>();
    const fetcher = useFetcher<typeof action>();
    const historyFetcher = useFetcher<typeof action>();
    const location = useLocation();
    const rec = (location.state as { rec?: Tracking } | null)?.rec;
    const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);

    usePlaybackTracking(videoEl, {
        video: video._id,
        durationSeconds: video.duration || 0,
        rec,
    });

    const actionData = fetcher.data;
    const lastHistoryUpdate = useRef(0);
    const [shareMessage, setShareMessage] = useState('');
    const isLiked = video.reaction === 'like';
    const isDisliked = video.reaction === 'dislike';
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [showFullDescription, setShowFullDescription] = useState(false);

    const playUrl = video.videoUrl || "";
    const isHls = playUrl.includes(".m3u8");
    const isProcessing =
        video.status === "PROCESSING" || video.status === "PENDING" || video.status === "UPLOADING";
    const isFailed = video.status === "FAILED";

    const shareVideo = async () => {
        try {
            if (navigator.share) await navigator.share({ title: video.title, url: window.location.href });
            else { await navigator.clipboard.writeText(window.location.href); setShareMessage('Link copied'); }
        } catch { setShareMessage('Unable to share this link'); }
    };

    const saveWatchPosition = (seconds: number) => {
        if (!user || seconds - lastHistoryUpdate.current < 15) return;
        lastHistoryUpdate.current = seconds;
        historyFetcher.submit({ intent: 'history', positionSeconds: String(Math.floor(seconds)) }, { method: 'post' });
    };

    return (
        <Layout user={user} hideSidebar>
            <div className="max-w-[1800px] mx-auto">
                <div className="flex flex-col xl:flex-row gap-6">
                    {/* Main content */}
                    <div className="flex-1 min-w-0">
                        {/* Video player */}
                        <div className="aspect-video bg-black rounded-2xl overflow-hidden mb-4 shadow-2xl">
                            {isFailed && (
                                <div className="w-full h-full flex items-center justify-center text-red-300 p-6 text-center">
                                    <p>
                                        This video failed processing.
                                        {video.processingError
                                             ? ` ${video.processingError}`
                                            : ""}
                                    </p>
                                </div>
                            )}
                            {isProcessing && !isFailed && (
                                <div className="w-full h-full flex items-center justify-center text-gray-300 p-6 text-center">
                                    <p>Video is still processing. Refresh in a moment.</p>
                                </div>
                            )}
                            {!isProcessing && !isFailed && isHls && playUrl && (
                                <HlsPlayer
                                    ref={setVideoEl}
                                    src={playUrl}
                                    poster={video.thumbnailUrl}
                                    className="w-full h-full object-contain"
                                    autoPlay
                                    onTimeUpdate={saveWatchPosition}
                                />
                            )}
                            {!isProcessing && !isFailed && !isHls && playUrl && (
                                <video
                                    ref={setVideoEl}
                                    src={playUrl}
                                    poster={video.thumbnailUrl}
                                    controls
                                    autoPlay
                                    onTimeUpdate={event => saveWatchPosition(event.currentTarget.currentTime)}
                                    className="w-full h-full object-contain"
                                />
                            )}
                            {!isProcessing && !isFailed && !playUrl && (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                    No playback URL yet
                                </div>
                            )}
                        </div>

                        {/* Video title */}
                        <h1 className="text-xl md:text-2xl font-bold text-white mb-3 leading-tight">
                            {video.title}
                        </h1>

                        {/* Channel info and actions */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                            {/* Channel */}
                            <div className="flex items-center gap-4">
                                <Link to={`/channel/${video.channelName}`} className="flex items-center gap-3 group">
                                    <div className="avatar-md bg-gradient-to-br from-primary-500 to-orange-500 flex items-center justify-center text-white font-semibold group-hover:shadow-glow transition-all">
                                        {video.channelLogo ? (
                                            <img src={video.channelLogo} alt={video.channelName} className="w-full h-full object-cover" />
                                        ) : (
                                            video.channelName.charAt(0).toUpperCase()
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-white group-hover:text-primary-400 transition-colors flex items-center gap-1">
                                            {video.channelName}
                                            <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                                            </svg>
                                        </p>
                                        <p className="text-sm text-gray-400">{formatViews(video.subscribers)} subscribers</p>
                                    </div>
                                </Link>

                                <button
                                    onClick={() => setIsSubscribed(!isSubscribed)}
                                    className={`px-5 py-2 rounded-full font-medium text-sm transition-all duration-300 ${isSubscribed
                                            ? "bg-dark-800 text-white hover:bg-dark-700"
                                            : "bg-white text-black hover:bg-gray-200"
                                        }`}
                                >
                                    {isSubscribed ? "Subscribed" : "Subscribe"}
                                </button>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 flex-wrap">
                                {/* Like/Dislike */}
                                <div className="flex items-center bg-dark-800 rounded-full overflow-hidden">
                                    <fetcher.Form method="post">
                                        <input type="hidden" name="intent" value="reaction" /><input type="hidden" name="reaction" value="like" /><input type="hidden" name="current" value={video.reaction || ''} />
                                        <button type="submit"
                                        className={`flex items-center gap-2 px-4 py-2 hover:bg-dark-700 transition-colors ${isLiked ? "text-primary-400" : "text-white"
                                            }`}
                                    >
                                        <svg className={`w-5 h-5 ${isLiked ? "fill-current" : ""}`} fill={isLiked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                                        </svg>
                                        {formatViews(video.likes + (isLiked ? 1 : 0))}
                                        </button>
                                    </fetcher.Form>
                                    <div className="w-px h-6 bg-dark-700" />
                                    <fetcher.Form method="post">
                                        <input type="hidden" name="intent" value="reaction" /><input type="hidden" name="reaction" value="dislike" /><input type="hidden" name="current" value={video.reaction || ''} />
                                        <button type="submit"
                                        className={`px-4 py-2 hover:bg-dark-700 transition-colors ${isDisliked ? "text-primary-400" : "text-white"
                                            }`}
                                    >
                                        <svg className={`w-5 h-5 rotate-180 ${isDisliked ? "fill-current" : ""}`} fill={isDisliked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                                        </svg>
                                        </button>
                                    </fetcher.Form>
                                </div>

                                {/* Share */}
                                <button type="button" onClick={shareVideo} className="flex items-center gap-2 px-4 py-2 bg-dark-800 rounded-full hover:bg-dark-700 transition-colors">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z" />
                                    </svg>
                                    Share
                                </button>
                                {shareMessage && <span role="status" className="text-xs text-gray-300">{shareMessage}</span>}

                                {/* Save */}
                                <fetcher.Form method="post">
                                    <input type="hidden" name="intent" value="save" /><input type="hidden" name="saved" value={String(isSaved)} />
                                    <button type="submit" className="flex items-center gap-2 px-4 py-2 bg-dark-800 rounded-full hover:bg-dark-700 transition-colors">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                    </svg>
                                    {isSaved ? 'Saved' : 'Save'}
                                    </button>
                                </fetcher.Form>

                                {/* More */}
                                <button className="p-2 bg-dark-800 rounded-full hover:bg-dark-700 transition-colors">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Description */}
                        <div className="glass-card p-4 mb-6">
                            <div className="flex items-center gap-2 text-sm text-gray-300 mb-2">
                                <span className="font-medium">{formatViews(video.views)} views</span>
                                <span>•</span>
                                <span>{formatTimeAgo(video.createdAt)}</span>
                            </div>
                            <p className={`text-gray-300 whitespace-pre-wrap ${!showFullDescription ? "line-clamp-3" : ""}`}>
                                {video.description}
                            </p>
                            <button
                                onClick={() => setShowFullDescription(!showFullDescription)}
                                className="text-sm font-medium text-gray-400 hover:text-white mt-2"
                            >
                                {showFullDescription ? "Show less" : "...more"}
                            </button>
                        </div>

                        {/* Comments section — wire to API later */}
                        <div className="mb-6">
                            <h2 className="text-lg font-semibold text-white mb-4">Comments</h2>
                            {actionData?.error && <p role="alert" className="mb-3 text-sm text-red-300">{actionData.error}</p>}
                            {actionData?.ok && <p className="mb-3 text-sm text-emerald-300">{actionData.intent === 'comment' ? 'Comment posted.' : actionData.intent === 'save' ? 'Saved videos updated.' : 'Reaction updated.'}</p>}
                            {user ? <fetcher.Form method="post" className="mb-5 flex gap-3"><input type="hidden" name="intent" value="comment" /><input name="comment_text" required maxLength={1000} placeholder="Add a comment" className="min-w-0 flex-1 rounded-lg bg-dark-800 px-4 py-3 text-white" /><button type="submit" className="btn-primary">Post</button></fetcher.Form> : <Link to="/auth/login" className="mb-5 inline-block text-primary-300">Sign in to comment</Link>}
                            <div className="space-y-4">{comments.map((comment: any) => <article key={comment.id} className="rounded-xl bg-dark-900 p-4"><p className="text-sm font-semibold text-white">{comment.user?.name || 'LokDarpan member'}</p><p className="mt-2 whitespace-pre-wrap text-sm text-gray-300">{comment.comment_text}</p></article>)}{!comments.length && <p className="text-gray-500 text-sm">No comments yet.</p>}</div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="xl:w-[400px] flex-shrink-0 flex flex-col gap-4">
                        <h3 className="text-lg font-semibold text-white mb-2">Related Videos</h3>
                        {related && related.length > 0 ? (
                            <div className="flex flex-col gap-3">
                                {related.map((item: any, index: number) => (
                                    <div key={item.id} className="w-full">
                                        <VideoCard
                                            id={item.id}
                                            title={item.title}
                                            thumbnailUrl={item.thumbnailUrl}
                                            channelName={item.channel?.name || "Creator"}
                                            channelId={item.channel?.id || undefined}
                                            views={item.views}
                                            createdAt={item.publishedAt || ""}
                                            duration={item.durationSeconds}
                                            showSave={false}
                                            reason={item.rec?.reason}
                                            tracking={{
                                                requestId: relatedRequestId,
                                                surface: "related",
                                                position: index,
                                                source: "related",
                                            }}
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-500 text-sm">Browse the home feed for related videos.</p>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
}
