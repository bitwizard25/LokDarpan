import mongoose from 'mongoose';
import { REC } from './rec.config.js';
import { isValidKey, keyLabel } from './features.js';
import { mapAnswers } from './onboarding.v1.js';
import { inferWeights } from './scoring.js';
import RecProfile from './rec-profile.model.js';
import RecEvent from './rec-event.model.js';
import Video from '../video/schemas/video.schema.js';
import User from '../auth/schemas/user.schema.js';
import { WatchHistory } from '../library/library.models.js';
import { createRecCache } from './snapshot.cache.js';

export function createProfileService({
  profiles = RecProfile,
  events = RecEvent,
  videos = Video,
  users = User,
  watchHistory = WatchHistory,
  cache = createRecCache(null),
  eventsService = null,
  now = () => new Date(),
} = {}) {
  async function isPersonalized(userId) {
    if (!userId) return false;
    const profile = await profiles.findOne({ user: userId });
    return Boolean(profile?.personalizationEnabled);
  }

  async function getPreferences(userId) {
    const profile = (await profiles.findOne({ user: userId })) || {
      personalizationEnabled: false,
      languages: [],
      discovery: 'balanced',
      explicit: [],
      excluded: [],
      hiddenCreators: [],
      notInterested: [],
      onboarding: { version: 'v1', completed: false },
    };

    // Calculate inferred keys for view
    const windowDays = REC.inference.windowDays || 30;
    const since = new Date(now().getTime() - windowDays * 24 * 60 * 60 * 1000);
    let inferredList = [];

    if (profile.personalizationEnabled && events?.find) {
      const userEvents = await events
        .find({ user: userId, createdAt: { $gte: since } })
        .lean();
      if (userEvents && userEvents.length > 0) {
        const videoIds = [...new Set(userEvents.map((e) => String(e.video)))];
        const videoDocs = await videos.find({ _id: { $in: videoIds } }).lean();
        const featuresMap = new Map(
          videoDocs.map((v) => [String(v._id), v.features || []])
        );
        const inferredWeightsMap = inferWeights(userEvents, featuresMap, now());
        inferredList = Array.from(inferredWeightsMap.keys());
      }
    }

    return {
      personalizationEnabled: Boolean(profile.personalizationEnabled),
      languages: profile.languages || [],
      discovery: profile.discovery || 'balanced',
      explicit: (profile.explicit || []).map((e) => ({
        key: e.key,
        label: keyLabel(e.key),
        source: e.source,
      })),
      excluded: (profile.excluded || []).map((e) => ({
        key: e.key,
        label: keyLabel(e.key),
      })),
      inferred: inferredList.slice(0, 10).map((k) => ({
        key: k,
        label: keyLabel(k),
      })),
      onboarding: {
        version: profile.onboarding?.version || 'v1',
        completed: Boolean(profile.onboarding?.completed),
      },
      hiddenChannelCount: (profile.hiddenCreators || []).length,
      notInterestedCount: (profile.notInterested || []).length,
    };
  }

  async function updatePreferences(userId, update = {}) {
    const existing = (await profiles.findOne({ user: userId })) || {
      user: userId,
      personalizationEnabled: false,
      languages: [],
      discovery: 'balanced',
      explicit: [],
      excluded: [],
      hiddenCreators: [],
      notInterested: [],
      onboarding: { version: 'v1', completed: false },
    };

    const updateSet = {};

    if (typeof update.personalizationEnabled === 'boolean') {
      updateSet.personalizationEnabled = update.personalizationEnabled;
      if (!update.personalizationEnabled) {
        await events.updateMany({ user: userId }, { $set: { user: null } });
      }
    }

    if (update.discovery) {
      if (!['low', 'balanced', 'high'].includes(update.discovery)) {
        const err = new Error('Invalid discovery value');
        err.statusCode = 400;
        throw err;
      }
      updateSet.discovery = update.discovery;
    }

    if (update.languages) {
      const validLangs = update.languages.filter((l) => REC.languages.includes(l));
      updateSet.languages = validLangs;
    }

    // Excluded keys
    let excludedKeys = (existing.excluded || []).map((e) => e.key);
    if (update.excludedKeys) {
      const valid = update.excludedKeys.filter(isValidKey);
      excludedKeys = [...new Set(valid)].slice(0, REC.limits.excludedKeys);
      updateSet.excluded = excludedKeys.map((key) => ({ key }));
    }

    // Explicit keys
    let explicitEntries = existing.explicit || [];
    if (update.onboarding) {
      const mapped = mapAnswers(update.onboarding);
      if (mapped.discovery) updateSet.discovery = mapped.discovery;
      if (mapped.languages?.length) updateSet.languages = mapped.languages;

      explicitEntries = explicitEntries.filter((e) => e.source !== 'onboarding');
      for (const k of mapped.keys) {
        explicitEntries.push({ key: k.key, weight: k.weight, source: 'onboarding' });
      }

      updateSet.onboarding = {
        version: 'v1',
        completed: true,
        completedAt: now(),
        answers: update.onboarding.answers,
        pickedVideoIds: update.onboarding.pickedVideoIds,
      };
    }

    if (update.explicitKeys) {
      const valid = update.explicitKeys.filter(isValidKey);
      explicitEntries = explicitEntries.filter((e) => e.source !== 'tune');
      for (const k of valid) {
        explicitEntries.push({
          key: k,
          weight: REC.explicitWeight.tune || 0.5,
          source: 'tune',
        });
      }
    }

    // Rule: if a key is in both explicit and excluded, keep only in excluded
    const excludedSet = new Set(excludedKeys);
    explicitEntries = explicitEntries.filter((e) => !excludedSet.has(e.key));
    explicitEntries = explicitEntries.slice(0, REC.limits.explicitKeys);
    updateSet.explicit = explicitEntries;

    await profiles.findOneAndUpdate(
      { user: userId },
      { $set: updateSet },
      { upsert: true, new: true }
    );

    await cache.dropProfile(userId);
    return getPreferences(userId);
  }

  async function resetPreferences(userId, scope = 'all') {
    if (scope === 'inferred' || scope === 'all') {
      await events.updateMany({ user: userId }, { $set: { user: null } });
    }

    if (scope === 'explicit' || scope === 'all') {
      await profiles.findOneAndUpdate(
        { user: userId },
        {
          $set: {
            explicit: [],
            excluded: [],
            languages: [],
            hiddenCreators: [],
            notInterested: [],
            onboarding: { version: 'v1', completed: false },
          },
        }
      );
    }

    await cache.dropProfile(userId);
    return { message: 'Preferences reset successfully' };
  }

  async function setFeedback(userId, videoId, { action, active = true } = {}) {
    const video = await videos.findById(videoId);
    if (!video) {
      const err = new Error('Video not found');
      err.statusCode = 404;
      throw err;
    }

    const ownerId = video.user_id?._id || video.user_id;

    if (action === 'hide_channel') {
      if (active) {
        await profiles.findOneAndUpdate(
          { user: userId },
          { $addToSet: { hiddenCreators: ownerId } },
          { upsert: true }
        );
      } else {
        await profiles.findOneAndUpdate(
          { user: userId },
          { $pull: { hiddenCreators: ownerId } }
        );
      }
    } else if (action === 'not_interested') {
      if (active) {
        await profiles.findOneAndUpdate(
          { user: userId },
          {
            $push: {
              notInterested: {
                $each: [videoId],
                $slice: -REC.limits.notInterested,
              },
            },
          },
          { upsert: true }
        );
        if (eventsService?.recordAction) {
          await eventsService.recordAction({
            userId,
            type: 'not_interested',
            videoId,
          });
        }
      } else {
        await profiles.findOneAndUpdate(
          { user: userId },
          { $pull: { notInterested: videoId } }
        );
      }
    } else {
      const err = new Error('Invalid feedback action');
      err.statusCode = 400;
      throw err;
    }

    await cache.dropProfile(userId);
    return { action, active };
  }

  async function loadViewerContext({ viewerId, hints = [], languages = [] } = {}) {
    // Guest context
    if (!viewerId) {
      const weights = new Map();
      const validHints = (hints || []).filter(isValidKey).slice(0, REC.limits.hints);
      for (const h of validHints) {
        weights.set(h, {
          w: REC.explicitWeight.hint || 0.3,
          explicit: REC.explicitWeight.hint || 0.3,
          inferred: 0,
        });
      }

      return {
        viewerId: null,
        personalized: false,
        weights,
        excluded: new Set(),
        hiddenCreators: new Set(),
        notInterested: new Set(),
        languages: (languages || []).filter((l) => REC.languages.includes(l)),
        discovery: 'balanced',
        subscribedOwners: new Set(),
        watched: new Map(),
      };
    }

    // Check Redis cache first
    const cached = await cache.getProfile(viewerId);
    if (cached) {
      return {
        ...cached,
        weights: new Map(cached.weights || []),
        excluded: new Set(cached.excluded || []),
        hiddenCreators: new Set(cached.hiddenCreators || []),
        notInterested: new Set(cached.notInterested || []),
        subscribedOwners: new Set(cached.subscribedOwners || []),
        watched: new Map(cached.watched || []),
      };
    }

    const profile = await profiles.findOne({ user: viewerId });
    if (!profile || !profile.personalizationEnabled) {
      return {
        viewerId,
        personalized: false,
        weights: new Map(),
        excluded: new Set(),
        hiddenCreators: new Set(),
        notInterested: new Set(),
        languages: [],
        discovery: 'balanced',
        subscribedOwners: new Set(),
        watched: new Map(),
      };
    }

    // Inferred weights from past 30 days of events
    const windowDays = REC.inference.windowDays || 30;
    const since = new Date(now().getTime() - windowDays * 24 * 60 * 60 * 1000);
    const userEvents = events?.find
      ? await events.find({ user: viewerId, createdAt: { $gte: since } }).lean()
      : [];

    let inferredWeights = new Map();
    if (userEvents && userEvents.length > 0) {
      const videoIds = [...new Set(userEvents.map((e) => String(e.video)))];
      const videoDocs = await videos.find({ _id: { $in: videoIds } }).lean();
      const featuresMap = new Map(
        videoDocs.map((v) => [String(v._id), v.features || []])
      );
      inferredWeights = inferWeights(userEvents, featuresMap, now());
    }

    // Assemble weights: Map<string, { w, explicit, inferred }>
    const weights = new Map();
    for (const exp of profile.explicit || []) {
      weights.set(exp.key, {
        w: exp.weight,
        explicit: exp.weight,
        inferred: 0,
      });
    }

    for (const [key, infW] of inferredWeights.entries()) {
      if (weights.has(key)) {
        const current = weights.get(key);
        current.inferred = infW;
        current.w = Math.min(1.0, current.explicit + infW);
      } else {
        weights.set(key, {
          w: infW,
          explicit: 0,
          inferred: infW,
        });
      }
    }

    // Excluded set overrides weights
    const excluded = new Set((profile.excluded || []).map((e) => e.key));
    for (const exKey of excluded) {
      weights.delete(exKey);
    }

    const hiddenCreators = new Set(
      (profile.hiddenCreators || []).map((c) => String(c))
    );
    const notInterested = new Set(
      (profile.notInterested || []).map((v) => String(v))
    );

    // Subscribed creators
    let subscribedOwners = new Set();
    if (users?.findById) {
      const userDoc = await users.findById(viewerId).select('subscribedChannels').lean();
      if (userDoc?.subscribedChannels) {
        subscribedOwners = new Set(userDoc.subscribedChannels.map((c) => String(c)));
      }
    }

    // Watch history: last 500 rows
    const watched = new Map();
    if (watchHistory?.find) {
      try {
        const historyRows = await watchHistory
          .find({ user: viewerId })
          .sort({ updatedAt: -1 })
          .limit(REC.watched.historyRows || 500)
          .lean();
        if (historyRows) {
          for (const row of historyRows) {
            watched.set(String(row.video), row.positionSeconds || 0);
          }
        }
      } catch {
        // Tolerant to invalid ID or DB error
      }
    }

    const context = {
      viewerId: String(viewerId),
      personalized: true,
      weights,
      excluded,
      hiddenCreators,
      notInterested,
      languages: profile.languages || [],
      discovery: profile.discovery || 'balanced',
      subscribedOwners,
      watched,
    };

    // Cache serializable version
    await cache.setProfile(viewerId, {
      ...context,
      weights: Array.from(weights.entries()),
      excluded: Array.from(excluded),
      hiddenCreators: Array.from(hiddenCreators),
      notInterested: Array.from(notInterested),
      subscribedOwners: Array.from(subscribedOwners),
      watched: Array.from(watched.entries()),
    });

    return context;
  }

  async function deleteForUser(userId) {
    try {
      if (mongoose?.connection?.readyState === 0 && profiles === RecProfile) {
        return;
      }
      await profiles.deleteOne({ user: userId });
      await events.updateMany({ user: userId }, { $set: { user: null } });
      await cache.dropProfile(userId);
    } catch (err) {
      console.warn('[profileService] deleteForUser error:', err.message);
    }
  }

  return {
    isPersonalized,
    getPreferences,
    updatePreferences,
    resetPreferences,
    setFeedback,
    loadViewerContext,
    deleteForUser,
  };
}

export const profileService = createProfileService();
export default profileService;
