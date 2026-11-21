import test from 'node:test';
import assert from 'node:assert/strict';
import User from '../src/modules/auth/schemas/user.schema.js';
import VerificationRequest from '../src/modules/verification/verification.schema.js';
import verificationStorage from '../src/modules/verification/verification.storage.js';
import verificationService from '../src/modules/verification/verification.service.js';
import { isAdminEmail, requireAdmin } from '../src/modules/verification/admin.js';

const userId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const adminId = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const reqId = 'cccccccccccccccccccccccc';

function query(value) {
  return {
    select() { return this; }, sort() { return this; }, limit() { return this; }, populate() { return this; },
    lean: async () => value, then(res, rej) { return Promise.resolve(value).then(res, rej); },
  };
}
const jpeg = (size = 64) => Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(size)]);
const png = () => Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47]), Buffer.alloc(32)]);
const goodInput = (over = {}) => ({ legalName: 'Asha Rao', documentType: 'passport', file: { buffer: jpeg(), mimetype: 'image/jpeg' }, ...over });

// ---------- admin ----------
test('isAdminEmail matches ADMIN_EMAILS case-insensitively and fails closed when unset', () => {
  assert.equal(isAdminEmail('Boss@Example.com', { ADMIN_EMAILS: ' boss@example.com , two@x.io ' }), true);
  assert.equal(isAdminEmail('two@x.io', { ADMIN_EMAILS: 'boss@example.com,two@x.io' }), true);
  assert.equal(isAdminEmail('nobody@x.io', { ADMIN_EMAILS: 'boss@example.com' }), false);
  assert.equal(isAdminEmail('boss@example.com', {}), false);
  assert.equal(isAdminEmail(undefined, { ADMIN_EMAILS: 'boss@example.com' }), false);
});

test('requireAdmin lets an admin through and answers 403 for everyone else', async t => {
  process.env.ADMIN_EMAILS = 'boss@example.com';
  t.after(() => { delete process.env.ADMIN_EMAILS; });
  const authenticate = async request => { request.userId = request.fakeUser; };
  const guard = requireAdmin(authenticate);
  t.mock.method(User, 'findById', id => query({ email: id === adminId ? 'boss@example.com' : 'user@example.com' }));
  await guard({ fakeUser: adminId });
  await assert.rejects(() => guard({ fakeUser: userId }), e => e.statusCode === 403);
});

// ---------- status ----------
test('status falls back to manual when DigiLocker is not configured', async t => {
  delete process.env.DIGILOCKER_CLIENT_ID; delete process.env.DIGILOCKER_CLIENT_SECRET;
  t.mock.method(User, 'findById', () => query({}));
  t.mock.method(VerificationRequest, 'findOne', () => query(null));
  const s = await verificationService.getStatus(userId);
  assert.deepEqual([s.provider, s.configured, s.manualAvailable, s.status], ['manual', false, true, 'not_verified']);
});

test('status reports digilocker once both credentials are present', async t => {
  process.env.DIGILOCKER_CLIENT_ID = 'id'; process.env.DIGILOCKER_CLIENT_SECRET = 'secret';
  t.after(() => { delete process.env.DIGILOCKER_CLIENT_ID; delete process.env.DIGILOCKER_CLIENT_SECRET; });
  t.mock.method(User, 'findById', () => query({}));
  t.mock.method(VerificationRequest, 'findOne', () => query(null));
  const s = await verificationService.getStatus(userId);
  assert.deepEqual([s.provider, s.configured], ['digilocker', true]);
});

test('status: verified wins; otherwise latest request decides (pending / rejected + reason)', async t => {
  t.mock.method(User, 'findById', () => query({ identityVerification: { verifiedAt: new Date('2026-01-01') } }));
  assert.equal((await verificationService.getStatus(userId)).status, 'verified');
  t.mock.restoreAll();

  t.mock.method(User, 'findById', () => query({}));
  t.mock.method(VerificationRequest, 'findOne', () => query({ status: 'pending', submittedAt: new Date() }));
  assert.equal((await verificationService.getStatus(userId)).status, 'pending');
  t.mock.restoreAll();

  t.mock.method(User, 'findById', () => query({}));
  t.mock.method(VerificationRequest, 'findOne', () => query({ status: 'rejected', rejectionReason: 'Photo is blurry' }));
  const s = await verificationService.getStatus(userId);
  assert.equal(s.status, 'rejected');
  assert.equal(s.rejectionReason, 'Photo is blurry');
});

// ---------- submit ----------
test('submit stores the document under a private per-user key and creates a pending request', async t => {
  t.mock.method(User, 'findById', () => query({}));
  t.mock.method(VerificationRequest, 'exists', async () => null);
  const put = t.mock.method(verificationStorage, 'putPrivate', async () => {});
  let created;
  t.mock.method(VerificationRequest, 'create', async doc => { created = doc; return doc; });
  const out = await verificationService.submitManual(userId, goodInput());
  assert.equal(out.status, 'pending');
  const key = put.mock.calls[0].arguments[0];
  assert.match(key, new RegExp(`^identity-documents/${userId}/[a-f0-9]{24}\\.jpg$`));
  assert.equal(created.documentKey, key);
  assert.equal(created.legalName, 'Asha Rao');
  assert.equal(JSON.stringify(out).includes('identity-documents'), false, 'storage key must not leak to the client');
});

