import { optionalAuthenticate } from '../../middleware/auth.middleware.js';
import { objectId } from '../../shared/http/pagination.js';
import { WatchHistory } from './library.models.js';
import * as library from './library.service.js';

export default async function libraryRoutes(app, { authenticate }) {
  const auth = { preHandler: authenticate };
  app.get('/user/me/library', auth, request => library.library(request.userId));
  app.get('/user/me/saved-videos', auth, request => library.personalVideos(request.userId, 'saved', request.query));
  app.put('/user/me/saved-videos/:videoId', auth, request => library.saved(request.userId, request.params.videoId, true));
  app.delete('/user/me/saved-videos/:videoId', auth, request => library.saved(request.userId, request.params.videoId, false));
  app.get('/user/me/history', auth, request => library.personalVideos(request.userId, 'history', request.query));
  app.put('/user/me/history', auth, request => library.updateHistory(request.userId, request.body || {}));
  app.delete('/user/me/history/:videoId', auth, async request => {
    await WatchHistory.deleteOne({ user: request.userId, video: objectId(request.params.videoId, 'video ID') });
    return { deleted: true };
  });
  app.get('/user/me/playlists', auth, request => library.listPlaylists(request.userId, request.query));
  app.post('/user/me/playlists', auth, async (request, reply) => reply.code(201).send(await library.createPlaylist(request.userId, request.body || {})));
  app.get('/playlists/:playlistId', { preHandler: optionalAuthenticate }, request => library.getPlaylist(request.params.playlistId, request.userId, request.query));
  app.patch('/playlists/:playlistId', auth, request => library.editPlaylist(request.params.playlistId, request.userId, request.body || {}));
  app.delete('/playlists/:playlistId', auth, request => library.deletePlaylist(request.params.playlistId, request.userId));
  app.put('/playlists/:playlistId/videos/:videoId', auth, request => library.playlistVideo(request.params.playlistId, request.userId, request.params.videoId, true));
  app.delete('/playlists/:playlistId/videos/:videoId', auth, request => library.playlistVideo(request.params.playlistId, request.userId, request.params.videoId, false));
}
