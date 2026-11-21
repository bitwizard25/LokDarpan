import { getMyVideos } from './studio-video.service.js';
import { videoFeatures, needsPublishedAt } from '../../recommendation/features.js';
import { eventsService } from '../../recommendation/events.service.js';
import { createReadStream } from 'fs';
import { unlink } from 'fs/promises';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import Video from '../schemas/video.schema.js';
import { AWS_CONFIG } from '../../../config/aws.js';
import { NotFoundError, ValidationError, AuthorizationError } from '../../../utils/errors.js';
import { isValidObjectId, createObjectId } from '../../../utils/db.js';
import storageService from '../../../services/storage.service.js';
import { validateVideoFile, validateImageFile, getFileExtension } from '../../../utils/upload.js';
import { buildTranscodeRequestedPayload } from '../../../shared/contracts/transcoding.messages.js';
import {
  enqueueTranscodeEncodeJob,
  transcodeJobId,
} from '../../../shared/messaging/transcodeQueues.js';

/**
 * Hand a video to the transcode queue AFTER its PROCESSING state is saved in MongoDB.
 * If Redis is unreachable the request still succeeds: the video stays PROCESSING in the
 * database and the reconciler (transcodeReconciler.js) enqueues it on its next tick.
 */
async function enqueueSavedVideo(payload) {
  try {
    await enqueueTranscodeEncodeJob(payload);
  } catch (err) {
    console.error('[transcode] enqueue failed, reconciler will retry:', payload.videoId, err.message);
  }
}

const presignS3Client = new S3Client({
  region: AWS_CONFIG.region,
  // Without these the presigned upload URL pointed at real AWS even when S3_ENDPOINT
  // (R2, MinIO, ...) was configured, so direct-to-storage uploads could never work there.
  endpoint: AWS_CONFIG.endpoint || undefined,
  forcePathStyle: AWS_CONFIG.forcePathStyle || false,
  credentials:
    AWS_CONFIG.accessKeyId && AWS_CONFIG.secretAccessKey
      ? {
          accessKeyId: AWS_CONFIG.accessKeyId,
          secretAccessKey: AWS_CONFIG.secretAccessKey,
        }
      : undefined,
});

/**
 * Create a new video (multipart): raw to S3 + thumbnail, enqueue multi-bitrate transcode
 */
async function createVideo(videoData, videoFile, thumbnailFile) {
  const { title, description, user_id, category, tags, language, format } = videoData;

  validateVideoFile(videoFile);
  validateImageFile(thumbnailFile);

  if (!AWS_CONFIG.bucketName) {
    throw new Error('S3_BUCKET_NAME is not configured');
  }

  const videoId = createObjectId();
  const ext = getFileExtension(videoFile.filename) || 'mp4';
  const rawKey = `raw-uploads/${user_id}/${videoId.toString()}/source.${ext}`;

  const thumbnailUploadPromise = storageService.uploadThumbnail(thumbnailFile);

  await storageService.uploadStreamToKey(
    rawKey,
    createReadStream(videoFile.filepath),
    videoFile.mimetype || 'video/mp4'
  );
  try {
    await unlink(videoFile.filepath);
  } catch (e) {
    console.warn('Temp video cleanup:', e.message);
  }

  const thumbnailUpload = await thumbnailUploadPromise;
  const tagsArray = tags ? tags.split(',').map(tag => tag.trim()).filter(Boolean) : [];

  const features = videoFeatures({
    category,
    format: format || 'other',
    language: language || 'und',
    tags: tagsArray,
    type: 'video',
  });

  const payload = buildTranscodeRequestedPayload({
    videoId: videoId.toString(),
    rawS3Key: rawKey,
    bucket: AWS_CONFIG.bucketName,
    region: AWS_CONFIG.region,
  });

  const newVideo = new Video({
    _id: videoId,
    title,
    description,
    user_id,
    category,
    language: language || 'und',
    format: format || 'other',
    tags: tagsArray,
    features,
    status: 'PROCESSING',
    rawS3Key: rawKey,
    transcodeJobId: transcodeJobId(videoId.toString()),
    transcodeRequestedAt: new Date(),
    thumbnailUrl: thumbnailUpload.url,
    thumbnailId: thumbnailUpload.key,
    videoUrl: null,
    videoId: null,
    hlsMasterUrl: null,
    hlsMasterKey: null,
    renditions: [],
  });

  const saved = await newVideo.save();
  await enqueueSavedVideo(payload);
  return saved;
}

/**
 * Initiate presigned upload
 */
