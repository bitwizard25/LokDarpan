import mongoose from 'mongoose';
import Video from '../video/schemas/video.schema.js';
import { publicFilter, cardFields, populateAuthor } from '../catalogue/catalogue.service.js';
import { REC } from './rec.config.js';
import { slugifyTag } from './features.js';

export const scoredFields =
  '_id user_id features language likes dislikes publishedAt durationSeconds stats.trending createdAt';

export function createCandidatesRepository({ videoModel = Video } = {}) {
  async function pool(name, ctx = {}, { category, type = { $ne: 'short' } } = {}) {
    if (videoModel === Video && mongoose?.connection?.readyState === 0) {
      return [];
    }

    const baseFilter = {
      ...publicFilter,
      ...(type ? { type } : {}),
    };

    if (category && category !== 'all') {
      const slug = slugifyTag(category);
      baseFilter.features = `cat:${slug}`;
    }

    const now = new Date();

    if (name === 'following') {
      if (!ctx.subscribedOwners || ctx.subscribedOwners.size === 0) return [];
      const since30d = new Date(now.getTime() - (REC.pools.followingDays || 30) * 86400000);
      return videoModel
        .find({
          ...baseFilter,
          user_id: { $in: Array.from(ctx.subscribedOwners) },
          publishedAt: { $gte: since30d },
        })
        .select(scoredFields)
        .sort({ publishedAt: -1, _id: -1 })
        .limit(REC.pools.following || 100)
        .maxTimeMS(4000)
        .lean();
    }

    if (name === 'interest') {
      if (!ctx.weights || ctx.weights.size === 0) return [];
      const sortedKeys = Array.from(ctx.weights.entries())
        .sort((a, b) => (b[1]?.w || b[1] || 0) - (a[1]?.w || a[1] || 0))
        .map(([k]) => k)
        .slice(0, REC.pools.interestKeys || 20);

      if (sortedKeys.length === 0) return [];
      return videoModel
        .find({
          ...baseFilter,
          features: { $in: sortedKeys },
        })
        .select(scoredFields)
        .sort({ publishedAt: -1, _id: -1 })
        .limit(REC.pools.interest || 200)
        .maxTimeMS(4000)
        .lean();
    }

    if (name === 'trending') {
      return videoModel
        .find({
          ...baseFilter,
          'stats.trending': { $gt: 0 },
        })
        .select(scoredFields)
        .sort({ 'stats.trending': -1, publishedAt: -1, _id: -1 })
        .limit(REC.pools.trending || 100)
        .maxTimeMS(4000)
        .lean();
    }

    if (name === 'fresh') {
      return videoModel
        .find(baseFilter)
        .select(scoredFields)
        .sort({ publishedAt: -1, _id: -1 })
        .limit(REC.pools.fresh || 100)
        .maxTimeMS(4000)
        .lean();
    }

    if (name === 'explore') {
      const since14d = new Date(
        now.getTime() - (REC.explore.maxAgeDays || 14) * 86400000
      );
      return videoModel
        .find({
          ...baseFilter,
          publishedAt: { $gte: since14d },
          'stats.impressions7d': { $lt: REC.explore.maxImpressions7d || 50 },
        })
        .select(scoredFields)
        .sort({ publishedAt: -1, _id: -1 })
        .limit(REC.pools.explore || 50)
        .maxTimeMS(4000)
        .lean();
    }

    return [];
  }

  async function byIds(ids = []) {
    if (!ids || ids.length === 0) return [];
    if (videoModel === Video && mongoose?.connection?.readyState === 0) {
      return [];
    }

    const docs = await videoModel
      .find({
        _id: { $in: ids },
        ...publicFilter,
      })
      .select(cardFields)
      .populate(populateAuthor)
      .maxTimeMS(4000)
      .lean();

    const docMap = new Map(docs.map((d) => [String(d._id), d]));
    return ids.map((id) => docMap.get(String(id))).filter(Boolean);
  }

  async function relatedPools(seed = {}) {
    if (videoModel === Video && mongoose?.connection?.readyState === 0) {
      return [];
    }

    const seedId = seed._id ? String(seed._id) : null;
    const seedType = seed.type === 'short' ? 'short' : { $ne: 'short' };
    const baseFilter = {
      ...publicFilter,
      type: seedType,
      ...(seedId ? { _id: { $ne: seedId } } : {}),
    };

    const queries = [];

    // Pool 1: features
    if (seed.features && seed.features.length > 0) {
      queries.push(
        videoModel
          .find({
            ...baseFilter,
            features: { $in: seed.features },
          })
          .select(scoredFields)
          .limit(200)
          .maxTimeMS(4000)
          .lean()
      );
    } else {
      queries.push(Promise.resolve([]));
    }

    // Pool 2: same owner
    const ownerId = seed.user_id?._id || seed.user_id;
    if (ownerId) {
      queries.push(
        videoModel
          .find({
            ...baseFilter,
            user_id: ownerId,
          })
          .select(scoredFields)
          .limit(20)
          .maxTimeMS(4000)
          .lean()
      );
    } else {
      queries.push(Promise.resolve([]));
    }

    // Pool 3: trending
    queries.push(
      videoModel
        .find({
          ...baseFilter,
          'stats.trending': { $gt: 0 },
        })
        .select(scoredFields)
        .sort({ 'stats.trending': -1 })
        .limit(50)
        .maxTimeMS(4000)
        .lean()
    );

    const [byFeature, byOwner, byTrending] = await Promise.all(queries);
    const seen = new Set();
    const union = [];
    for (const list of [byFeature, byOwner, byTrending]) {
      for (const item of list) {
        const id = String(item._id);
        if (!seen.has(id)) {
          seen.add(id);
          union.push(item);
        }
      }
    }
    return union;
  }

  return {
    pool,
    byIds,
    relatedPools,
  };
}

export const candidatesRepository = createCandidatesRepository();
export default candidatesRepository;
