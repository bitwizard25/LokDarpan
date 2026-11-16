import Network from '../src/modules/network/schemas/network.schema.js';
import { SavedVideo, WatchHistory, Playlist } from '../src/modules/library/library.models.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import buildApp from '../src/app.js';
import Video from '../src/modules/video/schemas/video.schema.js';
import Channel from '../src/modules/channel/schemas/channel.schema.js';
import User from '../src/modules/user/schemas/user.schema.js';
import Comment from '../src/modules/comments/schemas/comment.schema.js';
import videoService from '../src/modules/video/services/video.service.js';
import channelService from '../src/modules/channel/services/channel.service.js';
import userService from '../src/modules/user/services/user.service.js';
import commentService from '../src/modules/comments/services/comment.service.js';
import { hashPassword, comparePassword, generateToken } from '../src/modules/auth/services/auth.service.js';

const owner = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const other = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const id = 'cccccccccccccccccccccccc';
function query(value) {
  return { select() { return this; }, sort() { return this; }, limit() { return this; },
    populate() { return this; }, lean: async () => value, then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); } };
}

function objectIdArray(values = []) {
  const array = values.slice();
  array.pull = value => {
    const index = array.findIndex(item => String(item) === String(value));
    if (index >= 0) array.splice(index, 1);
  };
  array.addToSet = value => { if (!array.some(item => String(item) === String(value))) array.push(value); };
  return array;
}

test('creator list includes all statuses, paginates safely and counts comments', async t => {
  let filter;
  t.mock.method(Video, 'find', f => { filter = f; return query([
    { _id: id, title: 'Draft', status: 'PENDING', rawS3Key: 'secret', transcodeJobId: 'job' },
    { _id: other, status: 'COMPLETED' },
  ]); });
  t.mock.method(Comment, 'aggregate', async () => [{ _id: id, count: 3 }]);
  const result = await videoService.getMyVideos(owner, { limit: 1, q: 'a.*' });
  assert.equal(result.items[0].status, 'uploading');
  assert.equal(result.items[0].commentCount, 3);
  assert.equal(result.items[0].id, id);
  assert.equal(result.hasMore, true);
  assert.ok(result.nextCursor);
  assert.notEqual(result.nextCursor, id);
  assert.equal(JSON.stringify(result).includes('secret'), false);
  assert.equal(filter.user_id, owner);
  assert.equal(filter.status, undefined);
  assert.equal(filter.title.$regex, 'a\\.\\*');
  await assert.rejects(() => videoService.getMyVideos(owner, { cursor: 'bad' }), { statusCode: 400 });
});

test('video owner checks handle populated owners and reject other users', async t => {
  t.mock.method(Video, 'findById', () => query({ _id: id, user_id: { _id: owner }, status: 'COMPLETED' }));
  t.mock.method(Video, 'findByIdAndUpdate', async (_id, update) => ({ _id, ...update.$set, rawS3Key: 'secret' }));
  await assert.rejects(() => videoService.updateVideo(id, other, { title: 'No' }), { statusCode: 403 });
  const result = await videoService.updateVideo(id, owner, { title: 'Yes', visibility: 'private', tags: ['one'] });
  assert.equal(result.visibility, 'private');
  assert.deepEqual(result.tags, ['one']);
});

test('public channels resolve handles and never return owner details', async t => {
  t.mock.method(Channel, 'findOne', () => query({ _id: id, name: 'Studio', handle: 'studio', owner, logoUrl: 'avatar', logoId: 'secret', subscribers: 99 }));
  t.mock.method(User, 'countDocuments', async () => 4);
  t.mock.method(User, 'findById', () => query({ subscribedChannels: [id] }));
  t.mock.method(Video, 'countDocuments', async () => 2);
  t.mock.method(Video, 'aggregate', async () => [{ total: 12 }]);
  const result = await channelService.getPublicChannel('studio', other);
  assert.equal(result.handle, 'studio');
  assert.equal(result.subscriberCount, 4);
  assert.equal(result.subscribers, 4);
  assert.equal(result.totalVideos, 2);
  assert.equal(result.totalViews, 12);
  assert.equal(result.viewer.isSubscribed, true);
  assert.equal(result.viewer.isOwner, false);
  assert.equal(result.owner, undefined);
  assert.equal(result.logoId, undefined);
});

