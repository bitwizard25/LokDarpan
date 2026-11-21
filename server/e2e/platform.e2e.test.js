/**
 * End-to-end scenarios against the real running backend (API + worker + Redis + ffmpeg + MongoDB + S3).
 *   npm run e2e:up && npm run e2e
 * Tests run in order and share state: each one is a step in a realistic user journey.
 */
import test, { describe, before } from 'node:test';
import assert from 'node:assert/strict';
import {
  api, eventually, waitForApi, setupBucket, putPresigned, getPresigned, anonymousGet,
  blobForm, signupAndLogin, uniqueEmail, loadSampleVideo, PNG_1X1, JPEG_STUB,
} from './helpers.mjs';

const ADMIN_EMAIL = 'admin@e2e.test';
const ctx = {};
const jpegPhoto = { buffer: JPEG_STUB, type: 'image/jpeg', name: 'id.jpg' };
const idForm = (over = {}) => blobForm(
  { legalName: 'Asha Rao', documentType: 'passport', ...over.fields },
  over.noFile ? {} : { document: over.file ?? jpegPhoto },
);

before(async () => {
  await waitForApi();
  await setupBucket();
});

describe('1. Accounts and authentication', () => {
  test('signup rejects invalid input', async () => {
    const base = { name: 'Valid Name', email: uniqueEmail('v'), phone: '9876543210', password: 'Passw0rd!x' };
    for (const bad of [{ email: 'not-an-email' }, { name: 'Al' }, { password: '' }, { phone: undefined }]) {
      const r = await api('/auth/signup', { method: 'POST', json: { ...base, ...bad } });
      assert.equal(r.status, 400, JSON.stringify(bad));
    }
  });

  test('duplicate email cannot sign up twice', async () => {
    ctx.creator = await signupAndLogin({ name: 'Asha Creator', email: uniqueEmail('creator') });
    const dup = await api('/auth/signup', {
      method: 'POST',
      json: { name: 'Other Person', email: ctx.creator.email, phone: '9876543211', password: 'Passw0rd!x' },
    });
    assert.ok([400, 409].includes(dup.status), `got ${dup.status}`);
  });

  test('wrong password and unknown email are rejected the same way', async () => {
    const wrong = await api('/auth/login', { method: 'POST', json: { email: ctx.creator.email, password: 'nope-nope' } });
    const unknown = await api('/auth/login', { method: 'POST', json: { email: 'ghost@e2e.test', password: 'Passw0rd!x' } });
    assert.equal(wrong.status, 401);
    assert.equal(unknown.status, 401);
  });

  test('protected routes need a valid token', async () => {
    assert.equal((await api('/user/me')).status, 401);
    assert.equal((await api('/user/me', { token: 'garbage.token.value' })).status, 401);
    const me = await api('/user/me', { token: ctx.creator.token });
    assert.equal(me.status, 200);
    assert.equal(me.data.user.email, ctx.creator.email);
    assert.equal(me.data.user.identityVerified, false);
    assert.equal(me.data.user.isAdmin, false);
    assert.equal(JSON.stringify(me.data).includes('Passw0rd'), false, 'password must never be returned');
  });
});

