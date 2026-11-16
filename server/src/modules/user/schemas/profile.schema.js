export const profileUpdateBody = {
  type: 'object', minProperties: 1, additionalProperties: false,
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 100, pattern: '\\S' },
    displayName: { type: 'string', minLength: 3, maxLength: 50, pattern: '\\S' },
    bio: { type: 'string', maxLength: 1000 },
    avatarUrl: { type: ['string', 'null'], maxLength: 2048, pattern: '^https?://' },
  },
};

export const passwordChangeBody = {
  type: 'object', required: ['currentPassword', 'newPassword'], additionalProperties: false,
  properties: {
    currentPassword: { type: 'string', minLength: 1 },
    newPassword: { type: 'string', minLength: 6 },
  },
};

export const accountDeleteBody = {
  type: 'object', required: ['password'], additionalProperties: false,
  properties: { password: { type: 'string', minLength: 1 } },
};
