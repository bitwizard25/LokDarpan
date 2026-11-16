/**
 * Recommendation system tunables.
 * Every recommendation number lives here; no magic constants elsewhere.
 */

export const REC = {
  policyVersion: 'v0.1',
  weights: { interest: 0.40, follow: 0.20, trending: 0.20, fresh: 0.15, quality: 0.05 },
  relatedWeights: { similarity: 0.50, sameChannel: 0.20, trending: 0.15, interest: 0.15 },
  freshTauDays: 14,
  inference: { windowDays: 30, decayTauDays: 14, cap: 0.6, maxEvents: 300, maxKeys: 30 },
  signal: { view: 0.10, play_end: 0.15, like: 0.25, save: 0.25, searchMultiplier: 1.5 },
  explicitWeight: { onboarding: 0.3, tune: 0.5, hint: 0.3, onboardingCap: 0.5 },
  pools: { interest: 200, following: 100, trending: 100, fresh: 100, explore: 50, interestKeys: 20, followingDays: 30 },
  pageSize: 12, maxLimit: 24, snapshotSize: 200, snapshotTtlSeconds: 1800, profileCacheSeconds: 300,
  channelCapPerPage: 2, relatedChannelCap: 3,
  explore: { slots: { low: 1, balanced: 2, high: 3 }, positions: [3, 8, 10], maxImpressions7d: 50, maxAgeDays: 14 },
  watched: { fraction: 0.8, penalty: 0.25, historyRows: 500 },
  languageMismatchPenalty: 0.5,
  stats: { windowDays: 7, everyMs: 900000, ctrPrior: { plays: 2, impressions: 20 }, watchPrior: { fraction: 0.3, plays: 5 } },
  events: { maxBatch: 50, maxHeartbeatSeconds: 15, ttlDays: 90, maxSkewMs: 300000, maxAgeMs: 86400000, ratePerMinute: 60 },
  view: { seconds: 30, fraction: 0.5 },
  impression: { visibleRatio: 0.5, dwellMs: 1000 },
  limits: { explicitKeys: 30, excludedKeys: 30, notInterested: 500, hints: 15, pickedVideos: 10 },
  languages: ['hi', 'mr', 'en'],
  formats: ['explainer', 'story', 'discussion', 'tutorial', 'performance', 'update', 'other'],
};