describe('2. Creator onboarding: manual identity verification (DigiLocker not configured)', () => {
  test('an unverified user cannot create a channel', async () => {
    const r = await api('/channel', {
      method: 'POST', token: ctx.creator.token,
      form: blobForm({ name: 'Asha Studio' }, { logo: { buffer: PNG_1X1, type: 'image/png', name: 'logo.png' } }),
    });
    assert.equal(r.status, 403, JSON.stringify(r.data));
  });

  test('status falls back to manual review', async () => {
    const r = await api('/user/me/identity-verification', { token: ctx.creator.token });
    assert.equal(r.status, 200);
    assert.deepEqual([r.data.provider, r.data.configured, r.data.status], ['manual', false, 'not_verified']);
    const start = await api('/user/me/identity-verification/start', { method: 'POST', token: ctx.creator.token, json: {} });
    assert.equal(start.status, 503);
    assert.equal(start.data.error.data.fallback, 'manual');
  });

  test('bad submissions are refused: missing photo, bad type, wrong document kind, spoofed image', async () => {
    const t = ctx.creator.token;
    const post = form => api('/user/me/identity-verification/manual', { method: 'POST', token: t, form });
    assert.equal((await post(idForm({ noFile: true }))).status, 400);
    assert.equal((await post(idForm({ fields: { documentType: 'library_card' } }))).status, 400);
    assert.equal((await post(idForm({ file: { buffer: JPEG_STUB, type: 'application/pdf', name: 'id.pdf' } }))).status, 400);
    assert.equal((await post(idForm({ file: { buffer: PNG_1X1, type: 'image/jpeg', name: 'id.jpg' } }))).status, 400,
      'PNG bytes labelled as JPEG must be rejected');
    assert.equal((await post(idForm({ fields: { legalName: 'Al' } }))).status, 400);
  });

  test('creator submits an ID, and cannot submit a second one while it is pending', async () => {
    const t = ctx.creator.token;
    const first = await api('/user/me/identity-verification/manual', { method: 'POST', token: t, form: idForm() });
    assert.equal(first.status, 201, JSON.stringify(first.data));
    assert.equal(first.data.status, 'pending');
    assert.equal(JSON.stringify(first.data).includes('identity-documents'), false);
    const second = await api('/user/me/identity-verification/manual', { method: 'POST', token: t, form: idForm() });
    assert.equal(second.status, 409);
    const status = await api('/user/me/identity-verification', { token: t });
    assert.equal(status.data.status, 'pending');
  });

  test('admin routes are closed to anonymous users and to regular accounts', async () => {
    assert.equal((await api('/admin/verifications')).status, 401);
    assert.equal((await api('/admin/verifications', { token: ctx.creator.token })).status, 403);
    assert.equal((await api('/admin/verifications/aaaaaaaaaaaaaaaaaaaaaaaa/approve', { method: 'POST', token: ctx.creator.token, json: {} })).status, 403);
  });

  test('admin reviews the queue, sees the ID photo, and rejects with a reason', async () => {
    // Fresh stack: sign the admin up (a re-run against the same DB falls back to login).
    try { ctx.admin = await signupAndLogin({ name: 'Site Admin', email: ADMIN_EMAIL }); }
    catch { const l = await api('/auth/login', { method: 'POST', json: { email: ADMIN_EMAIL, password: 'Passw0rd!x' } }); ctx.admin = { token: l.data.token }; }
    const me = await api('/user/me', { token: ctx.admin.token });
    assert.equal(me.data.user.isAdmin, true);

    const list = await api('/admin/verifications?status=pending', { token: ctx.admin.token });
    assert.equal(list.status, 200);
    const mine = list.data.items.find(i => i.user.email === ctx.creator.email);
    assert.ok(mine, 'the creator request should be in the pending queue');
    assert.equal(mine.legalName, 'Asha Rao');

    const detail = await api(`/admin/verifications/${mine.id}`, { token: ctx.admin.token });
    assert.equal(detail.status, 200);
    const doc = await getPresigned(detail.data.documentUrl);
    assert.equal(doc.status, 200);
    assert.deepEqual(doc.body, JPEG_STUB, 'admin sees exactly the uploaded ID photo');
    assert.equal(JSON.stringify(detail.data).includes('identity-documents/'), false, 'raw storage key never exposed');
    ctx.requestId = mine.id;

    const noReason = await api(`/admin/verifications/${mine.id}/reject`, { method: 'POST', token: ctx.admin.token, json: {} });
    assert.equal(noReason.status, 400);
    const rejected = await api(`/admin/verifications/${mine.id}/reject`, {
      method: 'POST', token: ctx.admin.token, json: { reason: 'Photo is too blurry to read' },
    });
    assert.equal(rejected.status, 200, JSON.stringify(rejected.data));
    const again = await api(`/admin/verifications/${mine.id}/approve`, { method: 'POST', token: ctx.admin.token, json: {} });
    assert.equal(again.status, 409, 'an already-reviewed request cannot be decided twice');
  });

  test('ID photos are NOT publicly readable from storage', async () => {
    const detail = await api(`/admin/verifications/${ctx.requestId}`, { token: ctx.admin.token });
    const key = new URL(detail.data.documentUrl).pathname.replace(/^\/lokdarpan-e2e\//, '');
    assert.match(key, /^identity-documents\//);
    const anon = await anonymousGet(key);
    assert.ok([401, 403, 404].includes(anon), `anonymous read of an ID photo returned ${anon}`);
  });

  test('creator sees the reason, resubmits, and admin approves', async () => {
    const t = ctx.creator.token;
    const status = await api('/user/me/identity-verification', { token: t });
    assert.equal(status.data.status, 'rejected');
    assert.equal(status.data.rejectionReason, 'Photo is too blurry to read');

    const resub = await api('/user/me/identity-verification/manual', { method: 'POST', token: t, form: idForm() });
    assert.equal(resub.status, 201);
    const list = await api('/admin/verifications?status=pending', { token: ctx.admin.token });
    const mine = list.data.items.find(i => i.user.email === ctx.creator.email);
    assert.ok(mine && mine.id !== ctx.requestId, 'a new pending request should exist');
    const ok = await api(`/admin/verifications/${mine.id}/approve`, { method: 'POST', token: ctx.admin.token, json: {} });
    assert.equal(ok.status, 200);

    assert.equal((await api('/user/me/identity-verification', { token: t })).data.status, 'verified');
    assert.equal((await api('/user/me', { token: t })).data.user.identityVerified, true);
    const again = await api('/user/me/identity-verification/manual', { method: 'POST', token: t, form: idForm() });
    assert.equal(again.status, 409, 'a verified user cannot submit again');
  });

  test('now the creator can create a channel (once)', async () => {
    const t = ctx.creator.token;
    const make = () => api('/channel', {
      method: 'POST', token: t,
      form: blobForm({ name: 'Asha Studio', description: 'Cooking and travel' }, { logo: { buffer: PNG_1X1, type: 'image/png', name: 'logo.png' } }),
    });
    const created = await make();
    assert.equal(created.status, 201, JSON.stringify(created.data));
    ctx.channelId = created.data.channel._id || created.data.channel.id;
    assert.ok(ctx.channelId);
    const dup = await make();
    assert.ok([400, 409].includes(dup.status), `second channel got ${dup.status}`);
    const mine = await api('/channel/me', { token: t });
    assert.equal(mine.status, 200);
    assert.equal(mine.data.channel.name, 'Asha Studio');
  });
});

describe('3. Upload a video and let the worker transcode it', () => {
  test('initiate, upload straight to storage, complete', async () => {
    const t = ctx.creator.token;
    const noMeta = await api('/video/initiate-upload', { method: 'POST', token: t, json: { title: 'Only a title' } });
    assert.equal(noMeta.status, 400);

    const init = await api('/video/initiate-upload', {
      method: 'POST', token: t,
      json: { title: 'Street Food Tour Mumbai', description: 'Best vada pav in town', category: 'Food', tags: 'food,mumbai' },
    });
    assert.equal(init.status, 201, JSON.stringify(init.data));
    ctx.videoId = init.data.videoId;

    const early = await api(`/video/${ctx.videoId}/complete-upload`, { method: 'POST', token: t, json: {} });
    assert.ok([400, 404].includes(early.status) || early.status >= 400, 'completing before the file exists must fail');

    const mp4 = await loadSampleVideo();
    const put = await putPresigned(init.data.preSignedUrl, mp4, 'video/mp4');
    assert.equal(put.status, 200, `presigned PUT returned ${put.status}`);

    const done = await api(`/video/${ctx.videoId}/complete-upload`, { method: 'POST', token: t, json: {} });
    assert.equal(done.status, 200, JSON.stringify(done.data));
    assert.equal(done.data.status, 'PROCESSING');

    const twice = await api(`/video/${ctx.videoId}/complete-upload`, { method: 'POST', token: t, json: {} });
    assert.equal(twice.status, 400, 'completing an upload twice must not start a second transcode');
  });

  test('only the owner can see transcode progress', async () => {
    const stranger = await signupAndLogin({ name: 'Random Stranger', email: uniqueEmail('stranger') });
    const r = await api(`/video/${ctx.videoId}/transcode-status`, { token: stranger.token });
    assert.equal(r.status, 403);
  });

  test('the worker finishes: HLS playlist and thumbnail are served, raw upload stays private', async () => {
    const t = ctx.creator.token;
    const final = await eventually(async () => {
      const s = await api(`/video/${ctx.videoId}/transcode-status`, { token: t });
      assert.ok(s.status === 200, `status endpoint returned ${s.status}`);
      assert.notEqual(s.data.status, 'FAILED', `transcode failed: ${JSON.stringify(s.data)}`);
      return s.data.status === 'COMPLETED' ? s.data : null;
    }, { timeoutMs: 150000, intervalMs: 3000, what: 'the video to reach COMPLETED' });
    assert.ok(final);

    const video = await api(`/video/${ctx.videoId}`);
    assert.equal(video.status, 200, JSON.stringify(video.data).slice(0, 300));
    const v = video.data.video ?? video.data;
    ctx.video = v;
    const master = v.hlsMasterUrl || v.videoUrl;
    assert.ok(master, 'video must expose an HLS master URL');
    const m3u8 = await fetch(master);
    assert.equal(m3u8.status, 200);
    assert.match(await m3u8.text(), /^#EXTM3U/);
    if (v.thumbnailUrl) assert.equal((await fetch(v.thumbnailUrl)).status, 200);

    const raw = await anonymousGet(`raw-uploads/${ctx.creator.user._id ?? ctx.creator.user.id}/${ctx.videoId}.mp4`);
    assert.ok([401, 403, 404].includes(raw), `raw upload must not be public, got ${raw}`);
  });
});

describe('4. A viewer discovers and interacts with the video', () => {
  before(async () => { ctx.viewer = await signupAndLogin({ name: 'Vikram Viewer', email: uniqueEmail('viewer') }); });

  test('the video shows up in home, search, the channel page and related', async () => {
    const home = await api('/home');
    assert.equal(home.status, 200);
    assert.ok(JSON.stringify(home.data).includes(ctx.videoId), 'home feed should include the new video');

    const search = await api('/search?q=' + encodeURIComponent('Street Food'));
    assert.equal(search.status, 200);
    assert.ok(JSON.stringify(search.data).includes(ctx.videoId), 'search should find it by title');
    const miss = await api('/search?q=' + encodeURIComponent('zzzz-no-such-thing'));
    assert.equal(JSON.stringify(miss.data).includes(ctx.videoId), false);

    const channel = await api(`/channel/${ctx.channelId}/videos`);
    assert.equal(channel.status, 200);
    assert.ok(JSON.stringify(channel.data).includes(ctx.videoId));
    assert.equal((await api(`/video/${ctx.videoId}/related`, { token: ctx.viewer.token })).status, 200);
  });

  test('like toggles, dislike replaces it, comments can be added, edited and removed by their author only', async () => {
    const v = ctx.viewer.token;
    const like = await api(`/video/${ctx.videoId}/like`, { method: 'PUT', token: v, json: {} });
    assert.equal(like.status, 200);
    assert.equal(like.data.likes, 1);
    const unlike = await api(`/video/${ctx.videoId}/like`, { method: 'PUT', token: v, json: {} });
    assert.equal(unlike.data.likes, 0, 'liking twice toggles the like off');
    const react = await api(`/video/${ctx.videoId}/reaction`, { method: 'PUT', token: v, json: { reaction: 'like' } });
    assert.ok([200, 204].includes(react.status), `PUT reaction returned ${react.status}: ${JSON.stringify(react.data)}`);
    assert.ok([200, 204].includes((await api(`/video/${ctx.videoId}/reaction`, { method: 'DELETE', token: v })).status));

    assert.equal((await api(`/comment/${ctx.videoId}/comments`, { method: 'POST', json: { comment_text: 'anon' } })).status, 401);
    assert.equal((await api(`/comment/${ctx.videoId}/comments`, { method: 'POST', token: v, json: { comment_text: '' } })).status, 400);
    const c = await api(`/comment/${ctx.videoId}/comments`, { method: 'POST', token: v, json: { comment_text: 'Great video, loved the vada pav!' } });
    assert.equal(c.status, 201, JSON.stringify(c.data));
    const commentId = c.data.comment._id || c.data.comment.id;
    const list = await api(`/comment/${ctx.videoId}/comments`);
    assert.equal(list.status, 200);
    assert.ok(JSON.stringify(list.data).includes('loved the vada pav'));

    const edit = await api(`/comment/${commentId}`, { method: 'PUT', token: v, json: { comment_text: 'Edited: loved it!' } });
    assert.equal(edit.status, 200);
    const stealth = await api(`/comment/${commentId}`, { method: 'DELETE', token: ctx.creator.token });
    assert.ok([403, 404].includes(stealth.status), `another user deleting a comment got ${stealth.status}`);
    assert.equal((await api(`/comment/${commentId}`, { method: 'DELETE', token: v })).status, 200);
  });

  test('subscribing puts the creator videos in the following feed', async () => {
    const v = ctx.viewer.token;
    const before = await api('/user/me/following-feed', { token: v });
    assert.equal(JSON.stringify(before.data).includes(ctx.videoId), false);
    assert.equal((await api(`/user/me/subscriptions/${ctx.channelId}`, { method: 'PUT', token: v, json: {} })).status, 200);
    const feed = await api('/user/me/following-feed', { token: v });
    assert.ok(JSON.stringify(feed.data).includes(ctx.videoId));
    const subs = await api('/user/me/subscriptions', { token: v });
    assert.ok(JSON.stringify(subs.data).includes(ctx.channelId));
    const channel = await api(`/channel/${ctx.channelId}`, { token: v });
    assert.equal((channel.data.channel.subscriberCount ?? channel.data.channel.subscribers), 1);
  });

  test('library: save, watch history with resume position, playlists', async () => {
    const v = ctx.viewer.token;
    assert.equal((await api(`/user/me/saved-videos/${ctx.videoId}`, { method: 'PUT', token: v, json: {} })).status, 200);
    assert.ok(JSON.stringify((await api('/user/me/saved-videos', { token: v })).data).includes(ctx.videoId));

    const bad = await api('/user/me/history', { method: 'PUT', token: v, json: { videoId: ctx.videoId, positionSeconds: -5 } });
    assert.equal(bad.status, 400);
    const hist = await api('/user/me/history', { method: 'PUT', token: v, json: { videoId: ctx.videoId, positionSeconds: 1 } });
    assert.equal(hist.status, 200, JSON.stringify(hist.data));
    assert.ok(JSON.stringify((await api('/user/me/history', { token: v })).data).includes(ctx.videoId));

    const pl = await api('/user/me/playlists', { method: 'POST', token: v, json: { name: 'Weekend watch', visibility: 'private' } });
    assert.equal(pl.status, 201, JSON.stringify(pl.data));
    const plId = pl.data.playlist.id;
    assert.equal((await api(`/playlists/${plId}/videos/${ctx.videoId}`, { method: 'PUT', token: v, json: {} })).status, 200);
    assert.ok(JSON.stringify((await api(`/playlists/${plId}`, { token: v })).data).includes(ctx.videoId));
    const peek = await api(`/playlists/${plId}`);
    assert.ok([401, 403, 404].includes(peek.status), `a private playlist must not be public, got ${peek.status}`);
    assert.equal((await api(`/playlists/${plId}`, { method: 'DELETE', token: v })).status, 200);
  });

  test('recommendations: events are accepted and the personalised feed responds', async () => {
    const v = ctx.viewer.token;
    const rec = await api('/recommendations', { token: v });
    assert.equal(rec.status, 200, JSON.stringify(rec.data).slice(0, 300));
    const onboarding = await api('/recommendation-onboarding');
    assert.equal(onboarding.status, 200);
    const prefs = await api('/user/me/recommendation-preferences', { token: v });
    assert.equal(prefs.status, 200);
  });
});

describe('5. Creator manages the video and channel (studio)', () => {
  test('my videos lists it with its status', async () => {
    const r = await api('/video/me?limit=10', { token: ctx.creator.token });
    assert.equal(r.status, 200);
    const row = r.data.items.find(i => (i.id || i._id) === ctx.videoId);
    assert.ok(row, 'uploaded video listed in studio');
    assert.equal(row.status, 'completed');
  });

  test('strangers cannot edit or delete someone else\'s video', async () => {
    const edit = await api(`/video/${ctx.videoId}`, { method: 'PUT', token: ctx.viewer.token, json: { title: 'Hijacked' } });
    assert.ok([403, 404].includes(edit.status), `edit by stranger returned ${edit.status}`);
    const del = await api(`/video/${ctx.videoId}`, { method: 'DELETE', token: ctx.viewer.token });
    assert.ok([403, 404].includes(del.status), `delete by stranger returned ${del.status}`);
  });

  test('making a video private hides it from viewers; making it public brings it back', async () => {
    const t = ctx.creator.token;
    const priv = await api(`/video/${ctx.videoId}`, { method: 'PUT', token: t, json: { title: 'Street Food Tour (private)', visibility: 'private' } });
    assert.equal(priv.status, 200, JSON.stringify(priv.data));
    assert.equal(JSON.stringify((await api('/home')).data).includes(ctx.videoId), false, 'private video must leave the home feed');
    assert.equal(JSON.stringify((await api('/search?q=Street')).data).includes(ctx.videoId), false);
    const peek = await api(`/video/${ctx.videoId}`);
    assert.ok([403, 404].includes(peek.status), `anonymous view of a private video returned ${peek.status}`);
    assert.equal((await api(`/video/${ctx.videoId}`, { token: t })).status, 200, 'owner still sees it');

    const back = await api(`/video/${ctx.videoId}`, { method: 'PUT', token: t, json: { title: 'Street Food Tour Mumbai', visibility: 'public' } });
    assert.equal(back.status, 200);
    assert.ok(JSON.stringify((await api('/home')).data).includes(ctx.videoId));
  });

  test('channel details can be edited; the handle rules are enforced', async () => {
    const t = ctx.creator.token;
    const r = await api('/channel/me', { method: 'PUT', token: t, json: { name: 'Asha Kitchen', description: 'Updated bio' } });
    assert.equal(r.status, 200, JSON.stringify(r.data));
    assert.equal((await api('/channel/me', { token: t })).data.channel.name, 'Asha Kitchen');
    const bad = await api('/channel/me', { method: 'PUT', token: t, json: { name: 'x' } });
    assert.equal(bad.status, 400);
  });

  test('deleting a video removes it everywhere', async () => {
    const t = ctx.creator.token;
    assert.equal((await api(`/video/${ctx.videoId}`, { method: 'DELETE', token: t })).status, 200);
    assert.equal((await api(`/video/${ctx.videoId}`)).status, 404);
    assert.equal(JSON.stringify((await api('/home')).data).includes(ctx.videoId), false);
    assert.equal(JSON.stringify((await api('/user/me/following-feed', { token: ctx.viewer.token })).data).includes(ctx.videoId), false);
  });

  test('account deletion needs the right password and removes the account', async () => {
    const quitter = await signupAndLogin({ name: 'Leaving User', email: uniqueEmail('quit') });
    const wrong = await api('/user/me', { method: 'DELETE', token: quitter.token, json: { password: 'wrong-password' } });
    assert.ok([400, 401, 403].includes(wrong.status), `wrong password returned ${wrong.status}`);
    const ok = await api('/user/me', { method: 'DELETE', token: quitter.token, json: { password: quitter.password } });
    assert.equal(ok.status, 200, JSON.stringify(ok.data));
    assert.equal((await api('/user/me', { token: quitter.token })).status, 401, 'the old token stops working');
    const login = await api('/auth/login', { method: 'POST', json: { email: quitter.email, password: quitter.password } });
    assert.equal(login.status, 401);
  });
});
