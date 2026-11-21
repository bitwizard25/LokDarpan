import { keyLabel } from './features.js';
import { REC } from './rec.config.js';

export const ONBOARDING_V1 = {
  version: 'v1',
  intro:
    'A few quick questions can help us make your feed feel more like you. You can skip any question and change your choices anytime.',
  questions: [
    {
      id: 'after_long_day',
      text: 'You have a little time after a long day. What sounds nice?',
      multi: true,
      options: [
        { id: 'laugh', label: 'A good laugh' },
        { id: 'story', label: 'A story' },
        { id: 'calming', label: 'Something calming' },
        { id: 'new', label: 'Trying something new' },
        { id: 'depends', label: 'It depends' },
      ],
    },
    {
      id: 'free_afternoon',
      text: "It's a free afternoon. What might you enjoy doing?",
      multi: true,
      options: [
        { id: 'music', label: 'Listening to music' },
        { id: 'match', label: 'Following a match' },
        { id: 'making', label: 'Making or fixing something' },
        { id: 'local', label: 'Hearing local stories' },
        { id: 'else', label: 'Something else' },
      ],
    },
    {
      id: 'follow_conversation',
      text: 'A conversation gets interesting. How do you like to follow it?',
      multi: true,
      options: [
        { id: 'overview', label: 'A quick overview' },
        { id: 'views', label: "Different people's views" },
        { id: 'detailed', label: 'A detailed explanation' },
        { id: 'depends', label: 'Depends on the topic' },
      ],
    },
    {
      id: 'languages',
      text: 'Which languages do you want videos in?',
      multi: true,
      options: [
        { id: 'hi', label: 'Hindi' },
        { id: 'mr', label: 'Marathi' },
        { id: 'en', label: 'English' },
      ],
    },
  ],
};

const OPTION_MAP = {
  after_long_day: {
    laugh: { keys: [{ key: 'cat:comedy', weight: 0.3 }] },
    story: { keys: [{ key: 'fmt:story', weight: 0.3 }] },
    calming: { keys: [{ key: 'cat:music', weight: 0.2 }, { key: 'tag:calm', weight: 0.2 }] },
    new: { discovery: 'high' },
    depends: {},
  },
  free_afternoon: {
    music: { keys: [{ key: 'cat:music', weight: 0.3 }] },
    match: { keys: [{ key: 'cat:sports', weight: 0.3 }] },
    making: { keys: [{ key: 'fmt:tutorial', weight: 0.3 }] },
    local: { keys: [{ key: 'tag:local', weight: 0.3 }, { key: 'fmt:story', weight: 0.15 }] },
    else: {},
  },
  follow_conversation: {
    overview: { keys: [{ key: 'len:short', weight: 0.2 }, { key: 'fmt:update', weight: 0.2 }] },
    views: { keys: [{ key: 'fmt:discussion', weight: 0.3 }] },
    detailed: { keys: [{ key: 'fmt:explainer', weight: 0.3 }, { key: 'len:long', weight: 0.15 }] },
    depends: {},
  },
  languages: {
    hi: { language: 'hi' },
    mr: { language: 'mr' },
    en: { language: 'en' },
  },
};

export function mapAnswers({ answers = [], pickedVideos = [] } = {}) {
  const questionMap = new Map(ONBOARDING_V1.questions.map((q) => [q.id, q]));
  let discovery = 'balanced';
  const languagesSet = new Set();
  const rawKeyWeights = new Map(); // key -> Array<number>

  for (const ans of answers) {
    const q = questionMap.get(ans.questionId);
    if (!q) {
      const err = new Error(`Unknown question ID: ${ans.questionId}`);
      err.statusCode = 400;
      throw err;
    }
    const qOptions = OPTION_MAP[ans.questionId];
    for (const optId of ans.optionIds || []) {
      const opt = qOptions[optId];
      if (!opt) {
        const err = new Error(`Unknown option ID: ${optId} for question: ${ans.questionId}`);
        err.statusCode = 400;
        throw err;
      }
      if (opt.discovery) discovery = opt.discovery;
      if (opt.language) languagesSet.add(opt.language);
      if (opt.keys) {
        for (const k of opt.keys) {
          if (!rawKeyWeights.has(k.key)) rawKeyWeights.set(k.key, []);
          rawKeyWeights.get(k.key).push(k.weight);
        }
      }
    }
  }

  // Picked videos (at most 10)
  for (const video of pickedVideos.slice(0, REC.limits.pickedVideos)) {
    const features = video.features || [];
    for (const feat of features) {
      if (feat.startsWith('cat:') || feat.startsWith('fmt:')) {
        if (!rawKeyWeights.has(feat)) rawKeyWeights.set(feat, []);
        rawKeyWeights.get(feat).push(0.3);
      }
    }
  }

  // Combine weights: 1 - ∏(1 - w), capped at onboardingCap (0.5)
  const cap = REC.explicitWeight.onboardingCap;
  const keys = [];
  for (const [key, weights] of rawKeyWeights.entries()) {
    let complementProduct = 1.0;
    for (const w of weights) {
      complementProduct *= 1.0 - w;
    }
    const combined = Math.min(cap, 1.0 - complementProduct);
    keys.push({
      key,
      label: keyLabel(key),
      weight: Math.round(combined * 1000000) / 1000000,
    });
  }

  return {
    keys,
    languages: Array.from(languagesSet),
    discovery,
  };
}
