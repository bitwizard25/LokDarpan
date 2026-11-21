import { optionalAuthenticate } from '../../middleware/auth.middleware.js';
import { categories } from '../home/home.service.js';
import * as catalogue from './catalogue.service.js';
import { feedService as defaultFeedService } from '../recommendation/feed.service.js';

export default async function catalogueRoutes(app, options = {}) {
  const authenticate = options.authenticate;
  const optionalAuth = options.optionalAuthenticate || optionalAuthenticate;
  const feedSvc = options.feedService || defaultFeedService;

  app.get('/categories', async () => ({ categories }));
  app.get('/search', async request => catalogue.search(request.query));
  app.get('/video/:videoId/related', { preHandler: optionalAuth }, async (request) => {
    const limit = request.query?.limit ? Number(request.query.limit) : 12;
    return feedSvc.related({
      viewerId: request.userId || null,
      seedVideoId: request.params.videoId,
      limit,
    });
  });
  app.put('/user/me/subscriptions/:channelId', { preHandler: authenticate }, request => catalogue.subscribe(request.userId, request.params.channelId, true));
  app.delete('/user/me/subscriptions/:channelId', { preHandler: authenticate }, request => catalogue.subscribe(request.userId, request.params.channelId, false));
}
