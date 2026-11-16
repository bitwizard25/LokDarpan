async function networkRoutes(fastify, options) {
  const { networkController, authenticate } = options;
  fastify.get('/', { preHandler: [authenticate] }, networkController.list);
  fastify.post('/', {
    preHandler: [authenticate],
    schema: { body: { type: 'object', required: ['name'], properties: {
      name: { type: 'string', minLength: 1, maxLength: 80 },
      description: { type: 'string', maxLength: 500 },
      visibility: { type: 'string', enum: ['private', 'invite_only'] },
    } } },
  }, networkController.create);
}

export default networkRoutes;
