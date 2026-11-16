import { REC } from '../../recommendation/rec.config.js';

// JSON schemas shared by JSON and multipart video edits.
export const videoUpdateBody = {
  type: 'object', additionalProperties: false,
  properties: {
    title: { type: 'string', minLength: 1, maxLength: 200, pattern: '\\S' },
    description: { type: 'string', maxLength: 5000 },
    visibility: { type: 'string', enum: ['public', 'unlisted', 'private'] },
    category: { type: 'string', maxLength: 100 },
    language: { type: 'string', enum: [...REC.languages, 'und'] },
    format: { type: 'string', enum: REC.formats },
    tags: { anyOf: [{ type: 'string', maxLength: 2000 }, { type: 'array', maxItems: 50, items: { type: 'string', maxLength: 100 } }] },
    thumbnailUrl: { type: 'string', maxLength: 2048, pattern: '^https?://' },
  },
};

export const studioPageQuery = {
  type: 'object',
  properties: {
    limit: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
    cursor: { type: 'string', minLength: 1, maxLength: 100 },
    status: { type: 'string', enum: ['uploading', 'processing', 'failed', 'published', 'unpublished'] },
    q: { type: 'string', maxLength: 150 },
  },
};
