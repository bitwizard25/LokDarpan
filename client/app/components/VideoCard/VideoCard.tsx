import { Link } from "@remix-run/react";
import { useState, useRef } from "react";
import { Plus, Check, Play } from "~/components/icons";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { LazyImage } from "~/components/ui/lazy-image";
import { cn } from "~/lib/utils";
import { track, type Tracking } from "~/lib/tracker.client";
import { useImpression } from "~/hooks/useImpression";

interface VideoCardProps {
    id: string;
    title: string;
    thumbnailUrl?: string;
    channelName: string;
    channelId?: string;
    showSave?: boolean;
    channelLogo?: string;
    views: number;
    createdAt: string;
    duration?: number;
    isLive?: boolean;
    progress?: number;
    featured?: boolean; // bento layout: large horizontal card
    tracking?: Tracking;
}

export function VideoCard({
    id,
    title,
    thumbnailUrl,
    channelName,
    channelId,
    showSave = true,
    views,
    duration,
    isLive = false,
    progress = 0,
    featured = false,
    tracking,
}: VideoCardProps) {
    const [added, setAdded] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);

    useImpression(cardRef, tracking, id);

    const handleClick = () => {
        if (tracking) {
            track({
                type: "click",
                video: id,
                surface: tracking.surface,
                requestId: tracking.requestId,
                position: tracking.position,
                source: tracking.source,
            });
        }
    };

    const linkState = tracking ? { rec: tracking } : undefined;

    const thumb = (
        <Link
            to={`/watch/${id}`}
            state={linkState}
            onClick={handleClick}
            aria-label={title}
            className={`relative block overflow-hidden rounded-[10px] bg-dark-800 ${featured ? "md:w-3/5 md:h-full aspect-video md:aspect-auto" : "aspect-video"}`}
        >
            {thumbnailUrl ? (
                <LazyImage src={thumbnailUrl} wrapperClassName="w-full h-full" />
            ) : (
                <div className="w-full h-full flex items-center justify-center">
                    <Play size={40} className="text-dark-600 opacity-60" />
                </div>
            )}

            {!isLive && duration ? (
                <span className="absolute right-2 bottom-2 px-1.5 py-0.5 rounded-md bg-black/80 text-white text-xs font-semibold">
                    {formatDuration(duration)}
                </span>
            ) : null}

            {progress > 0 && (
                <span className="absolute left-0 right-0 bottom-0 h-1 bg-white/20">
                    <span className="block h-full bg-primary-500" style={{ width: `${Math.min(progress, 100)}%` }} />
                </span>
            )}
        </Link>
    );

    return (
        <Card
            ref={cardRef}
            className={cn(
                "flex flex-col gap-2 h-full box-border p-2 rounded-2xl bg-dark-900 border-white/5 shadow-none transition-all duration-200 hover:-translate-y-1 hover:border-white/20 motion-reduce:transition-none motion-reduce:hover:translate-y-0",
                featured && "md:flex-row md:col-span-2 md:row-span-2",
            )}
        >
            {thumb}

            <div className={`flex flex-col gap-1 px-1 pb-1 ${featured ? "md:w-2/5 md:justify-center md:p-6" : ""}`}>
                <Link
                    to={`/watch/${id}`}
                    state={linkState}
                    onClick={handleClick}
                    className={`text-white font-semibold leading-snug line-clamp-2 no-underline ${featured ? "text-2xl" : "text-base min-h-[2.6em]"}`}
                >
                    {title}
                </Link>

                <div className="flex items-center gap-2 min-h-8">
                    {isLive && (
                        <Badge className="shrink-0 rounded px-1.5 py-0.5 bg-primary-600 hover:bg-primary-600 text-white text-xs font-bold tracking-wider border-transparent">LIVE</Badge>
                    )}
                    <span className="flex-1 min-w-0 truncate text-sm text-dark-400">
                        {channelId ? <Link to={`/channel/${channelId}`} className="hover:text-white transition-colors">{channelName}</Link> : <span>{channelName}</span>}
                        {" · "}
                        {isLive ? `${formatCount(views)} watching` : `${formatCount(views)} views`}
                    </span>

                    {showSave && <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setAdded((a) => !a)}
                        aria-pressed={added}
                        aria-label={added ? "Remove from My List" : "Add to My List"}
                        title={added ? "In My List" : "Add to My List"}
                        className={cn("shrink-0 size-11 -my-1.5 -mr-2 rounded-full active:scale-90 transition-transform", added ? "bg-white/10 text-white" : "text-dark-400 hover:bg-white/10 hover:text-white")}
                    >
                        {added ? <Check size={18} /> : <Plus size={18} />}
                    </Button>}
                </div>
            </div>
        </Card>
    );
}

// Helpers
function formatCount(n: number): string {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return `${n}`;
}

function formatDuration(seconds?: number): string {
    if (!seconds) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
}
