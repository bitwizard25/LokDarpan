import type { ActionFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { getServerApiBaseUrl } from '~/lib/api';
import { getUserFromSession } from '~/services/auth.server';

export async function action({ request }: ActionFunctionArgs) {
    if (request.method !== 'POST' && request.method !== 'PUT') {
        return json({ error: 'Method not allowed' }, { status: 405 });
    }

    const session = await getUserFromSession(request);
    if (!session || !session.token) {
        return json({ error: 'Unauthorized', requiresAuth: true }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { videoId, action, active = true } = body;

        if (!videoId || !action) {
            return json({ error: 'videoId and action are required' }, { status: 400 });
        }

        const response = await fetch(
            `${getServerApiBaseUrl()}/user/me/recommendation-feedback/${encodeURIComponent(videoId)}`,
            {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.token}`,
                },
                body: JSON.stringify({ action, active }),
                signal: AbortSignal.timeout(6000),
            }
        );

        const data = await response.json();
        return json(data, { status: response.status });
    } catch (error) {
        return json(
            { error: error instanceof Error ? error.message : 'Feedback failed' },
            { status: 500 }
        );
    }
}
