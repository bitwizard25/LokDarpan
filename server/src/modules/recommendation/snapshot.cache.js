import { REC } from './rec.config.js';

export function createRecCache(redis) {
  return {
    async getSnapshot(id) {
      if (!redis) return null;
      try {
        const raw = await redis.get(`rec:snap:${id}`);
        if (!raw) return null;
        return JSON.parse(raw);
      } catch {
        return null;
      }
    },

    async setSnapshot(id, entries) {
      if (!redis) return;
      try {
        await redis.set(
          `rec:snap:${id}`,
          JSON.stringify(entries),
          'EX',
          REC.snapshotTtlSeconds || 1800
        );
      } catch {
        // Tolerant failure
      }
    },

    async getProfile(userId) {
      if (!redis) return null;
      try {
        const raw = await redis.get(`rec:profile:${userId}`);
        if (!raw) return null;
        return JSON.parse(raw);
      } catch {
        return null;
      }
    },

    async setProfile(userId, value) {
      if (!redis) return;
      try {
        await redis.set(
          `rec:profile:${userId}`,
          JSON.stringify(value),
          'EX',
          REC.profileCacheSeconds || 300
        );
      } catch {
        // Tolerant failure
      }
    },

    async dropProfile(userId) {
      if (!redis) return;
      try {
        await redis.del(`rec:profile:${userId}`);
      } catch {
        // Tolerant failure
      }
    },
  };
}
