import Video from '../video/schemas/video.schema.js';
import User from '../auth/schemas/user.schema.js';
import Channel from '../channel/schemas/channel.schema.js';
import Comment from '../comments/schemas/comment.schema.js';
import { objectId, pageOptions, pageResult, literalSearch } from '../../shared/http/pagination.js';
import { NotFoundError, AuthorizationError, ValidationError } from '../../utils/errors.js';
import { categories } from '../home/home.service.js';

export const publicFilter = {
  status: 'COMPLETED',
  $or: [{ visibility: 'public' }, { visibility: { $exists: false } }],
  $and: [{ $or: [{ hlsMasterUrl: { $type: 'string', $ne: '' } }, { videoUrl: { $type: 'string', $ne: '' } }] }],
};
export const populateAuthor = { path: 'user_id', select: 'name channel', populate: { path: 'channel', select: 'name logoUrl' } };
export const cardFields = '_id title description thumbnailUrl durationSeconds views createdAt user_id type category';

export function videoCard(v) {
  const channel = v.user_id?.channel;
  return { id: String(v._id), _id: String(v._id), title: v.title, description: v.description || '',
    thumbnailUrl: v.thumbnailUrl || null, durationSeconds: v.durationSeconds || 0,
    views: v.views || 0, publishedAt: v.createdAt, category: v.category || null,
    type: v.type === 'short' ? 'short' : 'video',
    channel: { id: channel?._id ? String(channel._id) : null, name: channel?.name || v.user_id?.name || 'Creator', avatarUrl: channel?.logoUrl || null } };
}

export async function listVideos(query = {}, extra = {}) {
  const { limit, after } = pageOptions(query);
  const clauses = [publicFilter, extra];
  if (after) clauses.push({ _id: { $lt: after } });
  if (query.category && query.category !== 'all') {
    const category = categories.find(c => c.id === query.category || c.label.toLowerCase() === String(query.category).toLowerCase());
    if (!category) throw new ValidationError('Unknown category');
    clauses.push({ category: { $regex: `^${literalSearch(category.label)}$`, $options: 'i' } });
  }
  if (query.type) {
    if (!['video', 'short'].includes(query.type)) throw new ValidationError('Unknown content type');
    clauses.push({ type: query.type === 'short' ? 'short' : { $ne: 'short' } });
  }
  const search = query.q || query.search;
  if (search) clauses.push({ $or: ['title', 'description'].map(field => ({ [field]: { $regex: literalSearch(search), $options: 'i' } })) });
  // Cursor is an ID boundary; popular ordering is applied separately below.
  const popular = query.section === 'popular' || query.section === 'trending';
  if (popular && after) throw new ValidationError('Popular ranking uses a snapshot; use the latest feed for continuation');
  const rows = await Video.find({ $and: clauses }).select(cardFields)
    .sort(popular ? { 'stats.trending': -1, publishedAt: -1, _id: -1 } : { _id: -1 }).limit(limit + 1)
    .populate(populateAuthor).lean();
  const result = pageResult(rows, limit, videoCard);
  if (popular) { result.hasMore = false; result.nextCursor = null; }
  return { ...result, videos: result.items, rankingBasis: popular ? 'trending_7d' : undefined };
}

export async function readableVideo(id, viewerId) {
  const video = await Video.findById(objectId(id, 'video ID')).populate(populateAuthor);
  if (!video) throw new NotFoundError('Video');
  const ownerId = video.user_id?._id;
  const owner = Boolean(viewerId && String(ownerId) === String(viewerId));
  const available = video.status === 'COMPLETED' && (video.hlsMasterUrl || video.videoUrl);
  if (!owner && (!available || video.visibility === 'private')) throw new NotFoundError('Video');
  return { video, owner };
}

export async function getVideo(id, viewerId) {
  const { video: v, owner } = await readableVideo(id, viewerId);
  const channelId = v.user_id?.channel?._id;
  const [subscribers, comments, viewer] = await Promise.all([
    channelId ? User.countDocuments({ subscribedChannels: channelId }) : 0,
    Comment.countDocuments({ video_id: v._id }),
    viewerId ? User.findById(viewerId).select('subscribedChannels').lean() : null,
  ]);
  const data = { ...videoCard(v.toObject()), videoUrl: v.hlsMasterUrl || v.videoUrl || null,
    hlsMasterUrl: v.hlsMasterUrl || null,
    renditions: (v.renditions || []).map(r => ({ label: r.label, width: r.width, height: r.height, playlistUrl: r.playlistUrl })),
    likes: v.likedBy.length, dislikes: v.dislikedBy.length, commentCount: comments,
    status: v.status, isOwner: owner, subscribers,
    reaction: viewerId && v.likedBy.some(x => String(x) === viewerId) ? 'like' : viewerId && v.dislikedBy.some(x => String(x) === viewerId) ? 'dislike' : null,
    isSubscribed: Boolean(channelId && viewer?.subscribedChannels?.some(x => String(x) === String(channelId))),
  };
  return { video: data };
}

export async function channelDetails(id, viewerId) {
  const channel = await Channel.findById(objectId(id, 'channel ID')).select('name description logoUrl bannerUrl owner createdAt').lean();
  if (!channel) throw new NotFoundError('Channel');
  const [subscribers, totalVideos, views, viewer] = await Promise.all([
    User.countDocuments({ subscribedChannels: channel._id }),
    Video.countDocuments({ $and: [publicFilter, { user_id: channel.owner }] }),
    Video.aggregate([{ $match: { $and: [publicFilter, { user_id: channel.owner }] } }, { $group: { _id: null, total: { $sum: '$views' } } }]),
    viewerId ? User.findById(viewerId).select('subscribedChannels').lean() : null,
  ]);
  return { ...channel, id: String(channel._id), owner: undefined, subscribers, totalVideos, totalViews: views[0]?.total || 0,
    isOwner: String(channel.owner) === viewerId,
    isSubscribed: Boolean(viewer?.subscribedChannels?.some(x => String(x) === id)) };
}

export async function subscribe(userId, channelId, active) {
  const id = objectId(channelId, 'channel ID');
  const channel = await Channel.findById(id).select('owner');
  if (!channel) throw new NotFoundError('Channel');
  if (String(channel.owner) === userId) throw new AuthorizationError('Cannot subscribe to your own channel');
  const result = await User.updateOne({ _id: userId }, active ? { $addToSet: { subscribedChannels: id } } : { $pull: { subscribedChannels: id } });
  if (!result.matchedCount) throw new NotFoundError('User');
  return { isSubscribed: active, subscribers: await User.countDocuments({ subscribedChannels: id }) };
}

export async function search(query) {
  const term = literalSearch(query.q || '');
  if (!term) throw new ValidationError('Search query is required');
  if (query.type && !['all', 'videos', 'channels'].includes(query.type)) throw new ValidationError('Unknown search type');
  const { limit, after } = pageOptions(query);
  const [videos, channels] = await Promise.all([
    query.type === 'channels' ? null : listVideos({ ...query, type: undefined }),
    query.type === 'videos' ? [] : Channel.find({ name: { $regex: term, $options: 'i' }, ...(after ? { _id: { $lt: after } } : {}) })
      .select('name description logoUrl').sort({ _id: -1 }).limit(limit + 1).lean(),
  ]);
  return { videos, channels: pageResult(channels, limit) };
}
