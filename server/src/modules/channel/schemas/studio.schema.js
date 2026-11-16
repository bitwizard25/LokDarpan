export const channelUpdateBody = {
  type: 'object', minProperties: 1, additionalProperties: false,
  properties: {
    name: { type: 'string', minLength: 3, maxLength: 50, pattern: '\\S' },
    handle: { type: 'string', pattern: '^[a-z0-9_]{3,30}$' },
    description: { type: 'string', maxLength: 1000 },
    avatarUrl: { type: 'string', maxLength: 2048, pattern: '^https?://' },
    bannerUrl: { type: 'string', maxLength: 2048, pattern: '^https?://' },
  },
};

export const channelDeleteBody = {
  type: 'object', required: ['confirmHandle'], additionalProperties: false,
  properties: { confirmHandle: { type: 'string', pattern: '^[a-z0-9_]{3,30}$' } },
};
