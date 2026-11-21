import { optionalAuthenticate } from '../../../middleware/auth.middleware.js';
import { channelUpdateBody, channelDeleteBody } from '../schemas/studio.schema.js';
import { studioPageQuery } from '../../video/schemas/studio.schema.js';

/**
 * Channel Routes
 * Fastify routes with inline JSON Schema validation
 */

async function channelRoutes(fastify, options) {
    const { channelController, authenticate } = options;

    // Create channel route
    fastify.post('/', {
        preValidation: [authenticate],
        schema: {
            description: 'Create a new channel',
            tags: ['channel'],
            consumes: ['multipart/form-data'],
            // No `body` schema: the handler streams the multipart parts itself, so Fastify has no parsed
            // body to validate (it rejected every request with 400). Fields are validated in the controller.
            response: {
                201: {
                    type: 'object',
                    properties: {
                        message: { type: 'string' },
                        channel: {
                            type: 'object',
                            properties: {
                                _id: { type: 'string' },
                                id: { type: 'string' },
                                handle: { type: 'string' },
                                avatarUrl: { type: ['string', 'null'] },
                                bannerUrl: { type: ['string', 'null'] },
                                createdAt: { type: 'string' },
                                name: { type: 'string' },
                                description: { type: 'string' },
                                logoUrl: { type: 'string' },
                                subscribers: { type: 'number' },
                            }
                        }
                    }
                }
            }
        },
    }, channelController.createChannel);

    // Get my channel route
    fastify.get('/me', {
        preValidation: [authenticate],
        schema: {
            description: 'Get current user channel',
            tags: ['channel'],
            response: {
                200: {
                    type: 'object',
                    properties: {
                        channel: {
                            type: 'object',
                            properties: {
                                _id: { type: 'string' },
                                id: { type: 'string' },
                                handle: { type: 'string' },
                                avatarUrl: { type: ['string', 'null'] },
                                bannerUrl: { type: ['string', 'null'] },
                                createdAt: { type: 'string' },
                                name: { type: 'string' },
                                description: { type: 'string' },
                                logoUrl: { type: 'string' },
                                subscribers: { type: 'number' },
                            }
                        }
                    }
                },
                404: {
                    type: 'object',
          additionalProperties: true,
                    properties: {
                        error: {
                            type: 'object',
                            properties: {
                                message: { type: 'string' }
                            }
                        }
                    }
                }
            }
        }
    }, channelController.getMyChannel);

    fastify.put('/me', { preHandler: [authenticate], schema: { body: channelUpdateBody } }, channelController.updateMyChannel);
    fastify.delete('/me', { preHandler: [authenticate], schema: { body: channelDeleteBody } }, channelController.deleteMyChannel);
    fastify.get('/:channelId/videos', { schema: { querystring: { ...studioPageQuery, properties: { limit: studioPageQuery.properties.limit, cursor: studioPageQuery.properties.cursor } } } }, channelController.getChannelVideos);
    fastify.get('/:channelId', { preHandler: [optionalAuthenticate] }, channelController.getPublicChannel);

}

export default channelRoutes;
