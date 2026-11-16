import Video from '../video/schemas/video.schema.js';
import '../auth/schemas/user.schema.js';
import '../channel/schemas/channel.schema.js';
import { createHomeService } from './home.service.js';
import { feedService } from '../recommendation/feed.service.js';

export const getHome = createHomeService(
  (filter, sort, limit) => Video.find(filter)
    .select('_id title description thumbnailUrl durationSeconds views createdAt user_id type')
    .sort(sort).limit(limit).maxTimeMS(4000)
    .populate({ path: 'user_id', select: 'name channel', populate: { path: 'channel', select: 'name logoUrl' } })
    .lean(),
  { feedService }
);
