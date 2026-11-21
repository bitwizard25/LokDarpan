import { optionalAuthenticate as defaultOptionalAuthenticate } from '../../middleware/auth.middleware.js';

export default async function homeRoutes(app, { getHome, optionalAuthenticate = defaultOptionalAuthenticate } = {}) {
  const preHandlers = optionalAuthenticate ? [optionalAuthenticate] : [];

  app.get('/', {
    preHandler: preHandlers,
    schema: {
      tags: ['home'],
      querystring: {
        type: 'object',
        additionalProperties: true,
        properties: {
          category: { type: 'string', maxLength: 40 },
          limit: { type: 'integer', minimum: 1, maximum: 12 },
          hints: { anyOf: [{ type: 'string' }, { type: 'array' }] },
          languages: { anyOf: [{ type: 'string' }, { type: 'array' }] },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const parseList = (val) => {
        if (!val) return [];
        if (Array.isArray(val)) return val;
        return typeof val === 'string' ? val.split(',').map(s => s.trim()).filter(Boolean) : [];
      };

      const hints = parseList(request.query?.hints);
      const languages = parseList(request.query?.languages);

      return await getHome(request.query, {
        viewerId: request.userId || null,
        hints,
        languages,
      });
    } catch (error) {
      if (error.statusCode === 400) throw error;
      request.log.error(error, 'Home feed unavailable');
      return reply.code(503).send({ error: { code: 'HOME_UNAVAILABLE', message: 'The home feed is temporarily unavailable.' } });
    }
  });
}
