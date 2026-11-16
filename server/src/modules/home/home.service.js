import crypto from 'crypto';

const labels = ['Entertainment', 'Education', 'Gaming', 'Music', 'Sports', 'Technology', 'News', 'Comedy', 'Film', 'Other'];
export const categories = [{ id: 'all', label: 'For You' }, ...labels.map(label => ({ id: label.toLowerCase(), label }))];

function card(video) {
  const owner = video.user_id;
  const channel = owner?.channel;
  return {
    id: String(video._id), title: video.title, description: video.description || '',
    thumbnailUrl: video.thumbnailUrl || undefined,
    durationSeconds: video.durationSeconds || 0, views: video.views || 0,
    publishedAt: video.publishedAt
      ? new Date(video.publishedAt).toISOString()
      : (video.createdAt ? new Date(video.createdAt).toISOString() : null),
    type: video.type === 'short' ? 'short' : 'video',
    channel: { id: channel?._id ? String(channel._id) : null,
      name: channel?.name || owner?.name || 'Creator', avatarUrl: channel?.logoUrl || null },
  };
}

// The repository handles MongoDB; the service owns filtering and the public DTO.
export function createHomeService(findVideos, { feedService } = {}) {
  return async (query = {}, viewer = {}) => {
    const category = query.category || 'all';
    const rawLimit = query.limit !== undefined ? query.limit : 8;
    const limit = typeof rawLimit === 'number' ? rawLimit : parseInt(rawLimit, 10);

    if (!categories.some(item => item.id === category)) {
      throw Object.assign(new Error('Unknown category'), { statusCode: 400 });
    }
    if (!Number.isInteger(limit) || limit < 1 || limit > 12) {
      throw Object.assign(new Error('Limit must be between 1 and 12'), { statusCode: 400 });
    }
    const filter = {
      status: 'COMPLETED',
      $or: [{ hlsMasterUrl: { $type: 'string', $ne: '' } }, { videoUrl: { $type: 'string', $ne: '' } }],
      $and: [{ $or: [{ visibility: 'public' }, { visibility: { $exists: false } }] }],
    };
    if (category !== 'all') {
      const label = categories.find(item => item.id === category).label;
      filter.category = { $regex: `^${label}$`, $options: 'i' };
    }
    const definitions = [
      { id: 'popular', title: 'Trending now', type: 'video', sort: { 'stats.trending': -1, publishedAt: -1, _id: -1 }, rankingBasis: 'trending_7d' },
      { id: 'shorts', title: 'Bite-Sized (Shorts)', type: 'short', sort: { createdAt: -1, _id: -1 } },
      { id: 'latest', title: 'Latest videos', type: 'video', sort: { createdAt: -1, _id: -1 } },
    ];
    const sections = await Promise.all(definitions.map(async section => ({
      id: section.id, title: section.title, type: section.type,
      ...(section.rankingBasis ? { rankingBasis: section.rankingBasis } : {}),
      items: (await findVideos({ ...filter, type: section.type === 'short' ? 'short' : { $ne: 'short' } }, section.sort, limit)).map(card),
    })));

    // Compute featured before prepending for-you
    const featured = sections[0].items[0] || sections[1].items[0] || null;

    let requestId = crypto.randomUUID();
    const viewerId = viewer?.viewerId ?? query?.viewerId ?? null;
    const hints = viewer?.hints ?? query?.hints ?? [];
    const languages = viewer?.languages ?? query?.languages ?? [];

    if (feedService) {
      try {
        const feedPage = await feedService.firstPage({
          viewerId,
          hints,
          languages,
          category,
          limit,
        });
        if (feedPage?.personalized && feedPage.items?.length > 0) {
          sections.unshift({
            id: 'for-you',
            title: 'For You',
            type: 'video',
            items: feedPage.items,
          });
          if (feedPage.requestId) {
            requestId = feedPage.requestId;
          }
        }
      } catch {
        // Feed service failure: degrade gracefully without for-you section
      }
    }

    return {
      requestId,
      activeCategory: category,
      categories,
      featured,
      sections,
    };
  };
}
