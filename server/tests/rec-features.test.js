import test from 'node:test';
import assert from 'node:assert/strict';
import { videoFeatures, isValidKey, keyLabel, needsPublishedAt } from '../src/modules/recommendation/features.js';

test('videoFeatures derives sorted, deduped keys and keeps Devanagari marks', () => {
  assert.deepEqual(
    videoFeatures({ category: 'COMEDY', format: 'story', language: 'hi', durationSeconds: 240, tags: ['Stand Up', 'stand up', 'हास्य!'] }),
    ['cat:comedy', 'fmt:story', 'lang:hi', 'len:short', 'tag:stand-up', 'tag:हास्य']
  );
});

test('videoFeatures handles missing and unknown metadata', () => {
  assert.deepEqual(videoFeatures({}), ['cat:other']);
  assert.deepEqual(videoFeatures({ category: 'Knitting', type: 'short', durationSeconds: 5000, format: 'other', language: 'und' }), ['cat:other', 'len:short']);
  assert.ok(videoFeatures({ durationSeconds: 300 }).includes('len:medium'));
  assert.ok(videoFeatures({ durationSeconds: 1200 }).includes('len:long'));
  assert.equal(videoFeatures({ tags: Array.from({ length: 14 }, (_, i) => `t${i}`) }).filter(k => k.startsWith('tag:')).length, 10);
});

test('key grammar and publish rule', () => {
  assert.equal(isValidKey('tag:हास्य'), true);
  assert.equal(isValidKey('user:123'), false);
  assert.equal(isValidKey('tag:' + 'a'.repeat(41)), false);
  assert.equal(needsPublishedAt({ status: 'COMPLETED', visibility: 'public' }), true);
  assert.equal(needsPublishedAt({ status: 'COMPLETED' }), true); // legacy: missing visibility is public
  assert.equal(needsPublishedAt({ status: 'COMPLETED', visibility: 'private' }), false);
  assert.equal(needsPublishedAt({ status: 'PROCESSING', visibility: 'public' }), false);
  assert.equal(needsPublishedAt({ status: 'COMPLETED', visibility: 'public', publishedAt: new Date() }), false);
});

test('keyLabel maps feature keys to readable labels', () => {
  assert.equal(keyLabel('cat:comedy'), 'Comedy');
  assert.equal(keyLabel('fmt:story'), 'Stories');
  assert.equal(keyLabel('fmt:explainer'), 'Explainers');
  assert.equal(keyLabel('fmt:tutorial'), 'How-to videos');
  assert.equal(keyLabel('fmt:update'), 'Quick updates');
  assert.equal(keyLabel('len:short'), 'Shorter videos');
  assert.equal(keyLabel('lang:hi'), 'Hindi');
  assert.equal(keyLabel('lang:mr'), 'Marathi');
  assert.equal(keyLabel('lang:en'), 'English');
  assert.equal(keyLabel('tag:dance'), '#dance');
  assert.equal(keyLabel('tag:हास्य'), '#हास्य');
});

