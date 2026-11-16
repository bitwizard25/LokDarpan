import test from 'node:test';
import assert from 'node:assert/strict';
import { mapAnswers } from '../src/modules/recommendation/onboarding.v1.js';
import { inferWeights } from '../src/modules/recommendation/scoring.js';
import { createRecCache } from '../src/modules/recommendation/snapshot.cache.js';
import { createProfileService } from '../src/modules/recommendation/profile.service.js';

test('mapAnswers turns answers into weak, combined hints', () => {
  const out = mapAnswers({
    answers: [
      { questionId: 'after_long_day', optionIds: ['laugh', 'calming'] },
      { questionId: 'free_afternoon', optionIds: ['music'] },
      { questionId: 'languages', optionIds: ['hi', 'mr'] },
    ],
    pickedVideos: [],
  });
  const w = Object.fromEntries(out.keys.map((k) => [k.key, k.weight]));
  assert.ok(Math.abs(w['cat:comedy'] - 0.3) < 1e-9);
  assert.ok(Math.abs(w['cat:music'] - 0.44) < 1e-9); // 1 − 0.8 · 0.7 = 0.44
  assert.deepEqual(out.languages, ['hi', 'mr']);
  assert.equal(out.discovery, 'balanced');
  assert.equal(
    mapAnswers({ answers: [{ questionId: 'after_long_day', optionIds: ['new'] }], pickedVideos: [] }).discovery,
    'high'
  );
  assert.throws(() => mapAnswers({ answers: [{ questionId: 'nope', optionIds: [] }], pickedVideos: [] }));
});

test('inferWeights decays, boosts search and caps', () => {
  const now = new Date('2026-11-13T00:00:00Z');
  const f = new Map([['v', ['cat:music']]]);
  const at = (days) => new Date(now - days * 86400000);
  const one = inferWeights([{ type: 'view', surface: 'home', video: 'v', createdAt: at(0) }], f, now);
  assert.ok(Math.abs(one.get('cat:music') - 0.10) < 1e-9);
  const two = inferWeights(
    [
      { type: 'view', surface: 'home', video: 'v', createdAt: at(0) },
      { type: 'like', surface: 'home', video: 'v', createdAt: at(14) },
    ],
    f,
    now
  );
  assert.ok(Math.abs(two.get('cat:music') - 0.182773) < 1e-5);
  assert.ok(
    Math.abs(
      inferWeights([{ type: 'view', surface: 'search', video: 'v', createdAt: at(0) }], f, now).get('cat:music') - 0.15
    ) < 1e-9
  );
  assert.equal(
    inferWeights(
      Array.from({ length: 20 }, () => ({ type: 'like', surface: 'home', video: 'v', createdAt: at(0) })),
      f,
      now
    ).get('cat:music'),
    0.6
  );
  assert.equal(inferWeights([{ type: 'like', surface: 'home', video: 'v', createdAt: at(31) }], f, now).size, 0);
});

test('createProfileService handles fakes and lifecycle', async () => {
  let profileDoc = {
    user: 'u1',
    personalizationEnabled: true,
    languages: ['hi'],
    discovery: 'balanced',
    explicit: [{ key: 'cat:music', weight: 0.5, source: 'tune' }],
    excluded: [],
    hiddenCreators: [],
    notInterested: [],
    onboarding: { version: 'v1', completed: true },
  };

  const fakeProfiles = {
    findOne: async ({ user }) => (user === 'u1' ? { ...profileDoc } : null),
    findOneAndUpdate: async ({ user }, update, options) => {
      if (update.$set) Object.assign(profileDoc, update.$set);
      if (update.$addToSet?.hiddenCreators) {
        if (!profileDoc.hiddenCreators.includes(update.$addToSet.hiddenCreators)) {
          profileDoc.hiddenCreators.push(update.$addToSet.hiddenCreators);
        }
      }
      return { ...profileDoc };
    },
    deleteOne: async ({ user }) => {
      profileDoc = null;
    },
  };

  let unlinkedUser = null;
  const fakeEvents = {
    find: () => ({
      lean: async () => [
        { type: 'view', surface: 'home', video: 'v1', createdAt: new Date() },
      ],
    }),
    updateMany: async ({ user }, { $set }) => {
      if ($set.user === null) unlinkedUser = user;
    },
  };

  const fakeVideos = {
    findById: async (id) => ({ _id: id, user_id: 'creator1' }),
    find: () => ({
      lean: async () => [{ _id: 'v1', features: ['cat:music'] }],
    }),
  };

  const fakeUsers = {
    findById: () => ({
      select: () => ({
        lean: async () => ({ subscribedChannels: ['creator2'] }),
      }),
    }),
  };

  const fakeWatchHistory = {
    find: () => ({
      sort: () => ({
        limit: () => ({
          lean: async () => [],
        }),
      }),
    }),
  };

  let droppedCache = null;
  const fakeCache = {
    getProfile: async () => null,
    setProfile: async () => {},
    dropProfile: async (u) => {
      droppedCache = u;
    },
  };

  const svc = createProfileService({
    profiles: fakeProfiles,
    events: fakeEvents,
    videos: fakeVideos,
    users: fakeUsers,
    watchHistory: fakeWatchHistory,
    cache: fakeCache,
    now: () => new Date('2026-11-13T00:00:00Z'),
  });

  // 1. loadViewerContext for authenticated user
  const ctx = await svc.loadViewerContext({ viewerId: 'u1' });
  assert.equal(ctx.personalized, true);
  assert.ok(ctx.weights.has('cat:music'));

  // 2. updatePreferences with conflicting keys
  await svc.updatePreferences('u1', {
    explicitKeys: ['cat:comedy', 'cat:sports'],
    excludedKeys: ['cat:comedy'],
  });
  assert.equal(droppedCache, 'u1');
  assert.ok(profileDoc.excluded.some((k) => k.key === 'cat:comedy'));
  assert.ok(!profileDoc.explicit.some((k) => k.key === 'cat:comedy'));

  // 3. updatePreferences turning off personalization unlinks events
  await svc.updatePreferences('u1', { personalizationEnabled: false });
  assert.equal(unlinkedUser, 'u1');

  // 4. Guest with hints
  const guestCtx = await svc.loadViewerContext({
    viewerId: null,
    hints: ['cat:music', 'bad key'],
  });
  assert.equal(guestCtx.personalized, false);
  assert.ok(guestCtx.weights.has('cat:music'));
  assert.equal(guestCtx.weights.get('cat:music').explicit, 0.3);
  assert.equal(guestCtx.weights.has('bad key'), false);

  // 5. Feedback hide_channel and not_interested
  await svc.setFeedback('u1', 'v1', { action: 'hide_channel', active: true });
  assert.ok(profileDoc.hiddenCreators.includes('creator1'));

  // 6. deleteForUser
  await svc.deleteForUser('u1');
  assert.equal(profileDoc, null);
});
