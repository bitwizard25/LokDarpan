import { videoUpdateBody, studioPageQuery } from '../schemas/studio.schema.js';
import { REC } from '../../recommendation/rec.config.js';

/**
 * Video Routes
 * Fastify routes with inline JSON Schema validation
 */

import { optionalAuthenticate } from '../../../middleware/auth.middleware.js';

async function videoRoutes(fastify, options) {
  const { videoController, authenticate } = options;

  fastify.put('/:videoId/reaction', {
    preHandler: [authenticate],
    schema: {
      description: 'Set the current user reaction on a video',
      tags: ['video'],
      params: { type: 'object', required: ['videoId'], properties: { videoId: { type: 'string' } } },
      body: { type: 'object', required: ['reaction'], properties: { reaction: { type: 'string', enum: ['like', 'dislike'] } } },
    },
  }, videoController.setReaction);

  fastify.delete('/:videoId/reaction', {
    preHandler: [authenticate],
    schema: { description: 'Remove the current user reaction from a video', tags: ['video'], params: { type: 'object', required: ['videoId'], properties: { videoId: { type: 'string' } } } },
  }, videoController.clearReaction);

  // Get all videos
  fastify.get('/', {
    schema: {
      description: 'Get all videos',
      tags: ['video'],
      querystring: {
        type: 'object',
        properties: {
          category: { type: 'string' },
          search: { type: 'string', maxLength: 150 },
          q: { type: 'string', maxLength: 150 },
          type: { type: 'string', enum: ['video', 'short'] },
          section: { type: 'string', enum: ['latest', 'popular', 'trending'] },
          cursor: { type: 'string' },
          limit: { type: 'integer', minimum: 1, maximum: 50 }
        }
      },
      response: {
        200: {
          type: 'object',
          additionalProperties: true,
          properties: {
            videos: { type: 'array', items: { type: 'object', additionalProperties: true } }
          }
        }
      }
    }
  }, videoController.getAllVideos);

  // Initiate upload route
  fastify.post('/initiate-upload', {
    preHandler: [authenticate],
    schema: {
      description: 'Initiate video upload by creating a video document with metadata only',
      tags: ['video'],
      body: {
        type: 'object',
        required: ['title', 'description'],
        properties: {
          title: {
            type: 'string',
            minLength: 1,
            maxLength: 200,
            description: 'Video title',
          },
          description: {
            type: 'string',
            maxLength: 5000,
            description: 'Video description',
          },
          category: {
            type: 'string',
            description: 'Video category',
          },
          tags: {
            type: 'string',
            description: 'Comma-separated tags',
          },
          language: {
            type: 'string',
            enum: [...REC.languages, 'und'],
            description: 'Language code',
          },
          format: {
            type: 'string',
            enum: REC.formats,
            description: 'Video format',
          },
        },
        additionalProperties: false,
      },
      response: {
        201: {
          type: 'object',
          description: 'Created video object',
          additionalProperties: true,
        },
        400: {
          type: 'object',
          additionalProperties: true,
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
  }, videoController.initiateUpload);

  fastify.post('/:videoId/complete-upload', {
    preHandler: [authenticate],
    schema: {
      description: 'Confirm raw upload finished on S3 and start transcoding',
      tags: ['video'],
      params: {
        type: 'object',
        required: ['videoId'],
        properties: { videoId: { type: 'string' } },
      },
    },
  }, videoController.completeUpload);

  fastify.get('/:videoId/transcode-status', {
    preHandler: [authenticate],
    schema: {
      description: 'Transcode / queue status for owner',
      tags: ['video'],
      params: {
        type: 'object',
        required: ['videoId'],
        properties: { videoId: { type: 'string' } },
      },
    },
  }, videoController.getTranscodeStatus);

  fastify.get('/me', { preHandler: [authenticate], schema: { tags: ['video'], querystring: studioPageQuery } }, videoController.getMyVideos);

  // Get video by ID (register after /me)
  fastify.get('/:videoId', {
    preHandler: [optionalAuthenticate],
    preHandler: optionalAuthenticate,
    schema: {
      description: 'Get video by ID',
      tags: ['video'],
      params: {
        type: 'object',
        required: ['videoId'],
        properties: {
          videoId: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            video: { type: 'object', additionalProperties: true }
          }
        }
      }
    }
  }, videoController.getVideoById);

  // Upload video route
  fastify.post('/upload', {
    preHandler: [authenticate],
    schema: {
      description: 'Upload a new video',
      tags: ['video'],
      consumes: ['multipart/form-data'],
      body: {
        type: 'object',
        required: ['title', 'description', 'category'],
        properties: {
          title: {
            type: 'string',
            minLength: 1,
            maxLength: 200,
            description: 'Video title',
          },
          description: {
            type: 'string',
            maxLength: 5000,
            description: 'Video description',
          },
          category: {
            type: 'string',
            description: 'Video category',
          },
          tags: {
            type: 'string',
            description: 'Comma-separated tags',
          },
          language: {
            type: 'string',
            enum: [...REC.languages, 'und'],
            description: 'Language code',
          },
          format: {
            type: 'string',
            enum: REC.formats,
            description: 'Video format',
          },
        },
        additionalProperties: false,
      },
      response: {
        201: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            videoId: { type: 'string' },
            video: { type: 'object', additionalProperties: true },
          },
        },
        400: {
          type: 'object',
          additionalProperties: true,
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
  }, videoController.uploadVideo);

  // Update video route
  fastify.put('/:videoId', {
    preValidation: [authenticate, videoController.prepareUpdate],
    schema: {
      description: 'Update video details',
      tags: ['video'],
      consumes: ['multipart/form-data'],
      params: {
        type: 'object',
        required: ['videoId'],
        properties: {
          videoId: {
            type: 'string',
            description: 'Video ID',
          },
        },
      },
      body: videoUpdateBody,
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            video: { type: 'object', additionalProperties: true },
          },
        },
        403: {
          type: 'object',
          additionalProperties: true,
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
          additionalProperties: true,
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
  }, videoController.updateVideo);

  // Delete video route
  fastify.delete('/:videoId', {
    preHandler: [authenticate],
    schema: {
      description: 'Delete a video',
      tags: ['video'],
      params: {
        type: 'object',
        required: ['videoId'],
        properties: {
          videoId: {
            type: 'string',
            description: 'Video ID',
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
        403: {
          type: 'object',
          additionalProperties: true,
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
          additionalProperties: true,
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
  }, videoController.deleteVideo);

  // Like video route
  fastify.put('/:videoId/like', {
    preHandler: [authenticate],
    schema: {
      description: 'Like or unlike a video',
      tags: ['video'],
      params: {
        type: 'object',
        required: ['videoId'],
        properties: {
          videoId: {
            type: 'string',
            description: 'Video ID',
          },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            likes: { type: 'number' },
          },
        },
        404: {
          type: 'object',
          additionalProperties: true,
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
  }, videoController.likeVideo);

  // Dislike video route
  fastify.put('/:videoId/dislike', {
    preHandler: [authenticate],
    schema: {
      description: 'Dislike or undislike a video',
      tags: ['video'],
      params: {
        type: 'object',
        required: ['videoId'],
        properties: {
          videoId: {
            type: 'string',
            description: 'Video ID',
          },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            dislikes: { type: 'number' },
          },
        },
        404: {
          type: 'object',
          additionalProperties: true,
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
  }, videoController.dislikeVideo);
}

export default videoRoutes;

