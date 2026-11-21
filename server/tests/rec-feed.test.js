import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import {
  createFeedService,
  encodeCursor,
  FeedExpiredError,
} from '../src/modules/recommendation/feed.service.js';
import { createHomeService } from '../src/modules/home/home.service.js';
import homeRoutes from '../src/modules/home/home.routes.js';
import recommendationRoutes from '../src/modules/recommendation/recommendation.routes.js';

function createMockCache() {
  const store = new Map();
  let failMode = false;
  return {
    async getSnapshot(id) {
      if (failMode) throw new Error('Redis connection error');
      return store.get(id) || null;
    },
    async setSnapshot(id, entries) {
      if (failMode) throw new Error('Redis connection error');
      store.set(id, entries);
    },
    fail() {
      failMode = true;
    },
    store,
  };
}

function makeVideo(i, overrides = {}) {
  const id = overrides._id || `v${i}`;
  const ownerId = overrides.user_id || `u${i % 5}`;
  const d = new Date(Date.now() - i * 3600000);
  return {
    _id: id,
    id,
    title: `Video ${id}`,
    description: `Description ${id}`,
    user_id: { _id: ownerId, name: `Owner ${ownerId}`, channel: { _id: `c_${ownerId}`, name: `Channel ${ownerId}`, logoUrl: null } },
    features: ['cat:entertainment', 'fmt:talk'],
    language: 'hi',
    likes: 10,
    dislikes: 1,
    views: 100,
    durationSeconds: 120,
    publishedAt: d,
    createdAt: d,
    status: 'COMPLETED',
    visibility: 'public',
    type: 'video',
    stats: { trending: overrides.stats?.trending ?? 0 },
    ...overrides,
  };
}

function createMockRepo(initialVideos = []) {
  let videos = [...initialVideos];

  return {
    setVideos(v) {
      videos = [...v];
    },
    makePrivate(id) {
      const idx = videos.findIndex((v) => String(v._id) === String(id));
      if (idx !== -1) {
        videos[idx] = { ...videos[idx], visibility: 'private' };
      }
    },
    async pool(name, ctx = {}, { category } = {}) {
      let filtered = videos.filter((v) => v.visibility === 'public');
      if (category && category !== 'all') {
        filtered = filtered.filter((v) => v.features?.includes(`cat:${category}`));
      }
      if (name === 'following') {
        if (!ctx.subscribedOwners || ctx.subscribedOwners.size === 0) return [];
        return filtered.filter((v) => {
          const ownerId = String(v.user_id?._id || v.user_id);
          return ctx.subscribedOwners.has(ownerId);
        });
      }
      if (name === 'interest') {
        if (!ctx.weights || ctx.weights.size === 0) return [];
        return filtered.filter((v) => v.features?.some((f) => ctx.weights.has(f)));
      }
      if (name === 'trending') {
        return filtered.filter((v) => (v.stats?.trending || 0) > 0);
      }
      if (name === 'fresh') {
        return [...filtered].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
      }
      if (name === 'explore') {
        return filtered.slice(0, 10);
      }
      return [];
    },
    async byIds(ids = []) {
      const idSet = new Set(ids.map(String));
      return videos.filter((v) => idSet.has(String(v._id)) && v.visibility === 'public');
    },
    async relatedPools(seed = {}) {
      const seedId = String(seed._id);
      return videos.filter((v) => String(v._id) !== seedId && v.visibility === 'public');
    },
  };
}

function createMockProfileService(viewerContext = {}) {
  return {
    async loadViewerContext({ viewerId, hints = [], languages = [] }) {
      const weights = new Map();
      if (viewerContext.weights) {
        for (const [k, v] of viewerContext.weights) {
          weights.set(k, { w: v, explicit: v, inferred: 0 });
        }
      }
      return {
        viewerId: viewerId ?? null,
        personalized: Boolean(viewerId || hints.length > 0),
        weights,
        excluded: new Set(viewerContext.excluded || []),
        hiddenCreators: new Set(viewerContext.hiddenCreators || []),
        notInterested: new Set(viewerContext.notInterested || []),
        languages: languages.length > 0 ? languages : (viewerContext.languages || []),
        discovery: viewerContext.discovery || 'balanced',
        subscribedOwners: new Set(viewerContext.subscribedOwners || []),
        watched: viewerContext.watched || new Map(),
      };
    },
  };
}

