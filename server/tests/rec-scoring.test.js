import test from 'node:test';
import assert from 'node:assert/strict';
import {
  scoreVideo,
  interestScore,
  isExcluded,
  jaccard,
  relatedScore,
  rerank,
  reasonFor,
} from '../src/modules/recommendation/scoring.js';

function context(partial = {}) {
  const weights = new Map();
  if (partial.weights) {
    for (const [k, v] of partial.weights) {
      if (typeof v === 'number') {
        weights.set(k, { w: v, explicit: v, inferred: 0 });
      } else {
        weights.set(k, v);
      }
    }
  }

  return {
    viewerId: partial.viewerId ?? null,
    personalized: partial.personalized ?? Boolean(partial.viewerId),
    weights,
    excluded: new Set(partial.excluded || []),
    hiddenCreators: new Set(partial.hiddenCreators || []),
    notInterested: new Set(partial.notInterested || []),
    languages: partial.languages || [],
    discovery: partial.discovery || 'balanced',
    subscribedOwners: new Set(partial.subscribedOwners || []),
    watched: partial.watched || new Map(),
  };
}

const now = new Date('2026-11-13T00:00:00Z');
const video = {
  _id: 'v1',
  user_id: 'o1',
  features: ['cat:music', 'fmt:story'],
  language: 'hi',
  likes: 3,
  dislikes: 1,
  publishedAt: new Date(now - 14 * 86400000),
  durationSeconds: 600,
  stats: { trending: 0.5 },
};
const ctx = context({
  weights: [
    ['cat:music', 0.3],
    ['fmt:story', 0.5],
  ],
  subscribedOwners: ['o1'],
});

test('score matches the formula', () => {
  const r = scoreVideo(video, ctx, now);
  assert.ok(Math.abs(r.components.interest - 0.65) < 1e-9);
  assert.ok(Math.abs(r.score - 0.648515) < 1e-6);
  assert.equal(r.topKey, 'fmt:story');
});

test('multipliers and exclusions', () => {
  assert.ok(
    Math.abs(
      scoreVideo(video, { ...ctx, watched: new Map([['v1', 540]]) }, now).score - 0.162129
    ) < 1e-6
  );
  assert.ok(
    Math.abs(
      scoreVideo({ ...video, language: 'en' }, { ...ctx, languages: ['hi'] }, now).score -
        0.324258
    ) < 1e-6
  );
  assert.ok(
    Math.abs(
      scoreVideo({ ...video, language: 'und' }, { ...ctx, languages: ['hi'] }, now).score -
        0.648515
    ) < 1e-6
  );
  // No duration: never treated as watched.
  assert.ok(
    Math.abs(
      scoreVideo(
        { ...video, durationSeconds: undefined },
        { ...ctx, watched: new Map([['v1', 540]]) },
        now
      ).score - 0.648515
    ) < 1e-6
  );
  assert.equal(isExcluded(video, { ...ctx, excluded: new Set(['cat:music']) }), true);
  assert.equal(isExcluded(video, { ...ctx, hiddenCreators: new Set(['o1']) }), true);
  assert.equal(isExcluded(video, { ...ctx, notInterested: new Set(['v1']) }), true);
  assert.equal(isExcluded(video, { ...ctx, viewerId: 'o1' }), true);
});

test('a guest scores on trending, freshness and quality only', () => {
  const r = scoreVideo(video, context({}), now);
  assert.equal(r.components.interest, 0);
  assert.equal(r.components.follow, 0);
  assert.equal(r.topKey, null);
});

test('jaccard', () => {
  assert.ok(Math.abs(jaccard(['a', 'b'], ['b', 'c']) - 1 / 3) < 1e-9);
});

test('rerank channel cap, explore slots and deterministic ordering', () => {
  // Simple LCG PRNG for testing
  function makePrng(seed = 12345) {
    let s = seed;
    return () => {
      s = (s * 1664525 + 1013904223) % 4294967296;
      return s / 4294967296;
    };
  }

  // Five top-scored videos from 'ownerA', ten from others
  const ranked = [];
  for (let i = 1; i <= 5; i++) {
    ranked.push({
      video: { _id: `a${i}`, user_id: 'ownerA' },
      score: 100 - i,
      source: 'interest',
      topKey: 'cat:music',
    });
  }
  for (let i = 1; i <= 10; i++) {
    ranked.push({
      video: { _id: `o${i}`, user_id: `other${i}` },
      score: 80 - i,
      source: 'interest',
      topKey: 'cat:music',
    });
  }

  const explorePool = [
    { _id: 'e1', user_id: 'expOwner1' },
    { _id: 'e2', user_id: 'expOwner2' },
  ];

  // 1. Channel cap test (without explore slots)
  const resultNoExplore = rerank(ranked, [], {
    pageSize: 12,
    channelCap: 2,
    exploreSlots: 0,
    random: makePrng(42),
  });
  const page1 = resultNoExplore.slice(0, 12);
  const ownerACount = page1.filter((item) => item.id.startsWith('a')).length;
  assert.ok(ownerACount <= 2, `Expected at most 2 videos from ownerA, got ${ownerACount}`);
  assert.equal(resultNoExplore.length, 15);
  const uniqueIds = new Set(resultNoExplore.map((i) => i.id));
  assert.equal(uniqueIds.size, 15);

  // 2. Explore slots test
  const resultWithExplore = rerank(ranked, explorePool, {
    pageSize: 12,
    channelCap: 2,
    exploreSlots: 2,
    random: makePrng(42),
  });
  assert.equal(resultWithExplore[3].source, 'explore');
  assert.equal(resultWithExplore[8].source, 'explore');

  // 3. Empty explore pool test: no gaps, no explore sources
  const resultEmptyPool = rerank(ranked.slice(0, 4), [], {
    pageSize: 12,
    channelCap: 2,
    exploreSlots: 2,
    random: makePrng(42),
  });
  assert.equal(resultEmptyPool.length, 4);
  assert.ok(resultEmptyPool.every((r) => r.source !== 'explore'));

  // 4. Deterministic order with same seed
  const run1 = rerank(ranked, explorePool, {
    pageSize: 12,
    channelCap: 2,
    exploreSlots: 2,
    random: makePrng(999),
  });
  const run2 = rerank(ranked, explorePool, {
    pageSize: 12,
    channelCap: 2,
    exploreSlots: 2,
    random: makePrng(999),
  });
  assert.deepEqual(
    run1.map((r) => r.id),
    run2.map((r) => r.id)
  );

  // 5. reasonFor
  const rExplicit = reasonFor('interest', 'fmt:story', ctx);
  assert.equal(rExplicit.type, 'explicit');
  assert.equal(rExplicit.label, 'Stories');

  const ctxInferred = context({
    weights: [['fmt:story', { w: 0.5, explicit: 0.1, inferred: 0.4 }]],
  });
  const rInferred = reasonFor('interest', 'fmt:story', ctxInferred);
  assert.equal(rInferred.type, 'inferred');
  assert.equal(rInferred.label, 'Stories');

  assert.equal(reasonFor('following', null, ctx).type, 'following');
  assert.equal(reasonFor('trending', null, ctx).type, 'trending');
  assert.equal(reasonFor('fresh', null, ctx).type, 'fresh');
  assert.equal(reasonFor('explore', null, ctx).type, 'explore');
});
