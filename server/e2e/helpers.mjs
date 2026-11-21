/**
 * Tiny HTTP + S3 helpers for the end-to-end scenarios. Talks to the real backend over HTTP.
 */
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { S3Client, CreateBucketCommand, PutBucketPolicyCommand } from '@aws-sdk/client-s3';

export const API = process.env.E2E_API || 'http://localhost:5100/api/v1';
export const S3_HOST = 'localhost';
export const S3_PORT = 9100;
export const BUCKET = 'lokdarpan-e2e';
const here = path.dirname(fileURLToPath(import.meta.url));

export const sleep = ms => new Promise(r => setTimeout(r, ms));

/** JSON / multipart request. Returns { status, data, headers }. */
export async function api(route, { method = 'GET', token, json, form, headers } = {}) {
  const h = { ...headers };
  if (token) h.Authorization = `Bearer ${token}`;
  let body;
  if (json !== undefined) { h['Content-Type'] = 'application/json'; body = JSON.stringify(json); }
  else if (form) body = form;
  const res = await fetch(API + route, { method, headers: h, body });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data, headers: res.headers };
}

/** Poll until fn() returns a truthy value, or fail with a useful message. */
export async function eventually(fn, { timeoutMs = 120000, intervalMs = 2000, what = 'condition' } = {}) {
  const start = Date.now();
  let last;
  while (Date.now() - start < timeoutMs) {
    last = await fn();
    if (last) return last;
    await sleep(intervalMs);
  }
  throw new Error(`Timed out after ${timeoutMs}ms waiting for ${what}`);
}

export async function waitForApi() {
  return eventually(async () => {
    try {
      const res = await fetch(API.replace(/\/api\/v1$/, '') + '/health');
      const res2 = res.ok ? res : await fetch(API + '/health');
      return res2.ok;
    } catch { return false; }
  }, { timeoutMs: 90000, intervalMs: 1500, what: 'the API to answer /health' });
}

/** Presigned URLs are signed for the in-network host (s3:9000); reach them on the published port. */
function s3Request(method, urlString, { body, contentType } = {}) {
  const u = new URL(urlString);
  return new Promise((resolve, reject) => {
    const headers = { Host: u.host };
    if (body) { headers['Content-Length'] = body.length; if (contentType) headers['Content-Type'] = contentType; }
    const req = http.request({ host: S3_HOST, port: S3_PORT, path: u.pathname + u.search, method, headers }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks), type: res.headers['content-type'] }));
    });
    req.on('error', reject);
    req.end(body);
  });
}
export const putPresigned = (url, buffer, contentType) => s3Request('PUT', url, { body: buffer, contentType });
export const getPresigned = url => s3Request('GET', url);

/** Anonymous GET against the S3 store by bucket path, e.g. 'identity-documents/...'. */
export async function anonymousGet(key) {
  return new Promise((resolve, reject) => {
    http.get({ host: S3_HOST, port: S3_PORT, path: `/${BUCKET}/${key}` }, res => {
      res.resume(); res.on('end', () => resolve(res.statusCode));
    }).on('error', reject);
  });
}

export async function setupBucket() {
  const s3 = new S3Client({
    region: 'us-east-1', endpoint: `http://${S3_HOST}:${S3_PORT}`, forcePathStyle: true,
    credentials: { accessKeyId: 'e2eaccesskey', secretAccessKey: 'e2esecretkey123' },
  });
  await eventually(async () => {
    try { await s3.send(new CreateBucketCommand({ Bucket: BUCKET })); return true; }
    catch (e) { return ['BucketAlreadyOwnedByYou', 'BucketAlreadyExists'].includes(e.name) ? true : false; }
  }, { timeoutMs: 60000, intervalMs: 1500, what: 'the S3 store to accept CreateBucket' });
  // Public read ONLY for what the player/site serves. raw-uploads/ and identity-documents/ stay private.
  const publicPrefixes = ['videos', 'thumbnails', 'logos', 'uploads'];
  await s3.send(new PutBucketPolicyCommand({
    Bucket: BUCKET,
    Policy: JSON.stringify({
      Version: '2012-10-17',
      Statement: [{
        Effect: 'Allow', Principal: '*', Action: ['s3:GetObject'],
        Resource: publicPrefixes.map(p => `arn:aws:s3:::${BUCKET}/${p}/*`),
      }],
    }),
  }));
}

// 1x1 PNG, a real image for logos / thumbnails.
export const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
// Minimal bytes that pass the JPEG signature check used for ID photos.
export const JPEG_STUB = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from('LOKDARPAN-E2E-ID-PHOTO')]);

export const loadSampleVideo = () => readFile(path.join(here, 'fixtures', 'sample.mp4'));

export function blobForm(fields, files = {}) {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) if (v !== undefined) form.append(k, v);
  for (const [k, { buffer, type, name }] of Object.entries(files)) form.append(k, new Blob([buffer], { type }), name);
  return form;
}

let counter = 0;
export const uniqueEmail = label => `${label}-${Date.now()}-${counter++}@e2e.test`;

export async function signupAndLogin({ name, email, phone = '9876543210', password = 'Passw0rd!x' }) {
  const s = await api('/auth/signup', { method: 'POST', json: { name, email, phone, password } });
  if (s.status !== 201) throw new Error(`signup failed ${s.status}: ${JSON.stringify(s.data)}`);
  const l = await api('/auth/login', { method: 'POST', json: { email, password } });
  if (l.status !== 200) throw new Error(`login failed ${l.status}: ${JSON.stringify(l.data)}`);
  return { token: l.data.token, user: l.data.user, email, password };
}

/** Run a command inside the backend container (e.g. redis-cli, supervisorctl). */
export function inBackend(...cmd) {
  const compose = path.join(here, 'docker-compose.e2e.yml');
  return new Promise((resolve, reject) => {
    execFile('docker', ['compose', '-f', compose, 'exec', '-T', 'backend', ...cmd], { env: { ...process.env, MSYS_NO_PATHCONV: '1' } },
      (err, stdout, stderr) => err ? reject(new Error(`${cmd.join(' ')} failed: ${stderr || err.message}`)) : resolve(stdout.trim()));
  });
}

export function backendLogs() {
  const compose = path.join(here, 'docker-compose.e2e.yml');
  return new Promise((resolve, reject) => {
    execFile('docker', ['compose', '-f', compose, 'logs', 'backend', '--no-color'], { maxBuffer: 64 * 1024 * 1024 },
      (err, stdout) => err ? reject(err) : resolve(stdout));
  });
}
