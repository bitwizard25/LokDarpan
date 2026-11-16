import { REC } from './rec.config.js';

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
