import Video from '../schemas/video.schema.js';
import Comment from '../../comments/schemas/comment.schema.js';
import { objectId, literalSearch } from '../../../shared/http/pagination.js';
import { ValidationError } from '../../../utils/errors.js';

export function creatorStatus(video) {
  if (video.status === 'COMPLETED') return !video.visibility || video.visibility === 'public' ? 'published' : 'unpublished';
  if (video.status === 'FAILED') return 'failed';
  if (video.status === 'PROCESSING') return 'processing';
  return 'uploading';
}

export function studioVideo(video, commentCount = 0) {
  return { id: String(video._id), _id: String(video._id), title: video.title, description: video.description || '', thumbnailUrl: video.thumbnailUrl || null,
    duration: video.durationSeconds || 0, status: creatorStatus(video), visibility: video.visibility || 'public',
    durationSeconds: video.durationSeconds || 0, publishedAt: video.createdAt,
    category: video.category || null, type: video.type === 'short' ? 'short' : 'video',
    views: video.views || 0, likes: video.likes || 0, commentCount,
    createdAt: video.createdAt, updatedAt: video.updatedAt };
}

export function studioPageOptions(query = {}) {
  const limit = Number(query.limit ?? 20);
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) throw new ValidationError('Limit must be between 1 and 50');
  let after;
  if (query.cursor !== undefined) {
    const decoded = Buffer.from(query.cursor, 'base64url').toString('utf8');
    if (Buffer.from(decoded).toString('base64url') !== query.cursor) throw new ValidationError('Invalid cursor');
    after = objectId(decoded, 'cursor');
  }
  return { limit, after };
}

export async function listStudioVideos(filter, query = {}) {
  const { limit, after } = studioPageOptions(query);
  const criteria = { ...filter, ...(after ? { _id: { $lt: after } } : {}) };
  if (query.q) criteria.title = { $regex: literalSearch(query.q), $options: 'i' };
  const rows = await Video.find(criteria).select('_id title description thumbnailUrl durationSeconds status visibility views likes createdAt updatedAt category type')
    .sort({ _id: -1 }).limit(limit + 1).lean();
  const page = rows.slice(0, limit);
  const counts = page.length ? await Comment.aggregate([
    { $match: { video_id: { $in: page.map(v => v._id) } } },
    { $group: { _id: '$video_id', count: { $sum: 1 } } },
  ]) : [];
  const byId = new Map(counts.map(c => [String(c._id), c.count]));
  const hasMore = rows.length > limit;
  return { items: page.map(v => studioVideo(v, byId.get(String(v._id)) || 0)),
    nextCursor: hasMore ? Buffer.from(String(page.at(-1)._id)).toString('base64url') : null, hasMore };
}

export async function getMyVideos(userId, query = {}) {
  const filter = { user_id: userId };
  const statuses = {
    uploading: { status: { $in: ['PENDING', 'PENDING_METADATA', 'UPLOADING'] } },
    processing: { status: 'PROCESSING' }, failed: { status: 'FAILED' },
    published: { status: 'COMPLETED', $or: [{ visibility: 'public' }, { visibility: { $exists: false } }] },
    unpublished: { status: 'COMPLETED', visibility: { $in: ['private', 'unlisted'] } },
  };
  if (query.status) {
    if (!statuses[query.status]) throw new ValidationError('Invalid status');
    Object.assign(filter, statuses[query.status]);
  }
  return listStudioVideos(filter, query);
}

// Preserve existing video fields and envelope, excluding credentials/storage/job details.
export function safeVideo(video) {
  const value = video.toObject ? video.toObject() : { ...video };
  for (const key of ['rawS3Key', 'hlsMasterKey', 'videoId', 'thumbnailId', 'transcodeJobId', 'processingError']) delete value[key];
  value.renditions = (value.renditions || []).map(({ playlistKey, ...rendition }) => rendition);
  if (value.user_id && typeof value.user_id === 'object' && value.user_id.name !== undefined) {
    const user = value.user_id;
    value.user_id = { _id: user._id, name: user.name, channel: user.channel };
  }
  return value;
}
