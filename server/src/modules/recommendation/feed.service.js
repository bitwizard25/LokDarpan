import crypto from 'crypto';
import { REC } from './rec.config.js';
import {
  scoreVideo,
  isExcluded,
  relatedScore,
  rerank,
  reasonFor,
} from './scoring.js';
import { createRecCache } from './snapshot.cache.js';
import { candidatesRepository as defaultRepo } from './candidates.repository.js';
import { profileService as defaultProfileService } from './profile.service.js';
import { videoCard, readableVideo as defaultReadableVideo } from '../catalogue/catalogue.service.js';

export class FeedExpiredError extends Error {
  constructor(message = 'Feed expired') {
    super(message);
    this.name = 'FeedExpiredError';
    this.statusCode = 410;
    this.code = 'FEED_EXPIRED';
  }
}

export class FeedUnavailableError extends Error {
  constructor(message = 'Feed unavailable') {
    super(message);
    this.name = 'FeedUnavailableError';
    this.statusCode = 503;
    this.code = 'FEED_UNAVAILABLE';
  }
}

function makePrng(seedStr = '') {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash << 5) - hash + seedStr.charCodeAt(i);
    hash |= 0;
  }
  let s = (hash >>> 0) || 123456789;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

export function encodeCursor(snapshotId, offset) {
  return Buffer.from(`${snapshotId}:${offset}`).toString('base64url');
}

export function decodeCursor(cursor) {
  try {
    const raw = Buffer.from(cursor, 'base64url').toString('utf8');
    const [snapshotId, offsetStr] = raw.split(':');
    const offset = parseInt(offsetStr, 10);
    if (!snapshotId || Number.isNaN(offset) || offset < 0) {
      const err = new Error('Invalid cursor format');
      err.statusCode = 400;
      throw err;
    }
    return { snapshotId, offset };
  } catch (err) {
    if (err.statusCode) throw err;
    const e = new Error('Invalid cursor');
    e.statusCode = 400;
    throw e;
  }
}

