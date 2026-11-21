import type { MetaFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useNavigation, Link } from "@remix-run/react";
import { Layout } from "~/components/Layout/Layout";
import { getUserFromSession } from "~/services/auth.server";
import { getServerApiBaseUrl } from "~/lib/api";
import {
    Music,
    Gaming,
    News,
    Film,
    Learning,
    Sports,
    TechChip,
    Comedy,
    Travel,
} from "~/components/icons";

export const meta: MetaFunction = () => {
    return [{ title: "Explore Topics - LokDarpan" }];
};

const DEFAULT_CATEGORIES = [
    { id: 'entertainment', label: 'Entertainment' },
    { id: 'education', label: 'Education' },
    { id: 'gaming', label: 'Gaming' },
    { id: 'music', label: 'Music' },
    { id: 'sports', label: 'Sports' },
    { id: 'technology', label: 'Technology' },
    { id: 'news', label: 'News' },
    { id: 'comedy', label: 'Comedy' },
    { id: 'film', label: 'Film & Animation' },
    { id: 'other', label: 'Other' },
];

export async function loader({ request }: LoaderFunctionArgs) {
    const userSession = await getUserFromSession(request);
    let categories = DEFAULT_CATEGORIES;
    let error: string | null = null;

    try {
        const response = await fetch(`${getServerApiBaseUrl()}/categories`);
        if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data.categories) && data.categories.length > 0) {
                categories = data.categories;
            }
        } else {
            error = 'Categories could not be loaded from server.';
        }
    } catch (err) {
        console.warn('Backend categories fetch failed, using fallback categories:', err instanceof Error ? err.message : err);
    }

    return json({ user: userSession?.user || null, categories, error });
}

const CATEGORY_STYLES: Record<string, { color: string; Icon: typeof Music }> = {
    entertainment: { color: "from-pink-500 to-rose-500", Icon: Film },
    education: { color: "from-emerald-500 to-green-500", Icon: Learning },
    gaming: { color: "from-purple-500 to-indigo-500", Icon: Gaming },
    music: { color: "from-pink-500 to-orange-500", Icon: Music },
    sports: { color: "from-orange-400 to-red-500", Icon: Sports },
    technology: { color: "from-cyan-500 to-blue-600", Icon: TechChip },
    news: { color: "from-blue-500 to-cyan-500", Icon: News },
    comedy: { color: "from-yellow-400 to-orange-400", Icon: Comedy },
    film: { color: "from-amber-500 to-orange-500", Icon: Film },
    other: { color: "from-teal-400 to-emerald-500", Icon: Travel },
};

export default function Explore() {
    const { user, categories, error } = useLoaderData<typeof loader>();
    const loading = useNavigation().state !== 'idle';
    const categoryCards = categories.filter((category: { id: string }) => category.id !== 'all').map((category: { id: string; label: string }) => ({ ...category, name: category.label, ...(CATEGORY_STYLES[category.id] || CATEGORY_STYLES.other) }));

    return (
        <Layout user={user}>
            <div className="min-h-screen pb-20">
                {/* Hero Header */}
                <div className="relative h-64 rounded-2xl overflow-hidden mb-10 group">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary-900 to-dark-900" />
                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')] bg-cover bg-center opacity-30 mix-blend-overlay group-hover:scale-105 transition-transform duration-700" />
                    <div className="absolute inset-0 bg-gradient-to-t from-dark-950 via-dark-950/20 to-transparent" />

                    <div className="absolute bottom-0 left-0 p-8">
                        <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-2 tracking-tight">
                            Explore Topics
                        </h1>
                        <p className="text-dark-200 text-lg max-w-xl">
                            Discover new interests, trending communities, and fresh content curated just for you.
                        </p>
                    </div>
                </div>

                {/* Categories Grid */}
                <div>
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <svg className="w-6 h-6 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" /></svg>
                        Browse Categories
                    </h2>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {loading ? (
                            Array.from({ length: 8 }).map((_, i) => (
                                <div key={i} className="h-40 rounded-xl bg-dark-900 border border-white/5 animate-pulse" />
                            ))
                        ) : (
                            categoryCards.map((category: { id: string; name: string; color: string; Icon: typeof Music }) => (
                            <Link
                                key={category.id}
                                to={`/?category=${category.id}`}
                                className="group relative h-40 rounded-xl overflow-hidden glass-panel hover:border-white/20 hover:shadow-glow-subtle transition-all duration-300 transform hover:-translate-y-1"
                            >
                                {/* Background Gradient */}
                                <div className={`absolute inset-0 bg-gradient-to-br ${category.color} opacity-10 group-hover:opacity-20 transition-opacity`} />

                                {/* Icon Background (Large/Faded) */}
                                <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 group-hover:-rotate-12 duration-500">
                                    <category.Icon size={128} />
                                </div>

                                {/* Content */}
                                <div className="absolute inset-0 p-6 flex flex-col justify-between">
                                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${category.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                                        <category.Icon size={22} className="text-white" />
                                    </div>

                                    <div>
                                        <h3 className="text-lg font-bold text-white group-hover:text-primary-200 transition-colors">
                                            {category.name}
                                        </h3>
                                        <p className="text-xs text-dark-400 group-hover:text-dark-300">
                                            Explore {category.name}
                                        </p>
                                    </div>
                                </div>
                            </Link>
                        )))}
                    </div>
                    {error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}
                </div>
            </div>
        </Layout>
    );
}
