import { RecEvent } from './rec-event.model.js';
import Video from '../video/schemas/video.schema.js';
import { publicFilter } from '../catalogue/catalogue.service.js';
import { REC } from './rec.config.js';

export function computeVideoStats(rows = [], videos = []) {
  const byVideo = new Map();
  for (const row of rows) {
    const vid = String(row.video);
    if (!byVideo.has(vid)) {
      byVideo.set(vid, { impressions: 0, plays: 0, views: 0, watchSeconds: 0 });
    }
    const agg = byVideo.get(vid);
    if (row.type === 'impression') agg.impressions += (row.count || 0);
    else if (row.type === 'play_start') agg.plays += (row.count || 0);
    else if (row.type === 'view') agg.views += (row.count || 0);
    else if (row.type === 'watch_progress') agg.watchSeconds += (row.watchSeconds || 0);
  }

  const ctrPrior = REC.stats.ctrPrior;
  const watchPrior = REC.stats.watchPrior;

  const result = new Map();
  const scoredWithPlays = [];

  for (const v of videos) {
    const vid = String(v._id);
    const agg = byVideo.get(vid) || { impressions: 0, plays: 0, views: 0, watchSeconds: 0 };
    const durationSeconds = v.durationSeconds || v.duration || 0;

    let trendRaw = 0;
    if (agg.plays > 0) {
      const ctr = (agg.plays + ctrPrior.plays) / (agg.impressions + ctrPrior.impressions);
      const rawFraction =
        durationSeconds > 0
          ? Math.min(1, agg.watchSeconds / (Math.max(agg.plays, 1) * durationSeconds))
          : 0;
      const wf =
        (agg.plays * rawFraction + watchPrior.fraction * watchPrior.plays) /
        (agg.plays + watchPrior.plays);
      trendRaw = Math.log(1 + agg.plays) * ctr * wf;
      scoredWithPlays.push({ vid, trendRaw });
    }

    result.set(vid, {
      impressions7d: agg.impressions,
      plays7d: agg.plays,
      views7d: agg.views,
      watchSeconds7d: Math.round(agg.watchSeconds * 10) / 10,
      trending: 0,
    });
  }

  if (scoredWithPlays.length > 0) {
    scoredWithPlays.sort((a, b) => a.trendRaw - b.trendRaw);
    const n = scoredWithPlays.length;
    for (let i = 0; i < n; i++) {
      const entry = result.get(scoredWithPlays[i].vid);
      if (entry) {
        entry.trending = (i + 1) / n;
      }
    }
  }

  return result;
}

async function defaultAggregateEvents(sinceDate) {
  const pipeline = [
    {
      $match: {
        createdAt: { $gte: sinceDate },
        type: { $in: ['impression', 'play_start', 'view', 'watch_progress'] },
      },
    },
    {
      $group: {
        _id: { video: '$video', type: '$type' },
        count: { $sum: 1 },
        watchSeconds: { $sum: { $ifNull: ['$watchSeconds', 0] } },
      },
    },
  ];
  const results = await RecEvent.aggregate(pipeline);
  return results.map((r) => ({
    video: String(r._id.video),
    type: r._id.type,
    count: r.count,
    watchSeconds: r.watchSeconds,
  }));
}

async function defaultListEligibleVideos() {
  return Video.find(publicFilter).select('_id durationSeconds duration').lean();
}

async function defaultWriteStats(statsMap, now) {
  if (statsMap.size === 0) return;
  const ops = [];
  for (const [vid, stats] of statsMap.entries()) {
    ops.push({
      updateOne: {
        filter: { _id: vid },
        update: {
          $set: {
            'stats.impressions7d': stats.impressions7d,
            'stats.plays7d': stats.plays7d,
            'stats.views7d': stats.views7d,
            'stats.watchSeconds7d': stats.watchSeconds7d,
            'stats.trending': stats.trending,
            'stats.updatedAt': now,
          },
        },
      },
    });
  }
  if (ops.length > 0) {
    await Video.bulkWrite(ops, { ordered: false });
  }
}

export async function runStatsJob({
  aggregateEvents,
  listEligibleVideos,
  writeStats,
  now = new Date(),
} = {}) {
  const windowDays = REC.stats.windowDays;
  const sinceDate = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);

  const aggFn = aggregateEvents || defaultAggregateEvents;
  const listFn = listEligibleVideos || defaultListEligibleVideos;
  const writeFn = writeStats || defaultWriteStats;

  const [rows, videos] = await Promise.all([aggFn(sinceDate), listFn()]);
  const statsMap = computeVideoStats(rows, videos);
  await writeFn(statsMap, now);

  return { videos: statsMap.size };
}
