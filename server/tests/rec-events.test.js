import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { createEventsService } from '../src/modules/recommendation/events.service.js';
import recommendationRoutes from '../src/modules/recommendation/recommendation.routes.js';
import { optionalAuthenticate } from '../src/middleware/auth.middleware.js';

const NOW = new Date('2026-11-13T10:00:00Z');
const SID = '11111111-1111-4111-8111-111111111111';
const V1 = '60c72b2f9b1d8b0015f8a001';
const UNKNOWN = '60c72b2f9b1d8b0015f8a999';

function ev(overrides = {}) {
  return {
    eventId: 'evt-' + Math.random().toString(36).slice(2),
    type: 'impression',
    video: V1,
    clientTs: NOW.toISOString(),
    ...overrides,
  };
}

test('ingest validates, clamps and never trusts identity', async () => {
  const stored = [];
  let viewIncrements = 0;
  const personalized = new Set();

  const svc = createEventsService({
    insertEvents: async (docs) => {
      stored.push(...docs);
      return docs;
    },
    findPublicVideoIds: async (ids) => ids.filter((id) => id === V1),
    incViews: async () => {
      viewIncrements++;
    },
    isPersonalized: async (u) => personalized.has(u),
    now: () => NOW,
  });

  const { accepted } = await svc.ingest({
    viewerId: 'U1',
    sessionId: SID,
    events: [
      ev({ type: 'impression', video: V1 }),
      ev({ type: 'watch_progress', video: V1, watchSeconds: 400 }),
      ev({ type: 'click', video: V1, clientTs: '2026-11-12T08:00:00Z' }), // 26 h old: dropped
      ev({ type: 'click', video: UNKNOWN }), // not public: dropped
    ],
  });

  assert.equal(accepted, 2);
  assert.equal(stored[1].watchSeconds, 15);
  assert.equal(stored[0].user, null); // isPersonalized('U1') resolved false
  assert.equal(stored[0].policy, 'v0.1');
});

test('a view is counted once per viewer, video and UTC day', async () => {
  const stored = [];
  let viewIncrements = 0;
  let shouldDrop = false;

  const svc = createEventsService({
    insertEvents: async (docs) => {
      if (shouldDrop) return [];
      stored.push(...docs);
      return docs;
    },
    findPublicVideoIds: async (ids) => ids.filter((id) => id === V1),
    incViews: async () => {
      viewIncrements++;
    },
    isPersonalized: async () => false,
    now: () => NOW,
  });

  await svc.ingest({ viewerId: null, sessionId: SID, events: [ev({ type: 'view', video: V1 })] });
  assert.equal(stored.at(-1).dedupeKey, `view:${SID}:${V1}:2026-11-13`);
  assert.equal(viewIncrements, 1);

  shouldDrop = true; // simulates duplicate-key drop
  await svc.ingest({ viewerId: null, sessionId: SID, events: [ev({ type: 'view', video: V1 })] });
  assert.equal(viewIncrements, 1);
});

test('personalized viewers are linked and keyed by account', async () => {
  const stored = [];
  const personalized = new Set(['U1']);

  const svc = createEventsService({
    insertEvents: async (docs) => {
      stored.push(...docs);
      return docs;
    },
    findPublicVideoIds: async (ids) => ids.filter((id) => id === V1),
    incViews: async () => {},
    isPersonalized: async (u) => personalized.has(u),
    now: () => NOW,
  });

  await svc.ingest({ viewerId: 'U1', sessionId: SID, events: [ev({ type: 'view', video: V1 })] });
  assert.equal(String(stored.at(-1).user), 'U1');
  assert.ok(stored.at(-1).dedupeKey.startsWith('view:U1:'));
});

test('oversize batches are rejected', async () => {
  const svc = createEventsService({
    insertEvents: async (docs) => docs,
    findPublicVideoIds: async (ids) => ids,
    incViews: async () => {},
    isPersonalized: async () => false,
    now: () => NOW,
  });

  await assert.rejects(
    svc.ingest({
      viewerId: null,
      sessionId: SID,
      events: Array.from({ length: 51 }, () => ev({ type: 'click', video: V1 })),
    }),
    /at most 50/
  );
});

test('HTTP endpoint validation and ingestion', async () => {
  const app = Fastify();
  await app.register(rateLimit, { global: false });

  const stored = [];
  const svc = createEventsService({
    insertEvents: async (docs) => {
      stored.push(...docs);
      return docs;
    },
    findPublicVideoIds: async (ids) => ids.filter((id) => id === V1),
    incViews: async () => {},
    isPersonalized: async () => false,
    now: () => NOW,
  });

  await app.register(recommendationRoutes, {
    prefix: '/api/v1',
    eventsService: svc,
    optionalAuthenticate,
  });

  // 1. Missing sessionId -> 400
  const resNoSession = await app.inject({
    method: 'POST',
    url: '/api/v1/recommendation-events',
    payload: { events: [ev()] },
  });
  assert.equal(resNoSession.statusCode, 400);

  // 2. Body carrying user -> 400 (additionalProperties: false)
  const resWithUser = await app.inject({
    method: 'POST',
    url: '/api/v1/recommendation-events',
    payload: { sessionId: SID, user: 'attacker', events: [ev()] },
  });
  assert.equal(resWithUser.statusCode, 400);

  // 3. Event of type like -> 400 (client cannot submit 'like')
  const resLike = await app.inject({
    method: 'POST',
    url: '/api/v1/recommendation-events',
    payload: { sessionId: SID, events: [ev({ type: 'like' })] },
  });
  assert.equal(resLike.statusCode, 400);

  // 4. Valid batch -> 202
  const resValid = await app.inject({
    method: 'POST',
    url: '/api/v1/recommendation-events',
    payload: { sessionId: SID, events: [ev({ type: 'impression' })] },
  });
  assert.equal(resValid.statusCode, 202);
  const data = JSON.parse(resValid.body);
  assert.equal(data.accepted, 1);

  await app.close();
});