test('channel handle conflicts and confirmation failures use contract errors', async t => {
  t.mock.method(Channel, 'findOne', f => query(f.owner ? { _id: id, handle: 'studio', owner } : { _id: other }));
  await assert.rejects(() => channelService.updateMyChannel(owner, { handle: 'taken' }), { statusCode: 409 });
  await assert.rejects(() => channelService.deleteMyChannel(owner, 'wrong'), { statusCode: 400 });
});

test('password changes verify current password and store a new hash', async t => {
  const password = await hashPassword('old-password');
  t.mock.method(User, 'findById', () => query({ _id: owner, password }));
  let saved;
  t.mock.method(User, 'findByIdAndUpdate', async (_id, update) => { saved = update.$set.password; });
  await assert.rejects(() => userService.changePassword(owner, 'wrong', 'new-password'), { statusCode: 401 });
  await userService.changePassword(owner, 'old-password', 'new-password');
  assert.notEqual(saved, 'new-password');
  assert.equal(await comparePassword('new-password', saved), true);
  await assert.rejects(() => userService.deleteAccount(owner, 'wrong'), { statusCode: 401 });
});

test('HTTP routes preserve envelopes, validate bodies and protect creator endpoints', async t => {
  const app = await buildApp();
  t.after(() => app.close());
  t.mock.method(User, 'exists', async () => ({ _id: owner }));
  const headers = { authorization: `Bearer ${generateToken({ _id: owner })}` };
  t.mock.method(videoService, 'getMyVideos', async () => ({ items: [{ id, title: 'Draft' }], nextCursor: null, hasMore: false }));
  t.mock.method(videoService, 'updateVideo', async (_id, _owner, data) => ({ _id, ...data, rawS3Key: 'secret', transcodeJobId: 'job' }));
  t.mock.method(userService, 'updateProfile', async (_id, data) => ({ _id, ...data }));
  assert.equal((await app.inject('/api/v1/video/me')).statusCode, 401);
  const list = await app.inject({ url: '/api/v1/video/me', headers });
  assert.equal(list.statusCode, 200);
  assert.equal(list.json().items[0].title, 'Draft');
  const edit = await app.inject({ method: 'PUT', url: `/api/v1/video/${id}`, headers, payload: { visibility: 'private', tags: ['one'], thumbnailUrl: 'https://example.com/t.jpg' } });
  assert.equal(edit.statusCode, 200);
  assert.equal(edit.json().video.visibility, 'private');
  assert.equal(edit.body.includes('secret'), false);
  for (const [method, url, payload] of [
    ['PUT', `/api/v1/video/${id}`, { visibility: 'bad' }],
    ['PUT', '/api/v1/channel/me', { handle: 'BAD-HANDLE' }],
    ['PUT', '/api/v1/channel/me', { description: 'x'.repeat(1001) }],
    ['DELETE', '/api/v1/channel/me', {}],
    ['PATCH', '/api/v1/user/me', { displayName: '' }],
    ['PUT', '/api/v1/user/me/password', { currentPassword: 'old', newPassword: '12345' }],
    ['DELETE', '/api/v1/user/me', {}],
  ]) assert.equal((await app.inject({ method, url, headers, payload })).statusCode, 400, `${method} ${url}`);
  assert.equal((await app.inject({ url: '/api/v1/video/me?limit=51', headers })).statusCode, 400);
});

test('reaction endpoints require auth, validate explicit reaction state, and expose comment listing', async t => {
  const app = await buildApp();
  t.after(() => app.close());
  t.mock.method(User, 'exists', async () => ({ _id: owner }));
  const headers = { authorization: `Bearer ${generateToken({ _id: owner })}` };
  let selected;
  t.mock.method(videoService, 'setReaction', async (_videoId, _userId, reaction) => {
    selected = reaction;
    return { reaction, likes: reaction === 'like' ? 1 : 0, dislikes: reaction === 'dislike' ? 1 : 0 };
  });
  t.mock.method(videoService, 'clearReaction', async () => ({ reaction: null, likes: 0, dislikes: 0 }));
  t.mock.method(commentService, 'listComments', async () => ({ items: [{ id, comment_text: 'Hello' }], hasMore: false, nextCursor: null }));

  assert.equal((await app.inject({ method: 'PUT', url: `/api/v1/video/${id}/reaction`, payload: { reaction: 'like' } })).statusCode, 401);
  const like = await app.inject({ method: 'PUT', url: `/api/v1/video/${id}/reaction`, headers, payload: { reaction: 'like' } });
  assert.equal(like.statusCode, 200, like.body);
  assert.equal(selected, 'like');
  assert.equal(like.json().likes, 1);
  assert.equal((await app.inject({ method: 'PUT', url: `/api/v1/video/${id}/reaction`, headers, payload: { reaction: 'maybe' } })).statusCode, 400);
  const clear = await app.inject({ method: 'DELETE', url: `/api/v1/video/${id}/reaction`, headers });
  assert.equal(clear.statusCode, 200, clear.body);
  assert.equal(clear.json().reaction, null);
  const comments = await app.inject(`/api/v1/comment/${id}/comments?limit=10`);
  assert.equal(comments.statusCode, 200, comments.body);
  assert.equal(comments.json().items[0].comment_text, 'Hello');
});

