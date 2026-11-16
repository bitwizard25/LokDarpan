import { config } from 'dotenv';
config();
import mongoose from 'mongoose';
import connectDatabase from '../src/config/database.js';
import Video from '../src/modules/video/schemas/video.schema.js';
import { RecEvent } from '../src/modules/recommendation/rec-event.model.js';
import { RecProfile } from '../src/modules/recommendation/rec-profile.model.js';
import { publicFilter } from '../src/modules/catalogue/catalogue.service.js';

export async function generateRecReport({
  days = 7,
  videoModel = Video,
  eventModel = RecEvent,
  profileModel = RecProfile,
  now = new Date(),
} = {}) {
  const sinceDate = new Date(now.getTime() - days * 86400000);

  // 1. Surface metrics aggregation
  const surfaceStats = await eventModel.aggregate([
    { $match: { createdAt: { $gte: sinceDate } } },
    {
      $group: {
        _id: { surface: '$surface', type: '$type' },
        count: { $sum: 1 },
        totalSeconds: { $sum: { $ifNull: ['$positionSeconds', 0] } },
      },
    },
  ]);

  const surfaces = new Map();
  const getSurfaceData = (s = 'unknown') => {
    if (!surfaces.has(s)) {
      surfaces.set(s, {
        impressions: 0,
        clicks: 0,
        plays: 0,
        views: 0,
        watchSeconds: 0,
      });
    }
    return surfaces.get(s);
  };

  for (const row of surfaceStats) {
    const sName = row._id?.surface || 'unspecified';
    const sData = getSurfaceData(sName);
    const type = row._id?.type;

    if (type === 'impression') sData.impressions += row.count;
    else if (type === 'click') sData.clicks += row.count;
    else if (type === 'play_start') sData.plays += row.count;
    else if (type === 'view') sData.views += row.count;
    else if (type === 'watch_progress') sData.watchSeconds += row.totalSeconds;
  }

  // 2. Feedback metrics (not interested)
  const notInterestedCount = await profileModel.aggregate([
    { $project: { count: { $size: { $ifNull: ['$notInterested', []] } } } },
    { $group: { _id: null, total: { $sum: '$count' } } },
  ]);
  const totalNotInterested = notInterestedCount[0]?.total || 0;

  // 3. Catalogue coverage
  const distinctImpressedVideos = await eventModel.distinct('video', {
    type: 'impression',
    createdAt: { $gte: sinceDate },
  });
  const totalEligibleVideos = await videoModel.countDocuments(publicFilter);
  const coveragePercent =
    totalEligibleVideos > 0
      ? ((distinctImpressedVideos.length / totalEligibleVideos) * 100).toFixed(2)
      : '0.00';

  // 4. Share of impressions by source
  const sourceStats = await eventModel.aggregate([
    {
      $match: {
        type: 'impression',
        createdAt: { $gte: sinceDate },
      },
    },
    {
      $group: {
        _id: '$source',
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]);

  const totalImpressions = sourceStats.reduce((acc, cur) => acc + cur.count, 0);
  const sourceShares = sourceStats.map((row) => ({
    source: row._id || 'unknown',
    count: row.count,
    sharePercent:
      totalImpressions > 0
        ? ((row.count / totalImpressions) * 100).toFixed(2)
        : '0.00',
  }));

  return {
    windowDays: days,
    since: sinceDate.toISOString(),
    surfaces: Array.from(surfaces.entries()).map(([surface, data]) => {
      const ctr = data.impressions > 0 ? ((data.clicks / data.impressions) * 100).toFixed(2) : '0.00';
      const avgWatchSec = data.plays > 0 ? (data.watchSeconds / data.plays).toFixed(1) : '0.0';
      return {
        surface,
        impressions: data.impressions,
        clicks: data.clicks,
        ctr: `${ctr}%`,
        plays: data.plays,
        views: data.views,
        watchSecondsPerPlay: avgWatchSec,
      };
    }),
    feedback: {
      notInterestedCount: totalNotInterested,
    },
    catalogueCoverage: {
      impressedVideos: distinctImpressedVideos.length,
      eligibleVideos: totalEligibleVideos,
      coveragePercent: `${coveragePercent}%`,
    },
    impressionSources: sourceShares,
  };
}

async function main() {
  const args = process.argv.slice(2);
  let days = 7;
  const daysIdx = args.indexOf('--days');
  if (daysIdx !== -1 && args[daysIdx + 1]) {
    days = parseInt(args[daysIdx + 1], 10) || 7;
  }
  const isDryRun = args.includes('--dry-run');

  console.log(`\n======================================================`);
  console.log(`📊 LokDarpan Recommendation Performance Report (${days} Days)`);
  console.log(`======================================================\n`);

  if (isDryRun) {
    console.log(`[Dry run mode enabled: simulating database query...]`);
    console.log(`Window: Last ${days} days`);
    console.log(`Catalogue Coverage: 0 eligible, 0 impressed (0.00%)`);
    console.log(`Surfaces: No events recorded yet in dry run.`);
    console.log(`\n[Dry run complete]\n`);
    return;
  }

  try {
    await connectDatabase();
    const report = await generateRecReport({ days });

    console.log(`Report Window: ${report.since} to Present\n`);

    console.log(`1. Surface Performance:`);
    if (report.surfaces.length === 0) {
      console.log(`   (No surface activity recorded in this period)`);
    } else {
      console.table(report.surfaces);
    }

    console.log(`\n2. Catalogue Coverage:`);
    console.log(`   Distinct Impressed Videos: ${report.catalogueCoverage.impressedVideos}`);
    console.log(`   Total Eligible Videos:     ${report.catalogueCoverage.eligibleVideos}`);
    console.log(`   Coverage:                  ${report.catalogueCoverage.coveragePercent}\n`);

    console.log(`3. Negative Feedback:`);
    console.log(`   "Not Interested" Actions:  ${report.feedback.notInterestedCount}\n`);

    console.log(`4. Impression Share by Source:`);
    if (report.impressionSources.length === 0) {
      console.log(`   (No impressions recorded in this period)`);
    } else {
      console.table(report.impressionSources);
    }
  } catch (err) {
    console.error('Error generating report:', err.message);
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
}

if (process.argv[1] && process.argv[1].endsWith('rec-report.js')) {
  main();
}
