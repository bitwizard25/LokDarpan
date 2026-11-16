import { getServerApiBaseUrl } from '~/lib/api';

export interface HomeVideo {
    id: string;
    title: string;
    description: string;
    thumbnailUrl?: string;
    durationSeconds: number;
    views: number;
    publishedAt: string | null;
    type: 'video' | 'short';
    channel: { id: string | null; name: string; avatarUrl: string | null };
}

export interface HomeFeed {
    activeCategory: string;
    categories: { id: string; label: string }[];
    featured: HomeVideo | null;
    sections: { id: string; title: string; type: 'video' | 'short'; items: HomeVideo[] }[];
}

export async function fetchHome(category: string): Promise<HomeFeed> {
    const query = new URLSearchParams({ category, limit: '8' });
    const response = await fetch(`${getServerApiBaseUrl()}/home?${query}`, {
        signal: AbortSignal.timeout(6000),
    });
    if (!response.ok) throw new Error(`Home API returned ${response.status}`);
    const data: HomeFeed = await response.json();
    if (!Array.isArray(data.categories) || !Array.isArray(data.sections)) throw new Error('Invalid home response');
    return data;
}