test('reaction changes are idempotent and keep counters consistent when switching or clearing', async t => {
  const video = { likedBy: objectIdArray(), dislikedBy: objectIdArray(), likes: 0, dislikes: 0, async save() {} };
  t.mock.method(Video, 'findById', () => query(video));

  assert.deepEqual(await videoService.setReaction(id, owner, 'like'), { reaction: 'like', likes: 1, dislikes: 0 });
  assert.deepEqual(await videoService.setReaction(id, owner, 'like'), { reaction: 'like', likes: 1, dislikes: 0 });
  assert.deepEqual(await videoService.setReaction(id, owner, 'dislike'), { reaction: 'dislike', likes: 0, dislikes: 1 });
  assert.deepEqual(await videoService.clearReaction(id, owner), { reaction: null, likes: 0, dislikes: 0 });
  await assert.rejects(() => videoService.setReaction(id, owner, 'other'), { statusCode: 400 });
});

test('cursor continuation, filters and public channel lists enforce visibility', async t => {
  const filters = [];
  t.mock.method(Video, 'find', f => { filters.push(f); return query([]); });
  t.mock.method(Channel, 'findOne', () => query({ _id: id, owner }));
  await videoService.getMyVideos(owner, { status: 'unpublished', cursor: Buffer.from(id).toString('base64url') });
  assert.equal(String(filters[0]._id.$lt), id);
  assert.deepEqual(filters[0].visibility.$in, ['private', 'unlisted']);
  assert.equal(filters[0].status, 'COMPLETED');
  await channelService.getChannelVideos('studio', {});
  assert.equal(filters[1].status, 'COMPLETED');
  assert.deepEqual(filters[1].visibility.$in, ['public', null]);
  assert.equal(filters[1].user_id, owner);
  for (const cursor of ['', 'bad', Buffer.from('bad').toString('base64url')]) {
    await assert.rejects(() => videoService.getMyVideos(owner, { cursor }), { statusCode: 400 });
  }
});

test('confirmed channel deletion makes every owned video private before deleting the channel', async t => {
  const calls = [];
  t.mock.method(Channel, 'findOne', () => query({ _id: id, owner, handle: 'studio' }));
  t.mock.method(Video, 'updateMany', async (filter, update) => { calls.push('private'); assert.equal(filter.user_id, owner); assert.equal(update.$set.visibility, 'private'); });
  t.mock.method(User, 'updateMany', async (filter, update) => { assert.equal(update.$pull.subscribedChannels, id); });
  t.mock.method(User, 'updateOne', async (_filter, update) => { assert.ok(update.$unset.channel); });
  t.mock.method(Channel, 'findByIdAndDelete', async () => { calls.push('delete'); });
  await channelService.deleteMyChannel(owner, 'studio');
  assert.deepEqual(calls, ['private', 'delete']);
});

test('channel uniqueness races become 409 and updates return safe fields', async t => {
  t.mock.method(Channel, 'findOne', f => query(f.owner ? { _id: id, owner, handle: 'studio' } : null));
  t.mock.method(Channel, 'findByIdAndUpdate', async () => { throw Object.assign(new Error('duplicate key'), { code: 11000 }); });
  await assert.rejects(() => channelService.updateMyChannel(owner, { handle: 'new_handle' }), { statusCode: 409 });
});

test('unverified accounts cannot create channels even when calling the API directly', async t => {
  t.mock.method(User, 'findById', () => query({ _id: owner, identityVerification: { verifiedAt: null } }));
  t.mock.method(Channel, 'findOne', async () => { throw new Error('Channel lookup must not run for an ineligible creator'); });
  await assert.rejects(
    () => channelService.createChannel({ name: 'New channel', owner, logoUrl: 'logo', logoId: 'asset' }),
    { statusCode: 403, message: /Verify your identity/ },
  );
});