async function initiateVideoUpload(metadata, userId) {
  const { title, description, category, tags, language, format } = metadata;

  if (!title || !description) {
    throw new ValidationError('Title and description are required');
  }

  if (!AWS_CONFIG.bucketName) {
    throw new Error('S3_BUCKET_NAME is not configured');
  }

  const tagsArray =
    typeof tags === 'string' && tags
      ? tags.split(',').map(t => t.trim()).filter(Boolean)
      : Array.isArray(tags)
        ? tags
        : [];

  const features = videoFeatures({
    category: category || null,
    format: format || 'other',
    language: language || 'und',
    tags: tagsArray,
    type: 'video',
  });

  const videoId = createObjectId();
  const fileKey = `raw-uploads/${userId}/${videoId.toString()}.mp4`;

  const newVideo = new Video({
    _id: videoId,
    title,
    description,
    user_id: userId,
    status: 'PENDING',
    rawS3Key: fileKey,
    videoUrl: null,
    videoId: null,
    thumbnailUrl: null,
    thumbnailId: null,
    category: category || null,
    language: language || 'und',
    format: format || 'other',
    tags: tagsArray,
    features,
  });

  const savedVideo = await newVideo.save();

  const putObjectCommand = new PutObjectCommand({
    Bucket: AWS_CONFIG.bucketName,
    Key: fileKey,
    ContentType: 'video/mp4',
  });

  const uploadUrl = await getSignedUrl(presignS3Client, putObjectCommand, {
    expiresIn: 15 * 60,
  });

  return {
    videoId: savedVideo._id.toString(),
    preSignedUrl: uploadUrl,
  };
}

/**
 * After client PUT to S3, verify object and enqueue transcode
 */
async function completeVideoUpload(videoId, userId) {
  const video = await getVideoById(videoId);

  if ((video.user_id?._id || video.user_id).toString() !== userId.toString()) {
    throw new AuthorizationError('You do not have permission to complete this upload');
  }

  if (!['PENDING', 'UPLOADING'].includes(video.status)) {
    throw new ValidationError('Video is not waiting for upload completion');
  }

  if (!video.rawS3Key) {
    throw new ValidationError('Missing raw upload key');
  }

  await storageService.headObject(video.rawS3Key);

  const payload = buildTranscodeRequestedPayload({
    videoId: video._id.toString(),
    rawS3Key: video.rawS3Key,
    bucket: AWS_CONFIG.bucketName,
    region: AWS_CONFIG.region,
  });

  await Video.findByIdAndUpdate(videoId, {
    $set: {
      status: 'PROCESSING',
      transcodeJobId: transcodeJobId(video._id.toString()),
      transcodeRequestedAt: new Date(),
    },
  });
  await enqueueSavedVideo(payload);

  return {
    message: 'Transcoding started',
    status: 'PROCESSING',
    transcodeJobId: null, // Legacy response slot; queue identifiers are private.
    videoId: video._id.toString(),
  };
}

/**
 * Owner: Bull job + DB status for upload/transcode progress
 */
async function getTranscodeStatus(videoId, userId) {
  const video = await getVideoById(videoId);

  if ((video.user_id?._id || video.user_id).toString() !== userId.toString()) {
    throw new AuthorizationError('You do not have permission to view this status');
  }

  return {
    videoStatus: video.status,
    hlsMasterUrl: video.hlsMasterUrl,
    videoUrl: video.videoUrl,
    transcodeJobId: null,
    jobState: null,
    jobProgress: null,
    processingError: null,
    renditions: (video.renditions || []).map(r => ({ label: r.label, height: r.height, width: r.width, bandwidth: r.bandwidth, playlistUrl: r.playlistUrl, playlistKey: null })),
  };
}

async function getVideoById(videoId) {
  if (!isValidObjectId(videoId)) {
    throw new ValidationError('Invalid video ID');
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new NotFoundError('Video');
  }

  return video;
}

async function getAllVideos(query = {}) {
  const { category, search } = query;
  const filter = {};

  if (category) {
    filter.category = category;
  }

  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  filter.status = 'COMPLETED';
  filter.visibility = { $in: ['public', null] };

  return Video.find(filter)
    .sort({ createdAt: -1 })
    .populate({ path: 'user_id', select: 'name channel', populate: { path: 'channel', select: 'name logoUrl' } });
}

async function updateVideo(videoId, userId, updateData, thumbnailFile = null) {
  const video = await getVideoById(videoId);

  if ((video.user_id?._id || video.user_id)?.toString() !== userId.toString()) {
    throw new AuthorizationError('You do not have permission to update this video');
  }

  if (thumbnailFile) {
    validateImageFile(thumbnailFile);

    if (video.thumbnailId) await storageService.deleteFile(video.thumbnailId);

    const thumbnailUpload = await storageService.uploadThumbnail(thumbnailFile);
    updateData.thumbnailUrl = thumbnailUpload.url;
    updateData.thumbnailId = thumbnailUpload.key;
  }

  if (typeof updateData.tags === 'string') {
    updateData.tags = updateData.tags.split(',').map(tag => tag.trim()).filter(Boolean);
  }

  const nextCategory = updateData.category !== undefined ? updateData.category : video.category;
  const nextFormat = updateData.format !== undefined ? updateData.format : video.format;
  const nextLanguage = updateData.language !== undefined ? updateData.language : video.language;
  const nextTags = updateData.tags !== undefined ? updateData.tags : video.tags;
  const nextStatus = updateData.status !== undefined ? updateData.status : video.status;
  const nextVisibility = updateData.visibility !== undefined ? updateData.visibility : video.visibility;

  updateData.features = videoFeatures({
    category: nextCategory,
    format: nextFormat,
    language: nextLanguage,
    durationSeconds: video.durationSeconds,
    type: video.type,
    tags: nextTags,
  });

  if (!video.publishedAt && needsPublishedAt({ status: nextStatus, visibility: nextVisibility, publishedAt: video.publishedAt })) {
    updateData.publishedAt = new Date();
  }

  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    { $set: updateData },
    { new: true, runValidators: true }
  );

  return updatedVideo;
}

