import { REC } from './rec.config.js';

const CATEGORY_LABELS = [
  'Entertainment',
  'Education',
  'Gaming',
  'Music',
  'Sports',
  'Technology',
  'News',
  'Comedy',
  'Film',
  'Other',
];

const CATEGORY_MAP = new Map(
  CATEGORY_LABELS.map(label => [label.toLowerCase(), label])
);

const FORMAT_LABELS = {
  explainer: 'Explainers',
  story: 'Stories',
  discussion: 'Discussions',
  tutorial: 'How-to videos',
  performance: 'Performances',
  update: 'Quick updates',
  other: 'Other',
};

const LENGTH_LABELS = {
  short: 'Shorter videos',
  medium: 'Mid-length videos',
  long: 'Longer videos',
};

const LANGUAGE_LABELS = {
  hi: 'Hindi',
  mr: 'Marathi',
  en: 'English',
  und: 'Unknown',
};

export const KEY_REGEX = /^(cat|fmt|len|lang|tag):[\p{L}\p{M}\p{N}-]{1,40}$/u;

export function isValidKey(key) {
  if (typeof key !== 'string') return false;
  return KEY_REGEX.test(key);
}

export function keyLabel(key) {
  if (typeof key !== 'string') return '';
  const colonIndex = key.indexOf(':');
  if (colonIndex === -1) return key;

  const prefix = key.slice(0, colonIndex);
  const val = key.slice(colonIndex + 1);

  switch (prefix) {
    case 'cat':
      return CATEGORY_MAP.get(val.toLowerCase()) || val;
    case 'fmt':
      return FORMAT_LABELS[val] || val;
    case 'len':
      return LENGTH_LABELS[val] || val;
    case 'lang':
      return LANGUAGE_LABELS[val] || val;
    case 'tag':
      return `#${val}`;
    default:
      return key;
  }
}

export function needsPublishedAt({ status, visibility, publishedAt } = {}) {
  if (publishedAt) return false;
  if (status !== 'COMPLETED') return false;
  const isPublic = visibility === 'public' || visibility === undefined || visibility === null;
  return isPublic;
}

export function slugifyTag(rawTag) {
  if (!rawTag || typeof rawTag !== 'string') return '';
  const normalized = rawTag
    .normalize('NFC')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{M}\p{N}-]/gu, '');

  return normalized.slice(0, 40);
}

export function videoFeatures(video = {}) {
  const keys = new Set();

  // 1. cat:<slug>
  const rawCat = video.category && typeof video.category === 'string' ? video.category.toLowerCase().trim() : '';
  if (rawCat && CATEGORY_MAP.has(rawCat)) {
    keys.add(`cat:${rawCat}`);
  } else {
    keys.add('cat:other');
  }

  // 2. fmt:<format>
  if (video.format && video.format !== 'other' && REC.formats.includes(video.format)) {
    keys.add(`fmt:${video.format}`);
  }

  // 3. lang:<code>
  if (video.language && video.language !== 'und' && REC.languages.includes(video.language)) {
    keys.add(`lang:${video.language}`);
  }

  // 4. len:short|medium|long
  const isShort = video.type === 'short';
  const duration = typeof video.durationSeconds === 'number' && !Number.isNaN(video.durationSeconds) ? video.durationSeconds : null;

  if (isShort || (duration !== null && duration < 300)) {
    keys.add('len:short');
  } else if (duration !== null) {
    if (duration < 1200) {
      keys.add('len:medium');
    } else {
      keys.add('len:long');
    }
  }

  // 5. tag:<slug> (first 10 tags)
  if (Array.isArray(video.tags)) {
    let tagCount = 0;
    for (const rawTag of video.tags) {
      if (tagCount >= 10) break;
      const slug = slugifyTag(rawTag);
      if (slug && isValidKey(`tag:${slug}`)) {
        if (!keys.has(`tag:${slug}`)) {
          keys.add(`tag:${slug}`);
          tagCount++;
        }
      }
    }
  }

  return Array.from(keys).sort();
}