test('missing video/channel/user resources return 404', async t => {
  t.mock.method(Video, 'findById', () => query(null));
  t.mock.method(Channel, 'findOne', () => query(null));
  t.mock.method(User, 'findById', () => query(null));
  await assert.rejects(() => videoService.updateVideo(id, owner, { title: 'Title' }), { statusCode: 404 });
  await assert.rejects(() => videoService.deleteVideo(id, owner), { statusCode: 404 });
  await assert.rejects(() => channelService.getPublicChannel('missing'), { statusCode: 404 });
  await assert.rejects(() => channelService.updateMyChannel(owner, { name: 'Title' }), { statusCode: 404 });
  await assert.rejects(() => userService.changePassword(owner, 'old', 'new-pass'), { statusCode: 404 });
});

test('video deletion checks ownership before storage and cleans the recorded objects', async t => {
  const { default: storage } = await import('../src/services/storage.service.js');
  const files = [];
  t.mock.method(Video, 'findById', () => query({ _id: id, user_id: owner, rawS3Key: 'raw', thumbnailId: 'thumbnail', hlsMasterKey: 'master', videoId: 'legacy' }));
  t.mock.method(storage, 'deletePrefix', async prefix => { files.push(prefix); });
  t.mock.method(storage, 'deleteFile', async key => { files.push(key); });
  t.mock.method(Video, 'findByIdAndDelete', async () => { files.push('document'); });
  await assert.rejects(() => videoService.deleteVideo(id, other), { statusCode: 403 });
  assert.deepEqual(files, []);
  await videoService.deleteVideo(id, owner);
  assert.deepEqual(files, [`videos/${id}/hls/`, 'raw', 'thumbnail', 'master', 'legacy', 'document']);
});

test('transcode responses omit storage keys, job IDs and internal errors', async t => {
  t.mock.method(Video, 'findById', () => query({ _id: id, user_id: owner, status: 'PROCESSING', transcodeJobId: 'secret-job', processingError: 'secret-error', renditions: [{ playlistKey: 'secret-key', playlistUrl: 'https://example.com/v.m3u8' }] }));
  const result = await videoService.getTranscodeStatus(id, owner);
  assert.equal(result.videoStatus, 'PROCESSING');
  assert.equal(JSON.stringify(result).includes('secret'), false);
});

test('HTTP public channel data, channel updates, profile updates and multipart edits work', async t => {
  const app = await buildApp();
  t.after(() => app.close());
  t.mock.method(User, 'exists', async () => ({ _id: owner }));
  const headers = { authorization: `Bearer ${generateToken({ _id: owner })}` };
  t.mock.method(channelService, 'getPublicChannel', async (_id, viewerId) => ({ name: 'Studio', handle: 'studio', viewer: { isOwner: viewerId === owner, isSubscribed: false } }));
  t.mock.method(channelService, 'getChannelVideos', async () => ({ items: [], nextCursor: null, hasMore: false }));
  t.mock.method(channelService, 'updateMyChannel', async (_owner, data) => ({ ...data }));
  t.mock.method(userService, 'updateProfile', async (_owner, data) => ({ ...data }));
  const publicPage = await app.inject('/api/v1/channel/studio');
  assert.equal(publicPage.statusCode, 200);
  assert.equal(publicPage.json().channel.viewer.isOwner, false);
  assert.equal((await app.inject({ url: '/api/v1/channel/studio', headers })).json().channel.viewer.isOwner, true);
  assert.equal((await app.inject('/api/v1/channel/studio/videos')).statusCode, 200);
  assert.equal((await app.inject('/api/v1/channel/studio/videos?limit=0')).statusCode, 400);
  const channel = await app.inject({ method: 'PUT', url: '/api/v1/channel/me', headers, payload: { name: 'New studio', handle: 'new_studio', description: '' } });
  assert.equal(channel.statusCode, 200);
  assert.equal(channel.json().channel.handle, 'new_studio');
  const profile = await app.inject({ method: 'PATCH', url: '/api/v1/user/me', headers, payload: { displayName: 'New Name', bio: '', avatarUrl: 'https://example.com/a.png' } });
  assert.equal(profile.statusCode, 200);
  assert.equal(profile.json().user.displayName, 'New Name');
  const alias = await app.inject({ method: 'PATCH', url: '/api/v1/user/me', headers, payload: { name: 'Alias', avatarUrl: null } });
  assert.equal(alias.statusCode, 200, alias.body);
  let received;
  t.mock.method(videoService, 'updateVideo', async (_id, _owner, data, file) => { received = { data, file }; return { _id, ...data }; });
  const boundary = 'studio-boundary';
  const payload = `--${boundary}\r\nContent-Disposition: form-data; name="title"\r\n\r\nMultipart title\r\n--${boundary}\r\nContent-Disposition: form-data; name="thumbnail"; filename="test.png"\r\nContent-Type: image/png\r\n\r\npng-bytes\r\n--${boundary}--\r\n`;
  const multipart = await app.inject({ method: 'PUT', url: `/api/v1/video/${id}`, headers: { ...headers, 'content-type': `multipart/form-data; boundary=${boundary}` }, payload });
  assert.equal(multipart.statusCode, 200, multipart.body);
  assert.equal(received.data.title, 'Multipart title');
  assert.equal(received.file.buffer.toString(), 'png-bytes');
});

