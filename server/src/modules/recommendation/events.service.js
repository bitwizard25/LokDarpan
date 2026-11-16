import crypto from 'crypto';
import { REC } from './rec.config.js';
import RecEvent, { REC_CLIENT_EVENT_TYPES } from './rec-event.model.js';
import Video from '../video/schemas/video.schema.js';
import { publicFilter } from '../catalogue/catalogue.service.js';
import { ValidationError } from '../../utils/errors.js';

async function defaultInsertEvents(docs) {
  if (!docs || docs.length === 0) return [];
  try {
    return await RecEvent.insertMany(docs, { ordered: false });
  } catch (err) {
    if (err.insertedDocs && Array.isArray(err.insertedDocs)) {
      return err.insertedDocs;
    }
    console.warn('[recEvents] insert error:', err.message);
    return err.insertedDocs || [];
  }
}

async function defaultFindPublicVideoIds(ids) {
  if (!ids || ids.length === 0) return [];
  const videos = await Video.find({
    _id: { $in: ids },
    ...publicFilter,
  })
    .select('_id')
    .lean();
  return videos.map((v) => v._id.toString());
}

async function defaultIncViews(videoId) {
  try {
    await Video.findByIdAndUpdate(videoId, { $inc: { views: 1 } });
  } catch (err) {
    console.warn('[recEvents] incViews error:', videoId, err.message);
  }
}

export function createEventsService({
  insertEvents = defaultInsertEvents,
  findPublicVideoIds = defaultFindPublicVideoIds,
  incViews = defaultIncViews,
  isPersonalized = async () => false,
  now = () => new Date(),
} = {}) {
  async function ingest({ viewerId = null, sessionId, events }) {
    if (!Array.isArray(events) || events.length === 0) {
      return { accepted: 0 };
    }

    if (events.length > REC.events.maxBatch) {
      throw new ValidationError(`Batch exceeds maximum size of at most ${REC.events.maxBatch} events`);
    }

    const currentTime = now();
    const personalized = viewerId ? await isPersonalized(viewerId) : false;

    // Filter public videos
    const candidateIds = Array.from(new Set(events.map((e) => String(e.video)).filter(Boolean)));
    const publicIdList = await findPublicVideoIds(candidateIds);
    const publicSet = new Set(publicIdList.map(String));

    const validDocs = [];

    for (const event of events) {
      if (!event || !event.type || !event.video) continue;
      if (!REC_CLIENT_EVENT_TYPES.includes(event.type)) continue;
      if (!publicSet.has(String(event.video))) continue;

      const ts = event.clientTs ? new Date(event.clientTs) : currentTime;
      if (Number.isNaN(ts.getTime())) continue;

      const ageMs = currentTime.getTime() - ts.getTime();
      const skewMs = ts.getTime() - currentTime.getTime();

      if (ageMs > REC.events.maxAgeMs) continue; // > 24 hours old
      if (skewMs > REC.events.maxSkewMs) continue; // > 5 minutes ahead

      const doc = {
        eventId: event.eventId || crypto.randomUUID(),
        type: event.type,
        user: personalized && viewerId ? viewerId : null,
        sessionId: String(sessionId),
        video: event.video,
        surface: event.surface || 'other',
        policy: REC.policyVersion,
        clientTs: ts,
      };

      if (event.requestId) {
        doc.requestId = String(event.requestId).slice(0, 64);
      }
      if (typeof event.position === 'number') {
        doc.position = Math.max(0, Math.min(199, Math.round(event.position)));
      }
      if (event.source) {
        doc.source = event.source;
      }
      if (event.type === 'watch_progress') {
        doc.watchSeconds =
          typeof event.watchSeconds === 'number'
            ? Math.max(0, Math.min(REC.events.maxHeartbeatSeconds, event.watchSeconds))
            : 0;
      }
      if (typeof event.positionSeconds === 'number' && event.positionSeconds >= 0) {
        doc.positionSeconds = event.positionSeconds;
      }

      if (event.type === 'view') {
        const day = ts.toISOString().slice(0, 10);
        const identityKey = personalized && viewerId ? String(viewerId) : String(sessionId);
        doc.dedupeKey = `view:${identityKey}:${event.video}:${day}`;
      }

      validDocs.push(doc);
    }

    if (validDocs.length === 0) {
      return { accepted: 0 };
    }

    const insertedDocs = await insertEvents(validDocs);

    for (const doc of insertedDocs) {
      if (doc && doc.type === 'view') {
        await incViews(doc.video);
      }
    }

    return { accepted: insertedDocs.length };
  }

  async function recordAction({ userId, type, videoId, surface = 'other' }) {
    try {
      if (!['like', 'save', 'not_interested'].includes(type)) return;
      const personalized = userId ? await isPersonalized(userId) : false;
      const doc = {
        eventId: crypto.randomUUID(),
        type,
        user: personalized && userId ? userId : null,
        sessionId: 'server',
        video: videoId,
        surface,
        policy: REC.policyVersion,
        clientTs: now(),
      };
      await insertEvents([doc]);
    } catch (err) {
      console.warn('[recEvents] recordAction error:', err.message);
    }
  }

  return {
    ingest,
    recordAction,
  };
}

export const eventsService = createEventsService();
export default eventsService;
