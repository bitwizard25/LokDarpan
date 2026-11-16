import { optionalAuthenticate as defaultOptionalAuthenticate } from '../../middleware/auth.middleware.js';
import { eventsService as defaultEventsService } from './events.service.js';

export default async function recommendationRoutes(fastify, options = {}) {
  const optionalAuth = options.optionalAuthenticate || defaultOptionalAuthenticate;
  const eventsSvc = options.eventsService || defaultEventsService;

  fastify.post('/recommendation-events', {
    preHandler: [optionalAuth],
    preValidation: async (request, reply) => {
      if (request.body && typeof request.body === 'object' && 'user' in request.body) {
        return reply.status(400).send({
          error: {
            message: 'Property user is not allowed in request body',
          },
        });
      }
    },
    config: {
      rateLimit: {
        max: 60,
        timeWindow: '1 minute',
      },
    },
    schema: {
      description: 'Ingest client recommendation tracking events in batches',
      tags: ['recommendations'],
      body: {
        type: 'object',
        required: ['sessionId', 'events'],
        additionalProperties: false,
        properties: {
          sessionId: {
            type: 'string',
            minLength: 1,
            maxLength: 64,
          },
          events: {
            type: 'array',
            minItems: 1,
            maxItems: 50,
            items: {
              type: 'object',
              required: ['type', 'video'],
              additionalProperties: false,
              properties: {
                eventId: { type: 'string', maxLength: 100 },
                type: {
                  type: 'string',
                  enum: ['impression', 'click', 'play_start', 'watch_progress', 'play_end', 'view'],
                },
                video: { type: 'string', minLength: 1 },
                surface: {
                  type: 'string',
                  enum: ['home', 'related', 'search', 'channel', 'shorts', 'other'],
                },
                requestId: { type: 'string', maxLength: 64 },
                position: { type: 'integer', minimum: 0, maximum: 199 },
                source: {
                  type: 'string',
                  enum: ['interest', 'following', 'trending', 'fresh', 'explore', 'related', 'none'],
                },
                watchSeconds: { type: 'number', minimum: 0, maximum: 15 },
                positionSeconds: { type: 'number', minimum: 0 },
                clientTs: { type: 'string' },
              },
            },
          },
        },
      },
      response: {
        202: {
          type: 'object',
          properties: {
            accepted: { type: 'integer' },
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
      },
    },
  }, async (request, reply) => {
    const viewerId = request.userId || null;
    const { sessionId, events } = request.body;
    const result = await eventsSvc.ingest({
      viewerId,
      sessionId,
      events,
    });
    return reply.status(202).send(result);
  });
}