test('deleted-account JWTs cannot use protected routes or claim viewer ownership', async t => {
  const app = await buildApp();
  t.after(() => app.close());
  t.mock.method(User, 'exists', async () => null);
  const headers = { authorization: `Bearer ${generateToken({ _id: owner })}` };
  assert.equal((await app.inject({ url: '/api/v1/video/me', headers })).statusCode, 401);
  t.mock.method(channelService, 'getPublicChannel', async (_id, viewerId) => ({ viewer: { isOwner: Boolean(viewerId) } }));
  assert.equal((await app.inject({ url: '/api/v1/channel/studio', headers })).json().channel.viewer.isOwner, false);
});

test('profile service updates only allowed fields and returns the existing summary with additions', async t => {
  let update;
  t.mock.method(User, 'findByIdAndUpdate', (_id, u) => { update = u; return query({ _id: owner }); });
  t.mock.method(User, 'findById', () => query({ _id: owner, name: 'Updated', bio: '', email: 'owner@example.com', avatarUrl: 'https://example.com/a.png', password: 'never-return', channel: null }));
  t.mock.method(Network, 'countDocuments', async () => 0);
  const result = await userService.updateProfile(owner, { displayName: 'Updated', bio: '', avatarUrl: 'https://example.com/a.png', password: 'forbidden' });
  assert.deepEqual(update.$set, { name: 'Updated', bio: '', avatarUrl: 'https://example.com/a.png' });
  assert.equal(result.displayName, 'Updated');
  assert.equal(result.bio, '');
  assert.equal(result.hasChannel, false);
  assert.equal(result.createdNetworksCount, 0);
  assert.equal(JSON.stringify(result).includes('never-return'), false);
});

test('password-confirmed account deletion unpublishes videos, clears private collections and deletes the account last', async t => {
  const password = await hashPassword('password');
  const calls = [];
  t.mock.method(User, 'findById', () => query({ _id: owner, password }));
  t.mock.method(channelService, 'getChannelByOwner', async () => null);
  t.mock.method(Video, 'updateMany', async (_filter, update) => { assert.equal(update.$set.visibility, 'private'); calls.push('private'); });
  for (const model of [SavedVideo, WatchHistory, Playlist, Network]) {
    t.mock.method(model, 'deleteMany', async () => { calls.push('cleanup'); });
  }
  t.mock.method(Network, 'updateMany', async () => { calls.push('memberships'); });
  t.mock.method(User, 'findByIdAndDelete', async () => { calls.push('account'); });
  await userService.deleteAccount(owner, 'password');
  assert.equal(calls[0], 'private');
  assert.equal(calls.at(-1), 'account');
  assert.equal(calls.filter(c => c === 'cleanup').length, 4);
});

test('creator status mapping covers all stored states without losing unpublished videos', async () => {
  const { creatorStatus } = await import('../src/modules/video/services/studio-video.service.js');
  for (const status of ['PENDING', 'PENDING_METADATA', 'UPLOADING']) assert.equal(creatorStatus({ status }), 'uploading');
  assert.equal(creatorStatus({ status: 'PROCESSING' }), 'processing');
  assert.equal(creatorStatus({ status: 'FAILED' }), 'failed');
  assert.equal(creatorStatus({ status: 'COMPLETED', visibility: 'public' }), 'published');
  assert.equal(creatorStatus({ status: 'COMPLETED' }), 'published');
  for (const visibility of ['private', 'unlisted']) assert.equal(creatorStatus({ status: 'COMPLETED', visibility }), 'unpublished');
});
