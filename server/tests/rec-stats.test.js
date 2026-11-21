import test from 'node:test';
import assert from 'node:assert/strict';
import { computeVideoStats, runStatsJob } from '../src/modules/recommendation/stats.job.js';

test('trending is a percentile of smoothed engagement', () => {
  const stats = computeVideoStats([
    { video: 'a', type: 'impression', count: 100 }, { video: 'a', type: 'play_start', count: 20 },
    { video: 'a', type: 'view', count: 10 },        { video: 'a', type: 'watch_progress', count: 90, watchSeconds: 1200 },
    { video: 'b', type: 'impression', count: 10 },  { video: 'b', type: 'play_start', count: 1 },
    { video: 'b', type: 'watch_progress', count: 6, watchSeconds: 60 },
  ], [{ _id: 'a', durationSeconds: 120 }, { _id: 'b', durationSeconds: 60 }, { _id: 'c', durationSeconds: 60 }]);

  assert.equal(stats.get('a').trending, 1);      // trendRaw ≈ 0.2568
  assert.equal(stats.get('b').trending, 0.5);    // trendRaw ≈ 0.0289
  assert.equal(stats.get('c').trending, 0);      // no plays
  assert.equal(stats.get('a').plays7d, 20);
  assert.equal(stats.get('a').views7d, 10);
  assert.equal(stats.get('c').impressions7d, 0); // stale stats are reset, not left behind
});

test('video with missing duration does not throw and gets finite trending', () => {
  const stats = computeVideoStats([
    { video: 'x', type: 'play_start', count: 5 },
    { video: 'x', type: 'watch_progress', count: 2, watchSeconds: 40 },
  ], [{ _id: 'x' }]);

  const xStats = stats.get('x');
  assert.ok(xStats);
  assert.ok(Number.isFinite(xStats.trending));
  assert.equal(xStats.trending, 1);
});

test('runStatsJob orchestrates aggregation, computation and bulk write', async () => {
  const fakeVideos = [{ _id: 'v1', durationSeconds: 100 }];
  const fakeEvents = [{ video: 'v1', type: 'play_start', count: 4, watchSeconds: 0 }];
  let writtenOps = null;

  const result = await runStatsJob({
    aggregateEvents: async () => fakeEvents,
    listEligibleVideos: async () => fakeVideos,
    writeStats: async (statsMap) => {
      writtenOps = statsMap;
    },
    now: new Date('2026-11-13T12:00:00Z'),
  });

  assert.equal(result.videos, 1);
  assert.ok(writtenOps.has('v1'));
  assert.equal(writtenOps.get('v1').plays7d, 4);
});
