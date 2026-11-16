/**
 * Keeps MongoDB (source of truth) and BullMQ/Redis (disposable transport) in step.
 *
 * A video that is PROCESSING in the database but has no live encode job in Redis
 * (Redis was wiped/restarted without its volume, the process died between the DB
 * write and the enqueue, a job failed out, ...) is re-enqueued. After
 * `maxAttempts` re-enqueues it is marked FAILED so it cannot loop forever.
 */
import Video from '../schemas/video.schema.js';
import { AWS_CONFIG } from '../../../config/aws.js';
import { buildTranscodeRequestedPayload } from '../../../shared/contracts/transcoding.messages.js';
import {
  getEncodeQueue,
  enqueueTranscodeEncodeJob,
  transcodeJobId,
} from '../../../shared/messaging/transcodeQueues.js';

const LIVE_STATES = new Set(['waiting', 'active', 'delayed', 'prioritized', 'waiting-children']);
const DEFAULT_GRACE_MS = 2 * 60 * 1000;
const DEFAULT_INTERVAL_MS = 60 * 1000;

/**
 * @returns {Promise<{checked:number, requeued:number, skipped:number, failed:number, errors:number}>}
 */
export async function reconcileTranscodes({
  Video: VideoModel,
  getJob,
  enqueue,
  buildPayload,
  now = Date.now(),
  graceMs = DEFAULT_GRACE_MS,
  maxAttempts = 3,
  limit = 50,
  log = console,
}) {
  const cutoff = new Date(now - graceMs);
  // $not/$gte also matches documents where transcodeRequestedAt is missing or null.
  const videos = await VideoModel.find({
    status: 'PROCESSING',
    rawS3Key: { $exists: true, $ne: null },
    transcodeRequestedAt: { $not: { $gte: cutoff } },
  }).limit(limit).lean();

  const result = { checked: videos.length, requeued: 0, skipped: 0, failed: 0, errors: 0 };

  for (const video of videos) {
    try {
      const id = String(video._id);
      const job = await getJob(transcodeJobId(id));
      const state = job ? await job.getState() : null;

      if (LIVE_STATES.has(state)) {
        result.skipped += 1;
        continue;
      }
      // Encode finished a moment ago: its result message is probably still in flight.
      if (state === 'completed' && (job.finishedOn || 0) > now - graceMs) {
        result.skipped += 1;
        continue;
      }

      if ((video.transcodeAttempts || 0) >= maxAttempts) {
        await VideoModel.updateOne(
          { _id: video._id, status: 'PROCESSING' },
          { $set: { status: 'FAILED', processingError: `Transcoding did not complete after ${maxAttempts} attempts` } },
        );
        result.failed += 1;
        log.warn?.(`[reconciler] ${id} marked FAILED after ${maxAttempts} attempts`);
        continue;
      }

      // A finished/failed job keeps its id in Redis and would swallow the re-add.
      if (job) await job.remove();
      await enqueue(buildPayload(video));
      await VideoModel.updateOne(
        { _id: video._id, status: 'PROCESSING' },
        { $set: { transcodeRequestedAt: new Date(now) }, $inc: { transcodeAttempts: 1 } },
      );
      result.requeued += 1;
      log.info?.(`[reconciler] re-enqueued ${id} (was ${state ?? 'missing'})`);
    } catch (err) {
      // Redis down etc.: don't burn an attempt, the next tick retries.
      result.errors += 1;
      log.error?.('[reconciler] error for video', String(video._id), err.message);
    }
  }
  return result;
}

let timer = null;

/** Runs once immediately, then every `intervalMs`. API process only. */
export function startTranscodeReconciler({ intervalMs = DEFAULT_INTERVAL_MS } = {}) {
  if (timer) return;
  const deps = {
    Video,
    getJob: id => getEncodeQueue().getJob(id),
    enqueue: enqueueTranscodeEncodeJob,
    buildPayload: v => buildTranscodeRequestedPayload({
      videoId: String(v._id),
      rawS3Key: v.rawS3Key,
      bucket: AWS_CONFIG.bucketName,
      region: AWS_CONFIG.region,
    }),
  };
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const r = await reconcileTranscodes(deps);
      if (r.requeued || r.failed || r.errors) console.log('[reconciler]', r);
    } catch (err) {
      console.error('[reconciler] tick failed', err.message);
    } finally {
      running = false;
    }
  };
  tick();
  timer = setInterval(tick, intervalMs);
  timer.unref();
  console.log('✅ Transcode reconciler started');
}

export function stopTranscodeReconciler() {
  if (timer) clearInterval(timer);
  timer = null;
}
