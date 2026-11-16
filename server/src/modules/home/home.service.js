const labels = ['Entertainment', 'Education', 'Gaming', 'Music', 'Sports', 'Technology', 'News', 'Comedy', 'Film', 'Other'];
export const categories = [{ id: 'all', label: 'For You' }, ...labels.map(label => ({ id: label.toLowerCase(), label }))];

function card(video) {
  const owner = video.user_id;
  const channel = owner?.channel;
  return {
    id: String(video._id), title: video.title, description: video.description || '',
    thumbnailUrl: video.thumbnailUrl || undefined,
    durationSeconds: video.durationSeconds || 0, views: video.views || 0,
    publishedAt: video.createdAt ? new Date(video.createdAt).toISOString() : null,
    type: video.type === 'short' ? 'short' : 'video',
    channel: { id: channel?._id ? String(channel._id) : null,
      name: channel?.name || owner?.name || 'Creator', avatarUrl: channel?.logoUrl || null },
  };
}

// The repository handles MongoDB; the service owns filtering and the public DTO.
export function createHomeService(findVideos) {
  return async ({ category = 'all', limit = 8 } = {}) => {
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
      { id: 'popular', title: 'Popular videos', type: 'video', sort: { views: -1, _id: -1 } },
      { id: 'shorts', title: 'Bite-Sized (Shorts)', type: 'short', sort: { createdAt: -1, _id: -1 } },
      { id: 'latest', title: 'Latest videos', type: 'video', sort: { createdAt: -1, _id: -1 } },
    ];
    const sections = await Promise.all(definitions.map(async section => ({
      id: section.id, title: section.title, type: section.type,
      items: (await findVideos({ ...filter, type: section.type === 'short' ? 'short' : { $ne: 'short' } }, section.sort, limit)).map(card),
    })));
    return { activeCategory: category, categories, featured: sections[0].items[0] || sections[1].items[0] || null, sections };
  };
}
