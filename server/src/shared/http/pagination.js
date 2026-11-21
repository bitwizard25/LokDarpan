import mongoose from 'mongoose';
import { ValidationError } from '../../utils/errors.js';

export function objectId(value, label = 'ID') {
  if (typeof value !== 'string' || !/^[a-f0-9]{24}$/i.test(value)) throw new ValidationError(`Invalid ${label}`);
  return new mongoose.Types.ObjectId(value);
}

export function pageOptions(query = {}) {
  const limit = Number(query.limit ?? 12);
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) throw new ValidationError('Limit must be between 1 and 50');
  const after = query.cursor ? objectId(query.cursor, 'cursor') : null;
  return { limit, after };
}

export function pageResult(rows, limit, map = item => item) {
  const hasMore = rows.length > limit;
  const items = rows.slice(0, limit);
  return { items: items.map(map), hasMore, nextCursor: hasMore ? String(items.at(-1)._id) : null };
}

export function literalSearch(value) {
  if (typeof value !== 'string' || value.trim().length > 150) throw new ValidationError('Search must be at most 150 characters');
  return value.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function safeText(value, label, maxLength, { optional = false } = {}) {
  if (optional && value === undefined) return undefined;
  if (typeof value !== 'string' || !value.trim() || value.trim().length > maxLength) throw new ValidationError(`${label} is required and must be at most ${maxLength} characters`);
  return value.trim();
}
