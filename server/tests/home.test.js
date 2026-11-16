import test from 'node:test';
import assert from 'node:assert/strict';

// These tests protect public-feed filtering, safe output, and category isolation.
test('home excludes unfinished or unplayable videos and private account fields', async () => {
  const { createHomeService } = await import('../src/modules/home/home.service.js');
  const queries = [];
  const service = createHomeService(async (filter, sort, limit) => {
    queries.push({ filter, sort, limit });
    return [{ _id: 'video-1', title: 'Real video', description: 'Description',
      views: 12, durationSeconds: 90, createdAt: new Date('2026-11-01'),
      user_id: { _id: 'user-1', name: 'Raj', password: 'never-return',
        channel: { _id: 'channel-1', name: 'My channel', logoUrl: 'https://example.com/logo.png' } },
      rawS3Key: 'private-key' }];
  });
  const home = await service({ category: 'technology', limit: 4 });
  assert.equal(home.activeCategory, 'technology');
  assert.equal(home.featured.id, 'video-1');
  assert.equal(home.sections[0].items[0].channel.id, 'channel-1');
  assert.equal(home.sections[0].items[0].durationSeconds, 90);
  assert.equal(JSON.stringify(home).includes('never-return'), false);
  assert.equal(JSON.stringify(home).includes('private-key'), false);
  for (const query of queries) {
    assert.equal(query.filter.status, 'COMPLETED');
    assert.ok(query.filter.$or.some(item => item.hlsMasterUrl));
    assert.equal(query.filter.category.$regex, '^Technology$');
    assert.ok(query.limit <= 12);
  }
});

test('empty catalogue has no fabricated featured video', async () => {
  const { createHomeService } = await import('../src/modules/home/home.service.js');
  const home = await createHomeService(async () => [])({});
  assert.equal(home.featured, null);
  assert.ok(home.sections.every(section => section.items.length === 0));
});

test('invalid categories and oversized limits are rejected', async () => {
  const { createHomeService } = await import('../src/modules/home/home.service.js');
  const home = createHomeService(async () => []);
  await assert.rejects(() => home({ category: '.*' }), /category/i);
  await assert.rejects(() => home({ limit: 10000 }), /limit/i);
});

test('HTTP endpoint serves safe cards and rejects out-of-range requests', async t => {
  const { default: Fastify } = await import('fastify');
  const { default: routes } = await import('../src/modules/home/home.routes.js');
  const { createHomeService } = await import('../src/modules/home/home.service.js');
  const app = Fastify();
  t.after(() => app.close());
  await app.register(routes, { prefix: '/api/v1/home', getHome: createHomeService(async () => []) });
  const response = await app.inject('/api/v1/home?category=music&limit=4');
  assert.equal(response.statusCode, 200);
  assert.equal(response.json().activeCategory, 'music');
  assert.equal(response.json().featured, null);
  assert.equal((await app.inject('/api/v1/home?limit=999')).statusCode, 400);
  assert.equal((await app.inject('/api/v1/home?category=unknown')).statusCode, 400);
});

test('HTTP endpoint reports database failure without exposing internal errors', async t => {
  const { default: Fastify } = await import('fastify');
  const { default: routes } = await import('../src/modules/home/home.routes.js');
  const app = Fastify();
  t.after(() => app.close());
  await app.register(routes, { prefix: '/api/v1/home', getHome: async () => { throw new Error('secret database credentials'); } });
  const response = await app.inject('/api/v1/home');
  assert.equal(response.statusCode, 503);
  assert.equal(response.json().error.code, 'HOME_UNAVAILABLE');
  assert.equal(response.body.includes('secret'), false);
});