export function createFeedService({
  repo = defaultRepo,
  profileService = defaultProfileService,
  cache = createRecCache(null),
  readableVideo = defaultReadableVideo,
  now = () => new Date(),
  randomFor = (id) => makePrng(id),
} = {}) {
  async function firstPage({
    viewerId = null,
    hints = [],
    languages = [],
    category = 'all',
    limit = REC.pageSize,
  } = {}) {
    const lim = Math.max(1, Math.min(REC.maxLimit || 24, limit || 12));
    const ctx = await profileService.loadViewerContext({ viewerId, hints, languages });

    const [followingPool, interestPool, trendingPool, freshPool, explorePool] =
      await Promise.all([
        repo.pool('following', ctx, { category }),
        repo.pool('interest', ctx, { category }),
        repo.pool('trending', ctx, { category }),
        repo.pool('fresh', ctx, { category }),
        repo.pool('explore', ctx, { category }),
      ]);

    const poolOrder = [
      { name: 'following', pool: followingPool },
      { name: 'interest', pool: interestPool },
      { name: 'trending', pool: trendingPool },
      { name: 'fresh', pool: freshPool },
    ];

    const sourceMap = new Map();
    const videoMap = new Map();

    for (const { name, pool } of poolOrder) {
      for (const v of pool || []) {
        const vid = String(v._id);
        if (!sourceMap.has(vid)) {
          sourceMap.set(vid, name);
          videoMap.set(vid, v);
        }
      }
    }

    const scoredList = [];
    const currentTime = now();

    for (const [vid, v] of videoMap.entries()) {
      if (isExcluded(v, ctx)) continue;
      const { score, topKey } = scoreVideo(v, ctx, currentTime);
      scoredList.push({
        video: v,
        score,
        source: sourceMap.get(vid),
        topKey,
      });
    }

    scoredList.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return String(b.video._id).localeCompare(String(a.video._id));
    });

    const snapshotId = crypto.randomUUID();
    const random = randomFor(snapshotId);
    const exploreSlots =
      ctx.discovery === 'high'
        ? REC.explore?.slots?.high || 3
        : ctx.discovery === 'low'
        ? REC.explore?.slots?.low || 1
        : REC.explore?.slots?.balanced || 2;

    const eligibleExplore = (explorePool || []).filter((v) => !isExcluded(v, ctx));

    const reranked = rerank(scoredList, eligibleExplore, {
      pageSize: lim,
      channelCap: REC.channelCapPerPage || 2,
      exploreSlots,
      random,
    });

    const snapshotEntries = reranked.slice(0, REC.snapshotSize || 200);
    let cacheSaved = false;
    if (cache?.setSnapshot) {
      try {
        await cache.setSnapshot(snapshotId, snapshotEntries);
        cacheSaved = true;
      } catch {
        cacheSaved = false;
      }
    }

    const pageEntries = snapshotEntries.slice(0, lim);
    const pageIds = pageEntries.map((e) => e.id);
    const docs = await repo.byIds(pageIds);
    const docMap = new Map(docs.map((d) => [String(d._id), d]));

    const items = [];
    for (const entry of pageEntries) {
      const doc = docMap.get(entry.id);
      if (doc) {
        const card = videoCard(doc);
        card.rec = {
          source: entry.source,
          reason: reasonFor(entry.source, entry.topKey, ctx),
        };
        items.push(card);
      }
    }

    const hasMore = cacheSaved && snapshotEntries.length > lim;
    const nextCursor = hasMore ? encodeCursor(snapshotId, lim) : null;

    return {
      requestId: snapshotId,
      items,
      nextCursor,
      hasMore,
      personalized: ctx.personalized,
    };
  }

  async function nextPage({ cursor, limit = REC.pageSize } = {}) {
    if (!cursor) {
      const err = new Error('Cursor required');
      err.statusCode = 400;
      throw err;
    }

    const { snapshotId, offset } = decodeCursor(cursor);
    const entries = await cache.getSnapshot(snapshotId);
    if (!entries) {
      throw new FeedExpiredError('Snapshot expired or not found');
    }

    const lim = Math.max(1, Math.min(REC.maxLimit || 24, limit || 12));
    const pageEntries = entries.slice(offset, offset + lim);
    const pageIds = pageEntries.map((e) => e.id);
    const docs = await repo.byIds(pageIds);
    const docMap = new Map(docs.map((d) => [String(d._id), d]));

    const items = [];
    for (const entry of pageEntries) {
      const doc = docMap.get(entry.id);
      if (doc) {
        const card = videoCard(doc);
        card.rec = {
          source: entry.source,
          reason: reasonFor(entry.source, entry.topKey, {}),
        };
        items.push(card);
      }
    }

    const nextOffset = offset + lim;
    const hasMore = nextOffset < entries.length;
    const nextCursor = hasMore ? encodeCursor(snapshotId, nextOffset) : null;

    return {
      requestId: snapshotId,
      items,
      nextCursor,
      hasMore,
      personalized: true,
    };
  }

  async function related({ viewerId = null, seedVideoId, limit = 12 } = {}) {
    const res = await readableVideo(seedVideoId, viewerId);
    const seed = res?.video || res;
    if (!seed) {
      const err = new Error('Video');
      err.statusCode = 404;
      throw err;
    }
    const lim = Math.max(1, Math.min(24, limit || 12));
    const ctx = await profileService.loadViewerContext({ viewerId });

    const candidates = await repo.relatedPools(seed);
    const scoredCandidates = [];
    const currentTime = now();

    for (const v of candidates || []) {
      if (isExcluded(v, ctx)) continue;
      if (String(v._id) === String(seed._id)) continue;
      const score = relatedScore(seed, v, ctx);
      scoredCandidates.push({ video: v, score });
    }

    scoredCandidates.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return String(b.video._id).localeCompare(String(a.video._id));
    });

    const ownerCounts = new Map();
    const relatedCap = REC.relatedChannelCap || 3;

    const candidateIds = [];
    for (const item of scoredCandidates) {
      const ownerId = String(item.video.user_id?._id || item.video.user_id);
      const count = ownerCounts.get(ownerId) || 0;
      if (count < relatedCap) {
        ownerCounts.set(ownerId, count + 1);
        candidateIds.push(String(item.video._id));
        if (candidateIds.length >= lim) break;
      }
    }

    const docs = await repo.byIds(candidateIds);
    const docMap = new Map(docs.map((d) => [String(d._id), d]));

    const items = [];
    for (const id of candidateIds) {
      const doc = docMap.get(id);
      if (doc) {
        const card = videoCard(doc);
        card.rec = {
          source: 'related',
          reason: { type: 'related', label: 'Related' },
        };
        items.push(card);
      }
    }

    const requestId = crypto.randomUUID();
    return {
      requestId,
      items,
      videos: items,
      hasMore: false,
      nextCursor: null,
    };
  }

  return {
    firstPage,
    nextPage,
    related,
  };
}

export const feedService = createFeedService();
export default feedService;
