import { safeVideo } from '../services/studio-video.service.js';
import { ValidationError } from '../../../utils/errors.js';
/**
 * Video Controller
 * Handles HTTP request/response for video endpoints
 */

import videoService from '../services/video.service.js';
import * as catalogue from '../../catalogue/catalogue.service.js';

/**
 * Handle video upload initiation
 * @param {FastifyRequest} request - Fastify request
 * @param {FastifyReply} reply - Fastify reply
 */
async function initiateUpload(request, reply) {
  const userId = request.userId;
  const metadata = request.body;

  const { videoId, preSignedUrl } = await videoService.initiateVideoUpload(metadata, userId);

  return reply.status(201).send({
    message: 'Upload initiated',
    videoId,
    preSignedUrl,
  });
}

/**
 * Handle video upload
 * @param {FastifyRequest} request - Fastify request
 * @param {FastifyReply} reply - Fastify reply
 */
async function uploadVideo(request, reply) {
  const userId = request.userId;

  // Parse multipart form data
  const parts = request.parts();
  const data = {};
  let videoFile = null;
  let thumbnailFile = null;

  for await (const part of parts) {
    if (part.file) {
      // It's a file
      if (part.fieldname === 'video') {
        videoFile = part;
      } else if (part.fieldname === 'thumbnail') {
        thumbnailFile = part;
      }
    } else {
      // It's a field
      data[part.fieldname] = part.value;
    }
  }

  const { title, description, category, tags } = data;

  if (!videoFile) {
    return reply.status(400).send({
      error: {
        message: 'Video file is required',
      },
    });
  }

  if (!thumbnailFile) {
    return reply.status(400).send({
      error: {
        message: 'Thumbnail file is required',
      },
    });
  }

  const video = await videoService.createVideo(
    { title, description, user_id: userId, category, tags },
    videoFile,
    thumbnailFile
  );

  return reply.status(201).send({
    message: 'Video uploaded successfully',
    videoId: video._id,
    video,
  });
}

async function completeUpload(request, reply) {
  const userId = request.userId;
  const { videoId } = request.params;

  const result = await videoService.completeVideoUpload(videoId, userId);
  return reply.status(200).send(result);
}

async function getTranscodeStatus(request, reply) {
  const userId = request.userId;
  const { videoId } = request.params;

  const status = await videoService.getTranscodeStatus(videoId, userId);
  return reply.status(200).send(status);
}

/**
 * Handle video update
 * @param {FastifyRequest} request - Fastify request
 * @param {FastifyReply} reply - Fastify reply
 */
async function updateVideo(request, reply) {
  const { videoId } = request.params;
  const userId = request.userId;

  const updateData = request.body;
  const thumbnailFile = request.thumbnailFile || null;
  if (!Object.keys(updateData).length && !thumbnailFile) throw new ValidationError('At least one video field or thumbnail is required');

  const updatedVideo = await videoService.updateVideo(videoId, userId, updateData, thumbnailFile);

  return reply.status(200).send({
    message: 'Video updated successfully',
    video: safeVideo(updatedVideo),
  });
}

/**
 * Handle video deletion
 * @param {FastifyRequest} request - Fastify request
 * @param {FastifyReply} reply - Fastify reply
 */
async function deleteVideo(request, reply) {
  const { videoId } = request.params;
  const userId = request.userId;

  await videoService.deleteVideo(videoId, userId);

  return reply.status(200).send({
    message: 'Video deleted successfully',
  });
}

/**
 * Handle video like
 * @param {FastifyRequest} request - Fastify request
 * @param {FastifyReply} reply - Fastify reply
 */
async function likeVideo(request, reply) {
  const { videoId } = request.params;
  const userId = request.userId;

  const result = await videoService.toggleLike(videoId, userId);

  return reply.status(200).send({
    message: `Video ${result.action} successfully`,
    likes: result.likes,
  });
}

/**
 * Handle video dislike
 * @param {FastifyRequest} request - Fastify request
 * @param {FastifyReply} reply - Fastify reply
 */
async function dislikeVideo(request, reply) {
  const { videoId } = request.params;
  const userId = request.userId;

  const result = await videoService.toggleDislike(videoId, userId);

  return reply.status(200).send({
    message: `Video ${result.action} successfully`,
    dislikes: result.dislikes,
  });
}

async function setReaction(request, reply) {
  const result = await videoService.setReaction(request.params.videoId, request.userId, request.body.reaction);
  return reply.send(result);
}

async function clearReaction(request, reply) {
  const result = await videoService.clearReaction(request.params.videoId, request.userId);
  return reply.send(result);
}

/**
 * Get all videos
 * @param {FastifyRequest} request - Fastify request
 * @param {FastifyReply} reply - Fastify reply
 */
async function getAllVideos(request, reply) {
  return reply.send(await catalogue.listVideos(request.query));
}

/**
 * Get video by ID
 * @param {FastifyRequest} request - Fastify request
 * @param {FastifyReply} reply - Fastify reply
 */
async function getVideoById(request, reply) {
  return reply.send(await catalogue.getVideo(request.params.videoId, request.userId));
}

export {
  initiateUpload,
  uploadVideo,
  completeUpload,
  getTranscodeStatus,
  updateVideo,
  deleteVideo,
  likeVideo,
  dislikeVideo,
  setReaction,
  clearReaction,
};

async function getMyVideos(request, reply) {
  return reply.send(await videoService.getMyVideos(request.userId, request.query));
}

async function prepareUpdate(request) {
  if (!request.isMultipart()) return;
  const data = {};
  for await (const part of request.parts({ limits: { fileSize: 10 * 1024 * 1024 } })) {
    if (part.file) {
      if (part.fieldname !== 'thumbnail') {
        await part.toBuffer();
        throw new ValidationError('Only a thumbnail file can be updated');
      }
      let buffer;
      try {
        buffer = await part.toBuffer();
      } catch (error) {
        if (error.code === 'FST_REQ_FILE_TOO_LARGE') throw new ValidationError('Thumbnail must be at most 10 MB');
        throw error;
      }
      if (buffer.length > 10 * 1024 * 1024 || !['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(part.mimetype)) throw new ValidationError('Thumbnail must be an image of at most 10 MB');
      request.thumbnailFile = { filename: part.filename, mimetype: part.mimetype, buffer, fileSize: buffer.length };
    } else data[part.fieldname] = part.value;
  }
  request.body = data;
}

export default {
  getMyVideos,
  prepareUpdate,
  initiateUpload,
  uploadVideo,
  completeUpload,
  getTranscodeStatus,
  getAllVideos,
  getVideoById,
  updateVideo,
  deleteVideo,
  likeVideo,
  dislikeVideo,
  setReaction,
  clearReaction,
};

