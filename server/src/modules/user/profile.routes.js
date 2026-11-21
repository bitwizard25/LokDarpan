import User from '../auth/schemas/user.schema.js';
import Channel from '../channel/schemas/channel.schema.js';
import Video from '../video/schemas/video.schema.js';
import userService from './services/user.service.js';
import { listVideos, videoCard, cardFields, populateAuthor } from '../catalogue/catalogue.service.js';
import { pageOptions, pageResult } from '../../shared/http/pagination.js';
import { ValidationError, NotFoundError } from '../../utils/errors.js';

export default async function profileRoutes(app, { authenticate }) {
  const auth = { preHandler: authenticate };
  // Profile mutations are registered by user/routes/user.routes.js.
  app.get('/user/me/subscriptions', auth, async request => {
    const { limit, after } = pageOptions(request.query);
    const user = await User.findById(request.userId).select('subscribedChannels').lean();
    if (!user) throw new NotFoundError('User');
    const rows = await Channel.find({ _id: { $in: user.subscribedChannels, ...(after ? { $lt: after } : {}) } }).select('name description logoUrl').sort({ _id: -1 }).limit(limit + 1).lean();
    return pageResult(rows, limit, channel => ({ ...channel, id: String(channel._id), isSubscribed: true }));
  });
  app.get('/user/me/following-feed', auth, async request => {
    const user = await User.findById(request.userId).select('subscribedChannels').lean();
    if (!user) throw new NotFoundError('User');
    const channels = await Channel.find({ _id: { $in: user.subscribedChannels } }).select('owner').lean();
    return listVideos(request.query, { user_id: { $in: channels.map(channel => channel.owner) } });
  });
  app.get('/user/me/channel-summary', auth, async request => {
    const channel = await Channel.findOne({ owner: request.userId }).select('name logoUrl').lean();
    if (!channel) return { channel: null, stats: null };
    const [subscribers, stats] = await Promise.all([
      User.countDocuments({ subscribedChannels: channel._id }),
      Video.aggregate([{ $match: { user_id: (await User.findById(request.userId).select('_id'))._id } }, { $group: { _id: null, totalVideos: { $sum: 1 }, totalViews: { $sum: '$views' } } }]),
    ]);
    return { channel, stats: { subscribers, totalVideos: stats[0]?.totalVideos || 0, totalViews: stats[0]?.totalViews || 0 } };
  });
  app.get('/user/me/videos', auth, async request => {
    const { limit, after } = pageOptions(request.query);
    const allowed = ['PENDING', 'PENDING_METADATA', 'UPLOADING', 'PROCESSING', 'COMPLETED', 'FAILED'];
    if (request.query.status && !allowed.includes(request.query.status)) throw new ValidationError('Invalid video status');
    const rows = await Video.find({ user_id: request.userId, ...(after ? { _id: { $lt: after } } : {}), ...(request.query.status ? { status: request.query.status } : {}) })
      .select(`${cardFields} status visibility`).sort({ _id: -1 }).limit(limit + 1).populate(populateAuthor).lean();
    return pageResult(rows, limit, video => ({ ...videoCard(video), status: video.status, visibility: video.visibility || 'public' }));
  });
  // Identity verification routes live in modules/verification/verification.routes.js.
}
