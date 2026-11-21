/**
 * Comment Service
 * Handles comment-related business logic
 */

import Comment from '../schemas/comment.schema.js';
import Video from '../../video/schemas/video.schema.js';
import { NotFoundError, ValidationError, AuthorizationError } from '../../../utils/errors.js';
import { isValidObjectId, createObjectId } from '../../../utils/db.js';
import { pageOptions, pageResult } from '../../../shared/http/pagination.js';

async function listComments(videoId, query = {}) {
  if (!isValidObjectId(videoId)) throw new ValidationError('Invalid video ID');
  if (!await Video.exists({ _id: videoId })) throw new NotFoundError('Video');
  const { limit, after } = pageOptions(query);
  const filter = { video_id: videoId, ...(after ? { _id: { $lt: after } } : {}) };
  const rows = await Comment.find(filter).sort({ _id: -1 }).limit(limit + 1)
    .populate('user_id', 'name avatarUrl').lean();
  return pageResult(rows, limit, row => ({
    id: String(row._id), _id: String(row._id), video_id: String(row.video_id),
    user: row.user_id ? { id: String(row.user_id._id), name: row.user_id.name, avatarUrl: row.user_id.avatarUrl || null } : null,
    user_id: row.user_id ? String(row.user_id._id) : null,
    comment_text: row.comment_text, createdAt: row.createdAt, updatedAt: row.updatedAt,
  }));
}

/**
 * Create a new comment
 * @param {string} videoId - Video ID
 * @param {string} userId - User ID (commenter)
 * @param {string} commentText - Comment text
 * @returns {Promise<Object>} Created comment
 */
async function createComment(videoId, userId, commentText) {
  if (!isValidObjectId(videoId)) {
    throw new ValidationError('Invalid video ID');
  }

  if (!isValidObjectId(userId)) {
    throw new ValidationError('Invalid user ID');
  }

  // Check if video exists
  const video = await Video.findById(videoId);
  if (!video) {
    throw new NotFoundError('Video');
  }

  // Create comment
  const newComment = new Comment({
    _id: createObjectId(),
    user_id: userId,
    video_id: videoId,
    comment_text: commentText,
  });

  const savedComment = await newComment.save();

  // Add comment to video
  video.comments.push(savedComment._id);
  await video.save();

  return savedComment;
}

/**
 * Get comment by ID
 * @param {string} commentId - Comment ID
 * @returns {Promise<Object>} Comment object
 */
async function getCommentById(commentId) {
  if (!isValidObjectId(commentId)) {
    throw new ValidationError('Invalid comment ID');
  }

  const comment = await Comment.findById(commentId);

  if (!comment) {
    throw new NotFoundError('Comment');
  }

  return comment;
}

/**
 * Update comment
 * @param {string} commentId - Comment ID
 * @param {string} userId - User ID (must be owner)
 * @param {string} commentText - New comment text
 * @returns {Promise<Object>} Updated comment
 */
async function updateComment(commentId, userId, commentText) {
  const comment = await getCommentById(commentId);

  // Check ownership
  if (comment.user_id.toString() !== userId.toString()) {
    throw new AuthorizationError('You do not have permission to update this comment');
  }

  // Update comment
  comment.comment_text = commentText;
  const updatedComment = await comment.save();

  return updatedComment;
}

/**
 * Delete comment
 * @param {string} commentId - Comment ID
 * @param {string} userId - User ID (must be owner)
 * @returns {Promise<void>}
 */
async function deleteComment(commentId, userId) {
  const comment = await getCommentById(commentId);

  // Check ownership
  if (comment.user_id.toString() !== userId.toString()) {
    throw new AuthorizationError('You do not have permission to delete this comment');
  }

  // Remove comment from video
  const video = await Video.findById(comment.video_id);
  if (video) {
    video.comments.pull(commentId);
    await video.save();
  }

  // Delete comment
  await Comment.findByIdAndDelete(commentId);
}

export {
  listComments,
  createComment,
  getCommentById,
  updateComment,
  deleteComment,
};

export default {
  listComments,
  createComment,
  getCommentById,
  updateComment,
  deleteComment,
};