test('submit rejects bad input before touching storage', async t => {
  t.mock.method(User, 'findById', () => query({}));
  t.mock.method(VerificationRequest, 'exists', async () => null);
  const put = t.mock.method(verificationStorage, 'putPrivate', async () => {});
  const bad = [
    goodInput({ legalName: 'Al' }),
    goodInput({ documentType: 'library_card' }),
    goodInput({ file: undefined }),
    goodInput({ file: { buffer: jpeg(), mimetype: 'application/pdf' } }),
    goodInput({ file: { buffer: png(), mimetype: 'image/jpeg' } }),            // content does not match claimed type
    goodInput({ file: { buffer: jpeg(5 * 1024 * 1024), mimetype: 'image/jpeg' } }), // over 5 MB
  ];
  for (const input of bad) {
    await assert.rejects(() => verificationService.submitManual(userId, input), e => e.statusCode === 400);
  }
  assert.equal(put.mock.callCount(), 0);
});

test('submit refuses an already-verified user with 409', async t => {
  t.mock.method(User, 'findById', () => query({ identityVerification: { verifiedAt: new Date() } }));
  await assert.rejects(() => verificationService.submitManual(userId, goodInput()), e => e.statusCode === 409);
});

test('an existing pending request is refused with 409 before anything is uploaded', async t => {
  t.mock.method(User, 'findById', () => query({}));
  t.mock.method(VerificationRequest, 'exists', async () => ({ _id: reqId }));
  const put = t.mock.method(verificationStorage, 'putPrivate', async () => {});
  await assert.rejects(() => verificationService.submitManual(userId, goodInput()), e => e.statusCode === 409);
  assert.equal(put.mock.callCount(), 0);
});

test('a second concurrent pending request hits the unique index: 409 and the uploaded file is removed', async t => {
  t.mock.method(User, 'findById', () => query({}));
  t.mock.method(VerificationRequest, 'exists', async () => null);
  t.mock.method(verificationStorage, 'putPrivate', async () => {});
  const del = t.mock.method(verificationStorage, 'deletePrivate', async () => {});
  t.mock.method(VerificationRequest, 'create', async () => { throw Object.assign(new Error('dup'), { code: 11000 }); });
  await assert.rejects(() => verificationService.submitManual(userId, goodInput()), e => e.statusCode === 409);
  assert.equal(del.mock.callCount(), 1);
});

// ---------- review ----------
test('approve atomically claims a pending request and marks the user verified (manual)', async t => {
  let claimFilter; let userUpdate;
  t.mock.method(VerificationRequest, 'findOneAndUpdate', (f) => { claimFilter = f; return query({ _id: reqId, user_id: userId }); });
  t.mock.method(User, 'updateOne', async (f, u) => { userUpdate = { f, u }; });
  await verificationService.approve(reqId, adminId);
  assert.equal(claimFilter.status, 'pending');
  assert.equal(String(userUpdate.f._id), userId);
  assert.equal(userUpdate.u.$set['identityVerification.provider'], 'manual');
  assert.ok(userUpdate.u.$set['identityVerification.verifiedAt'] instanceof Date);
});

test('approve answers 409 if already reviewed and 404 if it does not exist', async t => {
  t.mock.method(VerificationRequest, 'findOneAndUpdate', () => query(null));
  t.mock.method(VerificationRequest, 'exists', async () => ({ _id: reqId }));
  await assert.rejects(() => verificationService.approve(reqId, adminId), e => e.statusCode === 409);
  t.mock.restoreAll();
  t.mock.method(VerificationRequest, 'findOneAndUpdate', () => query(null));
  t.mock.method(VerificationRequest, 'exists', async () => null);
  await assert.rejects(() => verificationService.approve(reqId, adminId), e => e.statusCode === 404);
});

test('approve puts the request back to pending if marking the user fails', async t => {
  const updates = [];
  t.mock.method(VerificationRequest, 'findOneAndUpdate', (f, u) => { updates.push(u); return query({ _id: reqId, user_id: userId }); });
  t.mock.method(VerificationRequest, 'updateOne', async (f, u) => { updates.push(u); });
  t.mock.method(User, 'updateOne', async () => { throw new Error('db down'); });
  await assert.rejects(() => verificationService.approve(reqId, adminId), /db down/);
  assert.equal(updates.at(-1).$set.status, 'pending');
});

test('reject needs a reason and records it', async t => {
  await assert.rejects(() => verificationService.reject(reqId, adminId, ' '), e => e.statusCode === 400);
  let update;
  t.mock.method(VerificationRequest, 'findOneAndUpdate', (f, u) => { update = u; return query({ _id: reqId }); });
  await verificationService.reject(reqId, adminId, 'Name does not match the ID');
  assert.equal(update.$set.status, 'rejected');
  assert.equal(update.$set.rejectionReason, 'Name does not match the ID');
});

test('admin detail returns a short-lived document link and never the raw storage key', async t => {
  t.mock.method(VerificationRequest, 'findById', () => query({
    _id: reqId, status: 'pending', legalName: 'Asha Rao', documentType: 'passport',
    documentKey: 'identity-documents/x/y.jpg', user_id: { _id: userId, name: 'Asha', email: 'a@x.io' },
  }));
  const url = t.mock.method(verificationStorage, 'getReadUrl', async () => 'https://signed.example/doc');
  const out = await verificationService.getRequest(reqId);
  assert.equal(out.documentUrl, 'https://signed.example/doc');
  assert.equal(url.mock.calls[0].arguments[1], 300);
  assert.equal(JSON.stringify(out).includes('identity-documents'), false);
});

test('admin list defaults to pending and returns a paged, mapped result', async t => {
  let filter;
  t.mock.method(VerificationRequest, 'find', f => { filter = f; return query([
    { _id: reqId, status: 'pending', legalName: 'Asha Rao', documentType: 'pan', user_id: { _id: userId, name: 'Asha', email: 'a@x.io' }, submittedAt: new Date() },
  ]); });
  const out = await verificationService.listRequests({});
  assert.equal(filter.status, 'pending');
  assert.equal(out.items[0].user.email, 'a@x.io');
  assert.equal(out.hasMore, false);
});