async function deleteVideo(videoId, userId) {
  const video = await getVideoById(videoId);

  if ((video.user_id?._id || video.user_id)?.toString() !== userId.toString()) {
    throw new AuthorizationError('You do not have permission to delete this video');
  }

  await storageService.deletePrefix(`videos/${videoId}/hls/`);

  if (video.rawS3Key) {
    await storageService.deleteFile(video.rawS3Key);
  }
  if (video.thumbnailId) {
    await storageService.deleteFile(video.thumbnailId);
  }
  if (video.hlsMasterKey) {
    await storageService.deleteFile(video.hlsMasterKey);
  }
  if (video.videoId && video.videoId !== video.hlsMasterKey) {
    await storageService.deleteFile(video.videoId);
  }

  await Video.findByIdAndDelete(videoId);
}

async function toggleLike(videoId, userId) {
  const video = await getVideoById(videoId);

  const userIdStr = userId.toString();
  const isLiked = video.likedBy.some(id => id.toString() === userIdStr);
  const isDisliked = video.dislikedBy.some(id => id.toString() === userIdStr);

  if (isLiked) {
    video.likedBy.pull(userId);
    video.likes--;
    await video.save();
    return { action: 'unliked', likes: video.likes };
  } else {
    if (isDisliked) {
      video.dislikedBy.pull(userId);
      video.dislikes--;
    }

    video.likedBy.push(userId);
    video.likes++;
    await video.save();
    eventsService.recordAction({ userId, type: 'like', videoId }).catch(() => {});
    return { action: 'liked', likes: video.likes };
  }
}

async function toggleDislike(videoId, userId) {
  const video = await getVideoById(videoId);

  const userIdStr = userId.toString();
  const isDisliked = video.dislikedBy.some(id => id.toString() === userIdStr);
  const isLiked = video.likedBy.some(id => id.toString() === userIdStr);

  if (isDisliked) {
    video.dislikedBy.pull(userId);
    video.dislikes--;
    await video.save();
    return { action: 'undisliked', dislikes: video.dislikes };
  } else {
    if (isLiked) {
      video.likedBy.pull(userId);
      video.likes--;
    }

    video.dislikedBy.push(userId);
    video.dislikes++;
    await video.save();
    return { action: 'disliked', dislikes: video.dislikes };
  }
}

async function setReaction(videoId, userId, reaction) {
  if (!['like', 'dislike'].includes(reaction)) throw new ValidationError('Reaction must be like or dislike');
  const video = await getVideoById(videoId);
  const userIdString = userId.toString();
  const wasLiked = video.likedBy.some(id => id.toString() === userIdString);
  const wasDisliked = video.dislikedBy.some(id => id.toString() === userIdString);
  video.likedBy.pull(userId);
  video.dislikedBy.pull(userId);
  if (reaction === 'like') {
    video.likedBy.addToSet(userId);
    if (!wasLiked) {
      video.likes = (video.likes || 0) + 1;
      eventsService.recordAction({ userId, type: 'like', videoId }).catch(() => {});
    }
    if (wasDisliked) video.dislikes = Math.max(0, (video.dislikes || 0) - 1);
  } else {
    video.dislikedBy.addToSet(userId);
    if (!wasDisliked) video.dislikes = (video.dislikes || 0) + 1;
    if (wasLiked) video.likes = Math.max(0, (video.likes || 0) - 1);
  }
  await video.save();
  return { reaction, likes: video.likes, dislikes: video.dislikes };
}

async function clearReaction(videoId, userId) {
  const video = await getVideoById(videoId);
  const userIdString = userId.toString();
  const wasLiked = video.likedBy.some(id => id.toString() === userIdString);
  const wasDisliked = video.dislikedBy.some(id => id.toString() === userIdString);
  video.likedBy.pull(userId);
  video.dislikedBy.pull(userId);
  if (wasLiked) video.likes = Math.max(0, (video.likes || 0) - 1);
  if (wasDisliked) video.dislikes = Math.max(0, (video.dislikes || 0) - 1);
  await video.save();
  return { reaction: null, likes: video.likes, dislikes: video.dislikes };
}

export {
  getMyVideos,
  createVideo,
  initiateVideoUpload,
  completeVideoUpload,
  getTranscodeStatus,
  getAllVideos,
  getVideoById,
  updateVideo,
  deleteVideo,
  toggleLike,
  toggleDislike,
  setReaction,
  clearReaction,
};

export default {
  getMyVideos,
  createVideo,
  initiateVideoUpload,
  completeVideoUpload,
  getTranscodeStatus,
  getAllVideos,
  getVideoById,
  updateVideo,
  deleteVideo,
  toggleLike,
  toggleDislike,
  setReaction,
  clearReaction,
};
