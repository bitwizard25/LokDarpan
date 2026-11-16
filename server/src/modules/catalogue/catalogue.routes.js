import { optionalAuthenticate } from '../../middleware/auth.middleware.js';
import { categories } from '../home/home.service.js';
import * as catalogue from './catalogue.service.js';

export default async function catalogueRoutes(app, { authenticate }) {
  app.get('/categories', async () => ({ categories }));
  app.get('/search', async request => catalogue.search(request.query));
  app.get('/video/:videoId/related', { preHandler: optionalAuthenticate }, async request => {
    const { video } = await catalogue.readableVideo(request.params.videoId, request.userId);
    return catalogue.listVideos(request.query, { _id: { $ne: video._id }, ...(video.category ? { category: video.category } : {}) });
  });
  app.put('/user/me/subscriptions/:channelId', { preHandler: authenticate }, request => catalogue.subscribe(request.userId, request.params.channelId, true));
  app.delete('/user/me/subscriptions/:channelId', { preHandler: authenticate }, request => catalogue.subscribe(request.userId, request.params.channelId, false));
}
