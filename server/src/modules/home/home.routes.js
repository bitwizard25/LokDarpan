export default async function homeRoutes(app, { getHome }) {
  app.get('/', {
    schema: { tags: ['home'], querystring: {
      type: 'object', additionalProperties: false,
      properties: { category: { type: 'string', maxLength: 40 }, limit: { type: 'integer', minimum: 1, maximum: 12 } },
    } },
  }, async (request, reply) => {
    try {
      return await getHome(request.query);
    } catch (error) {
      if (error.statusCode === 400) throw error;
      request.log.error(error, 'Home feed unavailable');
      return reply.code(503).send({ error: { code: 'HOME_UNAVAILABLE', message: 'The home feed is temporarily unavailable.' } });
    }
  });
}