test('pages are stable and never repeat', async () => {
  const mockVideos = Array.from({ length: 30 }, (_, i) => makeVideo(i + 1));
  const repo = createMockRepo(mockVideos);
  const cache = createMockCache();
  const profileService = createMockProfileService();
  const feed = createFeedService({ repo, cache, profileService });

  const p1 = await feed.firstPage({ viewerId: 'U1', limit: 12 });
  assert.equal(p1.items.length, 12);
  assert.ok(p1.nextCursor);
  assert.equal(p1.hasMore, true);

  const p2 = await feed.nextPage({ cursor: p1.nextCursor, limit: 12 });
  assert.equal(p2.items.length, 12);

  const ids = [...p1.items, ...p2.items].map((i) => i.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(p2.requestId, p1.requestId);
});

test('a video made private between pages is skipped', async () => {
  const mockVideos = Array.from({ length: 30 }, (_, i) => makeVideo(i + 1));
  const repo = createMockRepo(mockVideos);
  const cache = createMockCache();
  const profileService = createMockProfileService();
  const feed = createFeedService({ repo, cache, profileService });

  const p1 = await feed.firstPage({ viewerId: 'U1', limit: 12 });
  const snapshotEntries = await cache.getSnapshot(p1.requestId);
  const targetId = snapshotEntries[12].id;

  repo.makePrivate(targetId);

  const p2 = await feed.nextPage({ cursor: p1.nextCursor, limit: 12 });
  assert.ok(!p2.items.some((i) => i.id === targetId));
});

test('small catalogues return fewer items without padding', async () => {
  const threeVideos = [makeVideo(1), makeVideo(2), makeVideo(3)];
  const repo = createMockRepo(threeVideos);
  const cache = createMockCache();
  const profileService = createMockProfileService();
  const feed = createFeedService({ repo, cache, profileService });

  const p = await feed.firstPage({ viewerId: null, limit: 12 });
  assert.equal(p.items.length, 3);
  assert.equal(p.hasMore, false);
  assert.equal(p.personalized, false);
  assert.equal(p.items.some((i) => i.rec?.source === 'interest'), false);
});

test('cache failure degrades to a single page', async () => {
  const mockVideos = Array.from({ length: 25 }, (_, i) => makeVideo(i + 1));
  const repo = createMockRepo(mockVideos);
  const cache = createMockCache();
  cache.fail();
  const profileService = createMockProfileService();
  const feed = createFeedService({ repo, cache, profileService });

  const p = await feed.firstPage({ viewerId: 'U1', limit: 12 });
  assert.equal(p.items.length, 12);
  assert.equal(p.hasMore, false);
  assert.equal(p.nextCursor, null);
});

test('expired snapshot throws FeedExpiredError', async () => {
  const repo = createMockRepo([]);
  const cache = createMockCache();
  const feed = createFeedService({ repo, cache });

  await assert.rejects(
    feed.nextPage({ cursor: encodeCursor('missing', 12), limit: 12 }),
    { name: 'FeedExpiredError' }
  );
});

test('when every video trending stats is 0, a guest first page is ordered newest first', async () => {
  const now = new Date('2026-11-13T12:00:00Z');
  const mockVideos = [
    makeVideo(1, { publishedAt: new Date(now - 3 * 3600000), stats: { trending: 0 } }),
    makeVideo(2, { publishedAt: new Date(now - 1 * 3600000), stats: { trending: 0 } }),
    makeVideo(3, { publishedAt: new Date(now - 5 * 3600000), stats: { trending: 0 } }),
  ];
  const repo = createMockRepo(mockVideos);
  const feed = createFeedService({
    repo,
    cache: createMockCache(),
    profileService: createMockProfileService(),
    now: () => now,
  });

  const p = await feed.firstPage({ viewerId: null, limit: 12 });
  assert.equal(p.items[0].id, 'v2');
  assert.equal(p.items[1].id, 'v1');
  assert.equal(p.items[2].id, 'v3');
});

test('excluded key, hidden creator, not-interested video and viewer own video never appear', async () => {
  const now = new Date('2026-11-13T12:00:00Z');
  const mockVideos = [
    makeVideo(1, { _id: 'v_not_interested' }),
    makeVideo(2, { _id: 'v_hidden_creator', user_id: 'creator_hidden' }),
    makeVideo(3, { _id: 'v_excluded_key', features: ['cat:excluded'] }),
    makeVideo(4, { _id: 'v_viewer_own', user_id: 'viewer_u1' }),
    makeVideo(5, { _id: 'v_allowed', user_id: 'other_creator', features: ['cat:entertainment'] }),
  ];
  const repo = createMockRepo(mockVideos);
  const profileService = createMockProfileService({
    viewerId: 'viewer_u1',
    notInterested: ['v_not_interested'],
    hiddenCreators: ['creator_hidden'],
    excluded: ['cat:excluded'],
  });
  const feed = createFeedService({
    repo,
    cache: createMockCache(),
    profileService,
    now: () => now,
  });

  const p = await feed.firstPage({ viewerId: 'viewer_u1', limit: 12 });
  assert.equal(p.items.length, 1);
  assert.equal(p.items[0].id, 'v_allowed');
});

test('category: "music" returns only cat:music videos', async () => {
  const mockVideos = [
    makeVideo(1, { _id: 'v_music_1', features: ['cat:music'] }),
    makeVideo(2, { _id: 'v_gaming_1', features: ['cat:gaming'] }),
    makeVideo(3, { _id: 'v_music_2', features: ['cat:music'] }),
  ];
  const repo = createMockRepo(mockVideos);
  const feed = createFeedService({
    repo,
    cache: createMockCache(),
    profileService: createMockProfileService(),
  });

  const p = await feed.firstPage({ viewerId: null, category: 'music', limit: 12 });
  assert.equal(p.items.length, 2);
  assert.ok(p.items.every((i) => i.id.startsWith('v_music_')));
});

test('related excludes seed, respects limit, caps owner at 3, has source "related"', async () => {
  const seed = makeVideo(99, { _id: 'seed_1', user_id: 'owner_a', features: ['cat:music', 'fmt:song'] });
  const mockVideos = [
    seed,
    makeVideo(1, { _id: 'rel_1', user_id: 'owner_b', features: ['cat:music'] }),
    makeVideo(2, { _id: 'rel_2', user_id: 'owner_b', features: ['cat:music'] }),
    makeVideo(3, { _id: 'rel_3', user_id: 'owner_b', features: ['cat:music'] }),
    makeVideo(4, { _id: 'rel_4', user_id: 'owner_b', features: ['cat:music'] }), // 4th from owner_b -> capped!
    makeVideo(5, { _id: 'rel_5', user_id: 'owner_c', features: ['cat:music'] }),
  ];
  const repo = createMockRepo(mockVideos);
  const feed = createFeedService({
    repo,
    cache: createMockCache(),
    profileService: createMockProfileService(),
    readableVideo: async (id) => mockVideos.find((v) => String(v._id) === String(id)),
  });

  const res = await feed.related({ viewerId: null, seedVideoId: 'seed_1', limit: 10 });
  assert.ok(!res.items.some((i) => i.id === 'seed_1'));
  const ownerBItems = res.items.filter((i) => i.channel.name.includes('owner_b'));
  assert.ok(ownerBItems.length <= 3);
  assert.ok(res.items.every((i) => i.rec?.source === 'related'));
});

test('HTTP GET /recommendations validation and error handling', async (t) => {
  const app = Fastify();
  t.after(() => app.close());

  const mockVideos = Array.from({ length: 15 }, (_, i) => makeVideo(i + 1));
  const repo = createMockRepo(mockVideos);
  const cache = createMockCache();
  const profileService = createMockProfileService();
  const feedService = createFeedService({ repo, cache, profileService });

  await app.register(recommendationRoutes, {
    authenticate: async () => {},
    optionalAuthenticate: async () => {},
    feedService,
  });

  // Malformed cursor
  const badCursorRes = await app.inject('/recommendations?cursor=invalid_base64_not_cursor');
  assert.equal(badCursorRes.statusCode, 400);

  // Expired cursor
  const expiredCursor = encodeCursor('non_existent_snapshot_id', 12);
  const expiredRes = await app.inject(`/recommendations?cursor=${expiredCursor}`);
  assert.equal(expiredRes.statusCode, 410);
  assert.equal(expiredRes.json().error?.code, 'FEED_EXPIRED');

  // Valid first page
  const validRes = await app.inject('/recommendations?limit=5');
  assert.equal(validRes.statusCode, 200);
  const body = validRes.json();
  assert.equal(body.items.length, 5);
  assert.ok(body.requestId);
});

test('HTTP GET /home integrates for-you when personalized and degrades gracefully when feed throws', async (t) => {
  const app = Fastify();
  t.after(() => app.close());

  const failingFeed = {
    async firstPage() {
      throw new Error('Feed generation exploded');
    },
  };

  const getHomeFailingFeed = createHomeService(
    async () => [makeVideo(1), makeVideo(2)],
    { feedService: failingFeed }
  );

  await app.register(homeRoutes, {
    prefix: '/api/v1/home',
    getHome: getHomeFailingFeed,
    optionalAuthenticate: async () => {},
  });

  // Degradation when feed throws
  const resFailing = await app.inject('/api/v1/home');
  assert.equal(resFailing.statusCode, 200);
  const jsonFailing = resFailing.json();
  assert.ok(jsonFailing.requestId);
  assert.ok(!jsonFailing.sections.some((s) => s.id === 'for-you'));

  // Personalized viewer gets for-you section prepended
  const personalizedFeed = {
    async firstPage({ viewerId }) {
      return {
        requestId: 'req_personalized_123',
        items: [makeVideo(101), makeVideo(102)],
        hasMore: false,
        nextCursor: null,
        personalized: Boolean(viewerId),
      };
    },
  };

  const getHomePersonalized = createHomeService(
    async () => [makeVideo(1), makeVideo(2)],
    { feedService: personalizedFeed }
  );

  const appPersonalized = Fastify();
  t.after(() => appPersonalized.close());

  await appPersonalized.register(homeRoutes, {
    prefix: '/api/v1/home',
    getHome: getHomePersonalized,
    optionalAuthenticate: async (req) => {
      req.userId = 'user_123';
    },
  });

  const resPers = await appPersonalized.inject('/api/v1/home');
  assert.equal(resPers.statusCode, 200);
  const jsonPers = resPers.json();
  assert.equal(jsonPers.requestId, 'req_personalized_123');
  assert.equal(jsonPers.sections[0].id, 'for-you');
  assert.equal(jsonPers.sections[0].items.length, 2);
});
