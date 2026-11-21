import { config } from 'dotenv';
config();

import { Queue, Worker } from 'bullmq';
import { createRedisConnection } from '../src/config/redis.js';
import connectDB from '../src/config/database.js';
import { runStatsJob } from '../src/modules/recommendation/stats.job.js';
import { REC } from '../src/modules/recommendation/rec.config.js';

export const QUEUE_REC_STATS = 'rec-stats';

export async function startRecStatsWorker() {
  await connectDB();
  const connection = createRedisConnection();
  const queue = new Queue(QUEUE_REC_STATS, { connection });

  if (typeof queue.upsertJobScheduler === 'function') {
    await queue.upsertJobScheduler(
      'rec-stats-periodic',
      { every: REC.stats.everyMs },
      { name: 'compute-stats' }
    );
  } else {
    await queue.add(
      'compute-stats',
      {},
      {
        repeat: { every: REC.stats.everyMs },
        jobId: 'rec-stats-periodic',
      }
    );
  }

  // Immediate run at startup
  await queue.add('compute-stats-startup', {}, { jobId: `startup-${Date.now()}` });

  const worker = new Worker(
    QUEUE_REC_STATS,
    async (job) => {
      console.log(`[rec-stats] running job ${job.id}`);
      const result = await runStatsJob();
      console.log(`[rec-stats] completed: updated ${result.videos} videos`);
      return result;
    },
    {
      connection: createRedisConnection(),
      concurrency: 1,
    }
  );

  worker.on('failed', (job, err) => {
    console.error(`[rec-stats] job ${job?.id} failed:`, err);
  });

  console.log('📊 Recommendation stats worker running');
  return { worker, queue };
}

if (process.argv[1] && process.argv[1].includes('recStats.worker.js')) {
  startRecStatsWorker().catch((err) => {
    console.error('Fatal in recStats.worker:', err);
    process.exit(1);
  });
}
