import { REC } from './rec.config.js';
import { keyLabel } from './features.js';

export function inferWeights(events = [], featuresByVideo = new Map(), now = new Date()) {
  const signalMap = REC.signal;
  const windowDays = REC.inference.windowDays; // 30
  const decayTauDays = REC.inference.decayTauDays; // 14
  const cap = REC.inference.cap; // 0.6
  const maxKeys = REC.inference.maxKeys; // 30
  const searchMult = signalMap.searchMultiplier || 1.5;

  const keySignals = new Map();

  for (const e of events) {
    const baseSignal = signalMap[e.type];
    if (!baseSignal) continue;

    const eventDate = e.createdAt ? new Date(e.createdAt) : now;
    const ageDays = (now.getTime() - eventDate.getTime()) / (24 * 60 * 60 * 1000);
    if (ageDays < 0 || ageDays > windowDays) continue;

    const mult = e.surface === 'search' ? searchMult : 1.0;
    const decay = Math.exp(-ageDays / decayTauDays);
    const s_e = baseSignal * mult * decay;

    const videoId = String(e.video);
    const features = featuresByVideo.get(videoId) || [];
    for (const key of features) {
      if (!keySignals.has(key)) keySignals.set(key, []);
      keySignals.get(key).push(s_e);
    }
  }

  const scoredKeys = [];
  for (const [key, signals] of keySignals.entries()) {
    let complementProduct = 1.0;
    for (const s of signals) {
      complementProduct *= Math.max(0, 1.0 - s);
    }
    const combined = Math.min(cap, 1.0 - complementProduct);
    if (combined > 0) {
      scoredKeys.push({ key, weight: combined });
    }
  }

  scoredKeys.sort((a, b) => b.weight - a.weight);
  const topKeys = scoredKeys.slice(0, maxKeys);

  const resultMap = new Map();
  for (const item of topKeys) {
    resultMap.set(item.key, item.weight);
  }

  return resultMap;
}

export function interestScore(features = [], weights = new Map()) {
  let complementProduct = 1.0;
  for (const feat of features) {
    const entry = weights.get(feat);
    const w = typeof entry === 'number' ? entry : entry?.w || 0;
    if (w > 0) {
      complementProduct *= Math.max(0, 1.0 - w);
    }
  }
  return 1.0 - complementProduct;
}

export function isExcluded(video, ctx = {}) {
  const vid = String(video._id);
  const ownerId = String(video.user_id?._id || video.user_id);

  if (ctx.notInterested?.has(vid)) return true;
  if (ctx.hiddenCreators?.has(ownerId)) return true;
  if (ctx.viewerId && String(ctx.viewerId) === ownerId) return true;

  if (ctx.excluded && video.features) {
    for (const feat of video.features) {
      if (ctx.excluded.has(feat)) return true;
    }
  }

  return false;
}

export function scoreVideo(video, ctx = {}, now = new Date()) {
  const weightsCfg = REC.weights;
  const features = video.features || [];

  // Interest component and topKey
  let complementProduct = 1.0;
  let topKey = null;
  let maxKeyWeight = -1;

  if (ctx.weights && ctx.weights.size > 0) {
    for (const feat of features) {
      const entry = ctx.weights.get(feat);
      const w = typeof entry === 'number' ? entry : entry?.w || 0;
      if (w > 0) {
        complementProduct *= Math.max(0, 1.0 - w);
        if (w > maxKeyWeight) {
          maxKeyWeight = w;
          topKey = feat;
        }
      }
    }
  }
  const interestComp = 1.0 - complementProduct;

  // Follow component
  const ownerId = String(video.user_id?._id || video.user_id);
  const followComp = ctx.subscribedOwners?.has(ownerId) ? 1.0 : 0.0;

  // Trending component
  const trendingComp = video.stats?.trending || 0.0;

  // Fresh component
  const pubDate = video.publishedAt
    ? new Date(video.publishedAt)
    : video.createdAt
    ? new Date(video.createdAt)
    : now;
  const ageDays = Math.max(0, (now.getTime() - pubDate.getTime()) / (24 * 60 * 60 * 1000));
  const freshTau = REC.freshTauDays || 14;
  const freshComp = Math.exp(-ageDays / freshTau);

  // Quality component
  const likes = typeof video.likes === 'number' ? video.likes : 0;
  const dislikes = typeof video.dislikes === 'number' ? video.dislikes : 0;
  const qualityComp = (likes + 1) / (likes + dislikes + 2);

  // Raw combined score
  let score =
    weightsCfg.interest * interestComp +
    weightsCfg.follow * followComp +
    weightsCfg.trending * trendingComp +
    weightsCfg.fresh * freshComp +
    weightsCfg.quality * qualityComp;

  // Multiplier: Watched
  const vid = String(video._id);
  if (ctx.watched?.has(vid)) {
    const pos = ctx.watched.get(vid);
    const duration = video.durationSeconds || video.duration;
    if (
      typeof duration === 'number' &&
      duration > 0 &&
      pos >= (REC.watched.fraction || 0.8) * duration
    ) {
      score *= REC.watched.penalty || 0.25;
    }
  }

  // Multiplier: Language mismatch
  if (ctx.languages && ctx.languages.length > 0) {
    const lang = video.language || 'und';
    if (lang !== 'und' && !ctx.languages.includes(lang)) {
      score *= REC.languageMismatchPenalty || 0.5;
    }
  }

  return {
    score,
    components: {
      interest: interestComp,
      follow: followComp,
      trending: trendingComp,
      fresh: freshComp,
      quality: qualityComp,
    },
    topKey,
  };
}

