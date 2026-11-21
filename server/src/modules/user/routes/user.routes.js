import { profileUpdateBody, passwordChangeBody, accountDeleteBody } from '../schemas/profile.schema.js';
/**
 * User Routes
 * Fastify routes with inline JSON Schema validation
 */

async function userRoutes(fastify, options) {
  const { userController, authenticate } = options;

  fastify.get('/me', {
    preHandler: [authenticate],
    schema: {
      description: 'Get the authenticated user profile summary',
      tags: ['user'],
      response: { 200: { type: 'object', properties: { user: { type: 'object', additionalProperties: true } } } },
    },
  }, userController.me);

  fastify.patch('/me', { preHandler: [authenticate], schema: { body: profileUpdateBody } }, userController.updateProfile);
  fastify.put('/me/password', { preHandler: [authenticate], schema: { body: passwordChangeBody } }, userController.changePassword);
  fastify.delete('/me', { preHandler: [authenticate], schema: { body: accountDeleteBody } }, userController.deleteAccount);

  // Subscribe to channel route
  fastify.put('/:channelId/subscribe', {
    preHandler: [authenticate],
    schema: {
      description: 'Subscribe to a channel',
      tags: ['user'],
      params: {
        type: 'object',
        required: ['channelId'],
        properties: {
          channelId: {
            type: 'string',
            description: 'Channel ID to subscribe to',
          },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
          },
        },
        400: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                message: { type: 'string' },
              },
            },
          },
        },
        404: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                message: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, userController.subscribe);

  // Unsubscribe from channel route
  fastify.put('/:channelId/unsubscribe', {
    preHandler: [authenticate],
    schema: {
      description: 'Unsubscribe from a channel',
      tags: ['user'],
      params: {
        type: 'object',
        required: ['channelId'],
        properties: {
          channelId: {
            type: 'string',
            description: 'Channel ID to unsubscribe from',
          },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
          },
        },
        400: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                message: { type: 'string' },
              },
            },
          },
        },
        404: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                message: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, userController.unsubscribe);
}

export default userRoutes;

