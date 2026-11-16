import { config } from 'dotenv';
config();
import mongoose from 'mongoose';
import connectDatabase from '../src/config/database.js';
import Video from '../src/modules/video/schemas/video.schema.js';
import { videoFeatures, needsPublishedAt } from '../src/modules/recommendation/features.js';

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  console.log(`[backfill-rec-metadata] Starting backfill ${isDryRun ? '(DRY RUN)' : ''}...`);

  await connectDatabase();

  console.log('[backfill-rec-metadata] Ensuring indexes...');
  if (!isDryRun) {
    await Video.createIndexes();
    console.log('[backfill-rec-metadata] Indexes created.');
  } else {
    console.log('[backfill-rec-metadata] (dry run) Skipped createIndexes.');
  }

  const cursor = Video.find({}).cursor({ batchSize: 500 });
  let totalScanned = 0;
  let totalUpdated = 0;
  let totalPublishedAtSet = 0;
  let batchOps = [];

  for await (const doc of cursor) {
    totalScanned++;
    const nextFeatures = videoFeatures(doc);
    const shouldSetPublishedAt = needsPublishedAt(doc);

    const updateSet = {};
    const currentFeatures = Array.isArray(doc.features) ? doc.features.slice().sort() : [];
    if (JSON.stringify(currentFeatures) !== JSON.stringify(nextFeatures)) {
      updateSet.features = nextFeatures;
    }
    if (shouldSetPublishedAt) {
      updateSet.publishedAt = doc.createdAt || new Date();
      totalPublishedAtSet++;
    }

    if (Object.keys(updateSet).length > 0) {
      totalUpdated++;
      if (!isDryRun) {
        batchOps.push({
          updateOne: {
            filter: { _id: doc._id },
            update: { $set: updateSet },
          },
        });
      }
    }

    if (batchOps.length >= 500) {
      await Video.bulkWrite(batchOps);
      batchOps = [];
      console.log(`[backfill-rec-metadata] Processed ${totalScanned} videos, updated ${totalUpdated}...`);
    }
  }

  if (batchOps.length > 0 && !isDryRun) {
    await Video.bulkWrite(batchOps);
  }

  console.log('--- Backfill Summary ---');
  console.log(`Total scanned: ${totalScanned}`);
  console.log(`Total updated: ${totalUpdated}`);
  console.log(`Total publishedAt set: ${totalPublishedAtSet}`);
  console.log(isDryRun ? 'DRY RUN complete (no writes performed).' : 'Backfill completed successfully.');

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('[backfill-rec-metadata] Error:', err);
  process.exit(1);
});
