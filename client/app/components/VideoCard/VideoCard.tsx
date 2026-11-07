import { Link } from "@remix-run/react";
import { useState } from "react";
import { Plus, Check, Play } from "@phosphor-icons/react";

interface VideoCardProps {
    id: string;
    title: string;
    thumbnailUrl?: string;
    channelName: string;
    channelLogo?: string;
    views: number;
    createdAt: string;
    duration?: number;
    isLive?: boolean;
    progress?: number;
    featured?: boolean; // bento layout: large horizontal card
}

export function VideoCard({
    id,
    title,
    thumbnailUrl,
    channelName,
    views,
    duration,
    isLive = false,
    progress = 0,
    featured = false,
}: VideoCardProps) {
    const [added, setAdded] = useState(false);

    const thumb = (
        <Link
            to={`/watch/${id}`}
            aria-label={title}
            className={`relative block overflow-hidden rounded-[10px] bg-dark-800 ${featured ? "md:w-3/5 md:h-full aspect-video md:aspect-auto" : "aspect-video"}`}
        >
            {thumbnailUrl ? (
                <img src={thumbnailUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
            ) : (
                <div className="w-full h-full flex items-center justify-center">
                    <Play size={40} weight="duotone" className="text-dark-600" />
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
        <article
            className={`flex flex-col gap-2 h-full box-border p-2 rounded-2xl bg-dark-900 border border-white/5 transition-all duration-200 hover:-translate-y-1 hover:border-white/20 motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${featured ? "md:flex-row md:col-span-2 md:row-span-2" : ""}`}
        >
            {thumb}

            <div className={`flex flex-col gap-1 px-1 pb-1 ${featured ? "md:w-2/5 md:justify-center md:p-6" : ""}`}>
                <Link
                    to={`/watch/${id}`}
                    className={`text-white font-semibold leading-snug line-clamp-2 no-underline ${featured ? "text-2xl" : "text-base min-h-[2.6em]"}`}
                >
                    {title}
                </Link>

                <div className="flex items-center gap-2 min-h-8">
                    {isLive && (
                        <span className="shrink-0 px-1.5 py-0.5 rounded bg-primary-600 text-white text-xs font-bold tracking-wider">LIVE</span>
                    )}
                    <span className="flex-1 min-w-0 truncate text-sm text-dark-400">
                        <Link to={`/channel/${channelName}`} className="hover:text-white transition-colors">{channelName}</Link>
                        {" · "}
                        {isLive ? `${formatCount(views)} watching` : `${formatCount(views)} views`}
                    </span>

                    <button
                        type="button"
                        onClick={() => setAdded((a) => !a)}
                        aria-pressed={added}
                        aria-label={added ? "Remove from My List" : "Add to My List"}
                        title={added ? "In My List" : "Add to My List"}
                        className={`shrink-0 w-11 h-11 -my-1.5 -mr-2 flex items-center justify-center rounded-full border-0 cursor-pointer transition-all duration-150 active:scale-90 ${added ? "bg-white/10 text-white" : "bg-transparent text-dark-400 hover:bg-white/10 hover:text-white"}`}
                    >
                        {added ? <Check size={20} weight="bold" /> : <Plus size={20} weight="light" />}
                    </button>
                </div>
            </div>
        </article>
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
