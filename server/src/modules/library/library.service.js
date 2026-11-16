import Video from '../video/schemas/video.schema.js';
import { SavedVideo, WatchHistory, Playlist } from './library.models.js';
import { readableVideo, publicFilter, cardFields, populateAuthor, videoCard } from '../catalogue/catalogue.service.js';
import { objectId, pageOptions, pageResult, safeText } from '../../shared/http/pagination.js';
import { NotFoundError, AuthorizationError, ValidationError } from '../../utils/errors.js';

async function permittedCards(ids, viewerId) {
  return Video.find({ _id: { $in: ids }, $or: [publicFilter, { user_id: viewerId }] })
    .select(cardFields).populate(populateAuthor).lean();
}

export async function saved(userId, videoId, enabled) {
  const id = objectId(videoId, 'video ID');
  if (enabled) {
    await readableVideo(videoId, userId);
    try { await SavedVideo.updateOne({ user: userId, video: id }, { $setOnInsert: { user: userId, video: id } }, { upsert: true }); }
    catch (error) { if (error.code !== 11000) throw error; }
  } else await SavedVideo.deleteOne({ user: userId, video: id });
  return { isSaved: enabled };
}

export async function personalVideos(userId, kind, query = {}) {
  const { limit, after } = pageOptions(query);
  const Model = kind === 'history' ? WatchHistory : SavedVideo;
  const rows = await Model.find({ user: userId, ...(after ? { _id: { $lt: after } } : {}) }).sort({ _id: -1 }).limit(limit + 1).lean();
  const cards = await permittedCards(rows.map(row => row.video), userId);
  const byId = new Map(cards.map(card => [String(card._id), card]));
  return pageResult(rows, limit, row => {
    const video = byId.get(String(row.video));
    return video ? { ...videoCard(video), lastWatchedAt: row.updatedAt,
      positionSeconds: row.positionSeconds || 0,
      progress: video.durationSeconds ? Math.min(100, Math.round((row.positionSeconds || 0) / video.durationSeconds * 100)) : 0 }
      : { id: String(row.video), unavailable: true };
  });
}

export async function updateHistory(userId, body) {
  const { video } = await readableVideo(body.videoId, userId);
  const position = body.positionSeconds;
  if (typeof position !== 'number' || !Number.isFinite(position) || position < 0 || position > (video.durationSeconds || 86400)) throw new ValidationError('Invalid playback position');
  await WatchHistory.updateOne({ user: userId, video: video._id }, { $set: { positionSeconds: position } }, { upsert: true });
  return { positionSeconds: position };
}

export async function listPlaylists(userId, query = {}) {
  const { limit, after } = pageOptions(query);
  const rows = await Playlist.find({ owner: userId, ...(after ? { _id: { $lt: after } } : {}) }).sort({ _id: -1 }).limit(limit + 1).lean();
  return pageResult(rows, limit, p => ({ id: String(p._id), name: p.name, visibility: p.visibility, itemCount: p.videos.length, createdAt: p.createdAt }));
}

export async function createPlaylist(userId, body) {
  const visibility = body.visibility || 'private';
  if (!['private', 'public'].includes(visibility)) throw new ValidationError('Invalid visibility');
  const playlist = await Playlist.create({ owner: userId, name: safeText(body.name, 'Playlist name', 80), visibility });
  return { playlist: { id: String(playlist._id), name: playlist.name, visibility, itemCount: 0 } };
}

export async function getPlaylist(id, userId, query = {}, ownerOnly = false) {
  const playlist = await Playlist.findById(objectId(id, 'playlist ID')).lean();
  if (!playlist) throw new NotFoundError('Playlist');
  const isOwner = String(playlist.owner) === userId;
  if (!isOwner && (ownerOnly || playlist.visibility !== 'public')) throw new NotFoundError('Playlist');
  const { limit, after } = pageOptions(query);
  const filterIds = playlist.videos.filter(value => !after || String(value) < String(after)).sort((a, b) => String(b).localeCompare(String(a)));
  const rows = await permittedCards(filterIds.slice(0, limit + 1), userId || null);
  rows.sort((a, b) => String(b._id).localeCompare(String(a._id)));
  return { playlist: { id, name: playlist.name, visibility: playlist.visibility, isOwner, itemCount: playlist.videos.length }, ...pageResult(rows, limit, videoCard) };
}

export async function editPlaylist(id, userId, body) {
  await getPlaylist(id, userId, {}, true);
  const update = {};
  if (body.name !== undefined) update.name = safeText(body.name, 'Playlist name', 80);
  if (body.visibility !== undefined) {
    if (!['private', 'public'].includes(body.visibility)) throw new ValidationError('Invalid visibility');
    update.visibility = body.visibility;
  }
  await Playlist.updateOne({ _id: id, owner: userId }, { $set: update });
  return getPlaylist(id, userId);
}

export async function playlistVideo(id, userId, videoId, active) {
  await getPlaylist(id, userId, {}, true);
  const video = objectId(videoId, 'video ID');
  if (active) await readableVideo(videoId, userId);
  if (active) {
    const result = await Playlist.updateOne({ _id: id, owner: userId, 'videos.499': { $exists: false } }, { $addToSet: { videos: video } });
    if (!result.matchedCount) throw new ValidationError('Playlist is limited to 500 videos');
  } else await Playlist.updateOne({ _id: id, owner: userId }, { $pull: { videos: video } });
  return { isAdded: active };
}

export async function deletePlaylist(id, userId) {
  await getPlaylist(id, userId, {}, true);
  await Playlist.deleteOne({ _id: id, owner: userId });
  return { deleted: true };
}

export async function library(userId) {
  const [history, savedVideos, playlists] = await Promise.all([
    personalVideos(userId, 'history', { limit: 6 }), personalVideos(userId, 'saved', { limit: 6 }), listPlaylists(userId, { limit: 6 }),
  ]);
  return { history, savedVideos, playlists };
}
