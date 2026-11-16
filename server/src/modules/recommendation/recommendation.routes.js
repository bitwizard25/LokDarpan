import {
  authenticate as defaultAuthenticate,
  optionalAuthenticate as defaultOptionalAuthenticate,
} from '../../middleware/auth.middleware.js';
import { eventsService as defaultEventsService } from './events.service.js';
import { profileService as defaultProfileService } from './profile.service.js';
import { ONBOARDING_V1, mapAnswers } from './onboarding.v1.js';
import Video from '../video/schemas/video.schema.js';

export default async function recommendationRoutes(fastify, options = {}) {
  const auth = options.authenticate || defaultAuthenticate;
  const optionalAuth = options.optionalAuthenticate || defaultOptionalAuthenticate;
  const eventsSvc = options.eventsService || defaultEventsService;
  const profileSvc = options.profileService || defaultProfileService;

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

  fastify.get('/recommendation-onboarding', async (request, reply) => {
    return reply.send(ONBOARDING_V1);
  });

  fastify.post('/recommendation-onboarding/preview', {
    schema: {
      body: {
        type: 'object',
        additionalProperties: false,
        properties: {
          answers: { type: 'array' },
          pickedVideoIds: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  }, async (request, reply) => {
    const { answers = [], pickedVideoIds = [] } = request.body || {};
    let pickedVideos = [];
    if (pickedVideoIds.length > 0) {
      pickedVideos = await Video.find({ _id: { $in: pickedVideoIds } })
        .select('features')
        .lean();
    }
    const result = mapAnswers({ answers, pickedVideos });
    return reply.send(result);
  });

  fastify.get('/user/me/recommendation-preferences', {
    preHandler: [auth],
  }, async (request, reply) => {
    const prefs = await profileSvc.getPreferences(request.userId);
    return reply.send(prefs);
  });

  fastify.put('/user/me/recommendation-preferences', {
    preHandler: [auth],
    schema: {
      body: {
        type: 'object',
        additionalProperties: false,
        properties: {
          personalizationEnabled: { type: 'boolean' },
          languages: { type: 'array', items: { type: 'string' } },
          discovery: { type: 'string', enum: ['low', 'balanced', 'high'] },
          explicitKeys: { type: 'array', items: { type: 'string' } },
          excludedKeys: { type: 'array', items: { type: 'string' } },
          onboarding: {
            type: 'object',
            properties: {
              answers: { type: 'array' },
              pickedVideoIds: { type: 'array', items: { type: 'string' } },
              skipped: { type: 'boolean' },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const updated = await profileSvc.updatePreferences(request.userId, request.body || {});
    return reply.send(updated);
  });

  fastify.delete('/user/me/recommendation-preferences', {
    preHandler: [auth],
  }, async (request, reply) => {
    const scope = request.query?.scope || 'all';
    const result = await profileSvc.resetPreferences(request.userId, scope);
    return reply.send(result);
  });

  fastify.put('/user/me/recommendation-feedback/:videoId', {
    preHandler: [auth],
    schema: {
      body: {
        type: 'object',
        required: ['action'],
        additionalProperties: false,
        properties: {
          action: { type: 'string', enum: ['not_interested', 'hide_channel'] },
          active: { type: 'boolean', default: true },
        },
      },
    },
  }, async (request, reply) => {
    const { videoId } = request.params;
    const { action, active = true } = request.body;
    const result = await profileSvc.setFeedback(request.userId, videoId, { action, active });
    return reply.send(result);
  });
}