export function jaccard(a = [], b = []) {
  const setA = new Set(a);
  const setB = new Set(b);
  if (setA.size === 0 && setB.size === 0) return 0;

  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

export function relatedScore(seed, video, ctx = {}) {
  const cfg = REC.relatedWeights;
  const similarity = jaccard(seed.features || [], video.features || []);
  const seedOwner = String(seed.user_id?._id || seed.user_id);
  const videoOwner = String(video.user_id?._id || video.user_id);
  const sameChannel = seedOwner === videoOwner ? 1.0 : 0.0;
  const trending = video.stats?.trending || 0.0;
  const interest = interestScore(video.features || [], ctx.weights || new Map());

  return (
    cfg.similarity * similarity +
    cfg.sameChannel * sameChannel +
    cfg.trending * trending +
    cfg.interest * interest
  );
}

export function rerank(
  ranked = [],
  explorePool = [],
  {
    pageSize = REC.pageSize || 12,
    channelCap = REC.channelCapPerPage || 2,
    exploreSlots = 2,
    random = Math.random,
  } = {}
) {
  const slotIndices =
    exploreSlots === 1
      ? [3]
      : exploreSlots === 3
      ? [3, 8, 10]
      : exploreSlots === 2
      ? [3, 8]
      : [];

  const unusedExplore = [...explorePool];
  const remainingRanked = [...ranked];
  const results = [];

  while (remainingRanked.length > 0 || unusedExplore.length > 0) {
    const pageItems = [];
    const channelCounts = new Map();

    for (let slot = 0; slot < pageSize; slot++) {
      if (slotIndices.includes(slot) && unusedExplore.length > 0) {
        const randIdx = Math.floor(random() * unusedExplore.length);
        const [expVideo] = unusedExplore.splice(randIdx, 1);
        const ownerId = String(expVideo.user_id?._id || expVideo.user_id);
        const count = channelCounts.get(ownerId) || 0;
        if (count < channelCap) {
          channelCounts.set(ownerId, count + 1);
          pageItems.push({
            id: String(expVideo._id),
            source: 'explore',
            topKey: expVideo.topKey || null,
          });
          continue;
        } else {
          unusedExplore.push(expVideo);
        }
      }

      let picked = false;
      for (let i = 0; i < remainingRanked.length; i++) {
        const item = remainingRanked[i];
        const v = item.video || item;
        const ownerId = String(v.user_id?._id || v.user_id);
        const count = channelCounts.get(ownerId) || 0;
        if (count < channelCap) {
          channelCounts.set(ownerId, count + 1);
          remainingRanked.splice(i, 1);
          pageItems.push({
            id: String(v._id),
            source: item.source || 'interest',
            topKey: item.topKey || null,
          });
          picked = true;
          break;
        }
      }

      if (!picked) {
        break;
      }
    }

    if (pageItems.length === 0) {
      if (remainingRanked.length > 0) {
        const item = remainingRanked.shift();
        const v = item.video || item;
        pageItems.push({
          id: String(v._id),
          source: item.source || 'interest',
          topKey: item.topKey || null,
        });
      } else if (unusedExplore.length > 0) {
        const expVideo = unusedExplore.shift();
        pageItems.push({
          id: String(expVideo._id),
          source: 'explore',
          topKey: expVideo.topKey || null,
        });
      } else {
        break;
      }
    }

    results.push(...pageItems);
  }

  return results;
}

export function reasonFor(source, topKey, ctx = {}) {
  switch (source) {
    case 'following':
      return { type: 'following', label: 'From a channel you follow' };
    case 'trending':
      return { type: 'trending', label: 'Trending' };
    case 'fresh':
      return { type: 'fresh', label: 'New' };
    case 'explore':
      return { type: 'explore', label: 'Something different' };
    case 'interest': {
      if (!topKey) return { type: 'inferred', label: 'Recommended' };
      const entry = ctx.weights?.get(topKey);
      const isExplicit =
        entry && typeof entry === 'object' && entry.explicit >= (entry.inferred || 0);
      return {
        type: isExplicit ? 'explicit' : 'inferred',
        label: keyLabel(topKey),
      };
    }
    case 'related':
      return { type: 'related', label: 'Related' };
    default:
      return { type: 'trending', label: 'Trending' };
  }
}
