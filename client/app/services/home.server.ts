import { getServerApiBaseUrl } from '~/lib/api';
import { getUserFromSession } from './auth.server';

export interface HomeVideo {
    id: string;
    _id?: string;
    title: string;
    description: string;
    thumbnailUrl?: string | null;
    durationSeconds: number;
    views: number;
    publishedAt: string | null;
    type: 'video' | 'short';
    channel: { id: string | null; name: string; avatarUrl: string | null };
    rec?: {
        source?: string;
        reason?: { type: string; label?: string };
    };
}

export interface HomeFeed {
    requestId?: string;
    activeCategory: string;
    categories: { id: string; label: string }[];
    featured: HomeVideo | null;
    sections: {
        id: string;
        title: string;
        type: 'video' | 'short';
        rankingBasis?: string;
        nextCursor?: string | null;
        hasMore?: boolean;
        items: HomeVideo[];
    }[];
}

export async function fetchHome(
    requestOrCategory: Request | string,
    maybeCategory?: string
): Promise<HomeFeed> {
    let req: Request | null = null;
    let category = 'all';

    if (typeof requestOrCategory === 'string') {
        category = requestOrCategory;
    } else {
        req = requestOrCategory;
        category = maybeCategory || 'all';
    }

    let token: string | null = null;
    if (req) {
        try {
            const session = await getUserFromSession(req);
            token = session?.token || null;
        } catch {
            token = null;
        }
    }

    const queryParams: Record<string, string> = {
        category,
        limit: '8',
    };

    if (!token && req) {
        const cookieHeader = req.headers.get('Cookie') || '';
        const match = cookieHeader.match(/(?:^|;\s*)ld_hints=([^;]+)/);
        if (match && match[1]) {
            try {
                const decoded = decodeURIComponent(match[1]);
                if (decoded.length <= 1024) {
                    const parsed = JSON.parse(decoded);
                    if (Array.isArray(parsed.keys) && parsed.keys.length > 0) {
                        queryParams.hints = parsed.keys.slice(0, 20).join(',');
                    }
                    if (Array.isArray(parsed.languages) && parsed.languages.length > 0) {
                        queryParams.languages = parsed.languages.slice(0, 10).join(',');
                    }
                }
            } catch {
                // Ignore malformed cookie
            }
        }
    }

    const query = new URLSearchParams(queryParams);
    const headers: Record<string, string> = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${getServerApiBaseUrl()}/home?${query}`, {
        headers,
        signal: AbortSignal.timeout(6000),
    });

    if (!response.ok) throw new Error(`Home API returned ${response.status}`);
    const data: HomeFeed = await response.json();
    if (!Array.isArray(data.categories) || !Array.isArray(data.sections)) throw new Error('Invalid home response');
    return data;
}
