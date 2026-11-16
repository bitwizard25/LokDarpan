import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/node';
import { json } from '@remix-run/node';
import { Link, useLoaderData, useNavigation, useRevalidator } from '@remix-run/react';
import { useState, useEffect } from 'react';
import { Layout } from '~/components/Layout/Layout';
import { VideoCard } from '~/components/VideoCard/VideoCard';
import { VideoSkeleton, ShortsSkeleton } from '~/components/VideoSkeleton/VideoSkeleton';
import { LazyImage } from '~/components/ui/lazy-image';
import { FeaturedHero } from '~/components/Hero/FeaturedHero';
import { getUserFromSession } from '~/services/auth.server';
import { fetchHome, type HomeFeed } from '~/services/home.server';

export const meta: MetaFunction = () => [
    { title: 'LokDarpan - Share Your Vision' },
    { name: 'description', content: 'Discover videos from creators on LokDarpan.' },
];

export async function loader({ request }: LoaderFunctionArgs) {
    const session = await getUserFromSession(request);
    const category = new URL(request.url).searchParams.get('category') || 'all';
    let feed: HomeFeed | null = null;
    try {
        feed = await fetchHome(request, category);
    } catch (error) {
        console.error('Home feed could not be loaded:', error instanceof Error ? error.message : 'Unknown error');
    }
    return json({ user: session?.user || null, feed }, { status: feed ? 200 : 503 });
}

const RAIL_ITEM = 'min-w-0 shrink-0 grow-0 snap-start basis-[clamp(168px,calc((100%_-_80px)/4.5),300px)]';
const RAIL = 'flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory pt-1 pb-2';

