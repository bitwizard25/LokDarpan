import { Link } from "@remix-run/react";
import { useState } from "react";
import { Play } from "~/components/icons";

export interface FeaturedItem {
    id: string;
    title: string;
    description: string;
    imageUrl?: string;
    channelName: string;
    watching?: string;
    isLive?: boolean;
    views?: number;
    presenters?: string;
    language?: string;
}

/** Single featured stream: left-aligned copy over artwork, one primary action, expandable details. */
export function FeaturedHero({ item }: { item: FeaturedItem }) {
    const [infoOpen, setInfoOpen] = useState(false);

    return (
        <div className="flex flex-col gap-4">
            <section
                aria-label="Featured"
                className="relative flex items-end overflow-hidden rounded-[20px] bg-dark-900 min-h-[clamp(400px,40vw,560px)]"
            >
                {item.imageUrl && (
                    <img src={item.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
                )}
                <div
                    className="absolute inset-0"
                    style={{
                        background:
                            "linear-gradient(90deg,rgba(9,9,11,.92) 0%,rgba(9,9,11,.55) 50%,rgba(9,9,11,0) 80%),linear-gradient(0deg,rgba(9,9,11,.9) 0%,rgba(9,9,11,0) 55%)",
                    }}
                />

                <div className="relative flex flex-col items-start gap-4 max-w-[640px] p-[clamp(24px,4vw,48px)]">
                    <div className="flex items-center gap-2 text-sm text-dark-200">
                        {item.isLive && <span className="px-2 py-0.5 rounded bg-primary-600 text-white text-xs font-bold tracking-wider">LIVE</span>}
                        {item.channelName} · {item.isLive ? `${item.watching || '0'} watching` : `${Intl.NumberFormat('en-US', { notation: 'compact' }).format(item.views || 0)} views`}
                    </div>

                    <h1 className="font-display font-bold text-white tracking-tight leading-[1.08] text-[clamp(31px,4.5vw,49px)] text-balance m-0">
                        {item.title}
                    </h1>

                    <p className="m-0 text-base leading-normal text-dark-200 max-w-[52ch] line-clamp-2">{item.description}</p>

                    <div className="flex flex-wrap gap-4">
                        <Link
                            to={`/watch/${item.id}`}
                            className="h-12 px-6 flex items-center gap-2 rounded-full bg-primary-600 text-white font-semibold text-base no-underline transition-all hover:brightness-110 active:scale-95"
                        >
                            <Play size={20} />
                            Watch now
                        </Link>
                        <button
                            type="button"
                            onClick={() => setInfoOpen((o) => !o)}
                            aria-expanded={infoOpen}
                            className="h-12 px-6 rounded-full border-0 bg-white/15 hover:bg-white/25 text-white font-semibold text-base cursor-pointer transition-colors"
                        >
                            {infoOpen ? "Less info" : "More info"}
                        </button>
                    </div>
                </div>
            </section>

            {infoOpen && (
                <section
                    aria-label="More info"
                    className="grid gap-6 p-6 rounded-2xl bg-dark-900 border border-white/5 grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))]"
                >
                    <div className="flex flex-col gap-2 md:col-span-2">
                        <div className="text-white font-semibold">About this video</div>
                        <p className="m-0 text-dark-200 leading-relaxed max-w-[65ch]">{item.description}</p>
                    </div>
                    <div className="flex flex-col gap-2">
                        {item.presenters && (
                            <>
                                <div className="text-white font-semibold">Presented by</div>
                                <div className="text-dark-200">{item.presenters}</div>
                            </>
                        )}
                        {item.language && (
                            <>
                                <div className="text-white font-semibold mt-2">Language</div>
                                <div className="text-dark-200">{item.language}</div>
                            </>
                        )}
                    </div>
                </section>
            )}
        </div>
    );
}
