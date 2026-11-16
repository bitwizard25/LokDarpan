import type { LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { getServerApiBaseUrl } from '~/lib/api';
import { getUserFromSession } from '~/services/auth.server';

export async function loader({ request }: LoaderFunctionArgs) {
    const url = new URL(request.url);
    const session = await getUserFromSession(request);
    const token = session?.token;

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(`${getServerApiBaseUrl()}/recommendations${url.search}`, {
            headers,
            signal: AbortSignal.timeout(6000),
        });

        const data = await response.json();
        return json(data, { status: response.status });
    } catch (error) {
        return json(
            { error: { code: 'FEED_UNAVAILABLE', message: 'Feed temporarily unavailable' } },
            { status: 503 }
        );
    }
}