export default function Index() {
    const { user, feed } = useLoaderData<typeof loader>();
    const navigation = useNavigation();
    const revalidator = useRevalidator();
    const loading = navigation.state !== 'idle' || revalidator.state !== 'idle';

    const forYouSection = feed?.sections.find((s) => s.id === 'for-you');
    const [extraForYou, setExtraForYou] = useState<any[]>([]);
    const [forYouCursor, setForYouCursor] = useState<string | null>(forYouSection?.nextCursor || null);
    const [hasMoreForYou, setHasMoreForYou] = useState<boolean>(Boolean(forYouSection?.hasMore));
    const [loadingMore, setLoadingMore] = useState(false);

    useEffect(() => {
        setExtraForYou([]);
        setForYouCursor(forYouSection?.nextCursor || null);
        setHasMoreForYou(Boolean(forYouSection?.hasMore));
    }, [feed?.requestId, forYouSection?.nextCursor, forYouSection?.hasMore]);

    const handleLoadMoreForYou = async () => {
        if (!forYouCursor || loadingMore) return;
        setLoadingMore(true);
        try {
            const res = await fetch(`/api/feed?cursor=${encodeURIComponent(forYouCursor)}`);
            if (res.status === 410) {
                revalidator.revalidate();
                return;
            }
            if (res.ok) {
                const data = await res.json();
                setExtraForYou((prev) => [...prev, ...(data.items || [])]);
                setForYouCursor(data.nextCursor || null);
                setHasMoreForYou(Boolean(data.hasMore));
            }
        } catch {
            // Ignore network errors
        } finally {
            setLoadingMore(false);
        }
    };

    const getSource = (secId: string, itemRecSource?: string) => {
        if (secId === 'for-you') return itemRecSource || 'interest';
        if (secId === 'popular') return 'trending';
        if (secId === 'latest') return 'fresh';
        if (secId === 'shorts') return 'shorts';
        return itemRecSource || secId;
    };

    return (
        <Layout user={user}>
            <div aria-live="polite" role="status">{loading ? 'Loading videos…' : ''}</div>
            {!feed ? (
                <section role="alert" className="rounded-2xl bg-dark-900 p-8">
                    <h1 className="text-2xl font-semibold text-white">Videos are temporarily unavailable</h1>
                    <p className="mt-2 text-dark-300">We couldn’t load the home feed. Please try again.</p>
                    <button type="button" className="btn-primary mt-4" disabled={loading} onClick={() => revalidator.revalidate()}>Try again</button>
                    <Link to="/" className="ml-4 text-white underline">Reset filters</Link>
                </section>
            ) : (
                <div className="flex flex-col gap-10" aria-busy={loading}>
                    {feed.featured && <FeaturedHero item={{
                        id: feed.featured.id, title: feed.featured.title, description: feed.featured.description,
                        imageUrl: feed.featured.thumbnailUrl || undefined, channelName: feed.featured.channel.name,
                        views: feed.featured.views,
                    }} />}
                    <nav aria-label="Video categories" className="flex gap-3 overflow-x-auto scrollbar-hide py-2">
                        {feed.categories.map(category => <Link
                            key={category.id} to={category.id === 'all' ? '/' : `/?category=${category.id}`} preventScrollReset
                            aria-current={feed.activeCategory === category.id ? 'page' : undefined}
                            className={`shrink-0 whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium border ${feed.activeCategory === category.id ? 'bg-white/10 text-white border-white/20' : 'bg-white/5 text-dark-200 border-white/5 hover:bg-white/10'}`}
                        >{category.label}</Link>)}
                    </nav>
                    {feed.sections.every(section => section.items.length === 0) && (
                        <section className="rounded-2xl bg-dark-900 p-8">
                            <h1 className="text-2xl font-semibold text-white">No videos yet</h1>
                            <p className="mt-2 text-dark-300">{feed.activeCategory === 'all' ? 'Published videos will appear here.' : 'There are no published videos in this category yet.'}</p>
                            {feed.activeCategory !== 'all' && <Link to="/" className="mt-4 inline-block text-white underline">Browse all videos</Link>}
                        </section>
                    )}
                    {feed.sections.filter(section => section.items.length > 0).map(section => {
                        const items = section.id === 'for-you' ? [...section.items, ...extraForYou] : section.items;

                        return (
                            <section key={section.id} className="flex flex-col gap-4" aria-label={section.title}>
                                <div className="flex items-center justify-between">
                                    <h2 className="m-0 font-display font-semibold text-white text-[clamp(20px,2vw,25px)]">{section.title}</h2>
                                    {section.id === 'for-you' && (
                                        <Link to="/settings" className="text-xs text-primary-400 hover:text-primary-300 hover:underline">
                                            Tune feed
                                        </Link>
                                    )}
                                </div>
                                <div className={RAIL}>
                                    {loading ? (section.type === 'short' ? <ShortsSkeleton count={5} /> : <VideoSkeleton count={5} />) : items.map((item, index) => section.type === 'short' ? (
                                        <Link key={item.id} to={`/watch/${item.id}`} aria-label={item.title} className="flex-none snap-start w-[clamp(140px,16vw,200px)] flex flex-col gap-2 no-underline">
                                            {item.thumbnailUrl ? <LazyImage src={item.thumbnailUrl} wrapperClassName="aspect-[9/16] rounded-2xl bg-dark-800 border border-white/5" /> : <div className="aspect-[9/16] rounded-2xl bg-dark-800" />}
                                            <span className="text-white font-semibold text-sm leading-snug line-clamp-2">{item.title}</span>
                                            <span className="text-dark-400 text-sm">{Intl.NumberFormat('en-US', { notation: 'compact' }).format(item.views)} views</span>
                                        </Link>
                                    ) : (
                                        <div key={item.id} className={RAIL_ITEM}>
                                            <VideoCard
                                                id={item.id}
                                                title={item.title}
                                                thumbnailUrl={item.thumbnailUrl || undefined}
                                                channelName={item.channel.name}
                                                channelId={item.channel.id || undefined}
                                                views={item.views}
                                                createdAt={item.publishedAt || ''}
                                                duration={item.durationSeconds}
                                                showSave={false}
                                                reason={item.rec?.reason}
                                                tracking={{
                                                    requestId: feed.requestId || '',
                                                    surface: 'home',
                                                    position: index,
                                                    source: getSource(section.id, item.rec?.source),
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                                {section.id === 'for-you' && hasMoreForYou && (
                                    <div className="flex justify-center pt-2">
                                        <button
                                            type="button"
                                            disabled={loadingMore}
                                            onClick={handleLoadMoreForYou}
                                            className="px-6 py-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition-colors disabled:opacity-50"
                                        >
                                            {loadingMore ? 'Loading…' : 'Load more'}
                                        </button>
                                    </div>
                                )}
                            </section>
                        );
                    })}
                </div>
            )}
        </Layout>
    );
}
