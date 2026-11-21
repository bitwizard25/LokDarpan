import test from 'node:test';
import assert from 'node:assert/strict';
import { reconcileTranscodes } from '../src/modules/video/services/transcodeReconciler.js';
import { transcodeJobId } from '../src/shared/messaging/transcodeQueues.js';

const NOW = Date.parse('2026-11-16T10:00:00Z');
const GRACE = 120_000;

function makeDeps({ videos, jobs = {}, enqueueFails = false }) {
  const updates = [];
  const enqueued = [];
  const removed = [];
  const Video = {
    find(filter) {
      Video.lastFilter = filter;
      return { limit: () => ({ lean: async () => videos }) };
    },
    async updateOne(filter, update) { updates.push({ filter, update }); },
  };
  const getJob = async id => {
    const j = jobs[id];
    if (!j) return null;
    return { getState: async () => j.state, finishedOn: j.finishedOn, remove: async () => removed.push(id) };
  };
  const enqueue = async payload => {
    if (enqueueFails) throw new Error('redis down');
    enqueued.push(payload);
  };
  const buildPayload = v => ({ videoId: String(v._id), rawS3Key: v.rawS3Key });
  return { Video, getJob, enqueue, buildPayload, updates, enqueued, removed,
    base: { Video, getJob, enqueue, buildPayload, now: NOW, graceMs: GRACE, maxAttempts: 3, log: { info() {}, warn() {}, error() {} } } };
}

const stuck = (over = {}) => ({ _id: 'v1', status: 'PROCESSING', rawS3Key: 'raw/v1.mp4', transcodeAttempts: 0, ...over });

test('transcodeJobId is deterministic and BullMQ-safe (no colons)', () => {
  assert.equal(transcodeJobId('abc'), 'transcode-abc');
  assert.equal(transcodeJobId('abc').includes(':'), false);
});

test('re-enqueues a PROCESSING video whose job is missing from Redis', async () => {
  const d = makeDeps({ videos: [stuck()] });
  const r = await reconcileTranscodes(d.base);
  assert.deepEqual(d.enqueued, [{ videoId: 'v1', rawS3Key: 'raw/v1.mp4' }]);
  assert.equal(r.requeued, 1);
  assert.equal(d.updates[0].update.$inc.transcodeAttempts, 1);
  assert.equal(d.updates[0].filter.status, 'PROCESSING');
});

test('only looks at PROCESSING videos older than the grace window or with no request time', async () => {
  const d = makeDeps({ videos: [] });
  await reconcileTranscodes(d.base);
  assert.equal(d.Video.lastFilter.status, 'PROCESSING');
  assert.ok(d.Video.lastFilter.rawS3Key);
  assert.equal(d.Video.lastFilter.transcodeRequestedAt.$not.$gte.getTime(), NOW - GRACE);
});

test('leaves healthy jobs alone (waiting, active, delayed)', async () => {
  for (const state of ['waiting', 'active', 'delayed']) {
    const d = makeDeps({ videos: [stuck()], jobs: { [transcodeJobId('v1')]: { state } } });
    const r = await reconcileTranscodes(d.base);
    assert.equal(d.enqueued.length, 0, state);
    assert.equal(r.skipped, 1, state);
  }
});

test('failed job in Redis is removed then re-enqueued under the same id', async () => {
  const d = makeDeps({ videos: [stuck()], jobs: { [transcodeJobId('v1')]: { state: 'failed' } } });
  await reconcileTranscodes(d.base);
  assert.deepEqual(d.removed, [transcodeJobId('v1')]);
  assert.equal(d.enqueued.length, 1);
});

test('recently completed job is left alone (result message may still be in flight)', async () => {
  const d = makeDeps({ videos: [stuck()], jobs: { [transcodeJobId('v1')]: { state: 'completed', finishedOn: NOW - 10_000 } } });
  const r = await reconcileTranscodes(d.base);
  assert.equal(d.enqueued.length, 0);
  assert.equal(r.skipped, 1);
});

test('long-completed job whose result never applied is re-run', async () => {
  const d = makeDeps({ videos: [stuck()], jobs: { [transcodeJobId('v1')]: { state: 'completed', finishedOn: NOW - 10 * GRACE } } });
  await reconcileTranscodes(d.base);
  assert.equal(d.enqueued.length, 1);
  assert.deepEqual(d.removed, [transcodeJobId('v1')]);
});

test('marks FAILED instead of looping forever once attempts are exhausted', async () => {
  const d = makeDeps({ videos: [stuck({ transcodeAttempts: 3 })] });
  const r = await reconcileTranscodes(d.base);
  assert.equal(d.enqueued.length, 0);
  assert.equal(r.failed, 1);
  const set = d.updates[0].update.$set;
  assert.equal(set.status, 'FAILED');
  assert.match(set.processingError, /3 attempts/);
});

test('does not count an attempt or crash when Redis is down; retries next tick', async () => {
  const d = makeDeps({ videos: [stuck()], enqueueFails: true });
  const r = await reconcileTranscodes(d.base);
  assert.equal(d.updates.length, 0);
  assert.equal(r.errors, 1);
});
