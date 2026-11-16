/**
 * Video Schema
 */

import mongoose from 'mongoose';
import { COLLECTIONS } from '../../../config/collections.js';
import { REC } from '../../recommendation/rec.config.js';

const renditionSchema = new mongoose.Schema(
  {
    label: { type: String },
    height: { type: Number },
    width: { type: Number },
    bandwidth: { type: Number },
    playlistUrl: { type: String },
    playlistKey: { type: String },
  },
  { _id: false }
);

const videoSchema = new mongoose.Schema(
  {
    _id: mongoose.Schema.Types.ObjectId,
    title: { type: String, required: true },
    type: { type: String, enum: ['video', 'short'], default: 'video' },
    visibility: { type: String, enum: ['public', 'unlisted', 'private'], default: 'public' },
    description: { type: String, required: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: COLLECTIONS.USER, required: true },
    status: {
      type: String,
      enum: ['PENDING', 'PENDING_METADATA', 'UPLOADING', 'PROCESSING', 'COMPLETED', 'FAILED'],
      default: 'PENDING',
    },
    videoUrl: { type: String, required: false },
    videoId: { type: String, required: false },
    hlsMasterUrl: { type: String, required: false },
    hlsMasterKey: { type: String, required: false },
    renditions: { type: [renditionSchema], default: [] },
    rawS3Key: { type: String, required: false },
    thumbnailUrl: { type: String, required: false },
    thumbnailId: { type: String, required: false },
    transcodeJobId: { type: String, required: false },
    // When the encode job was last handed to the queue, and how many times the
    // reconciler had to re-enqueue it. MongoDB is the source of truth for job state.
    transcodeRequestedAt: { type: Date, required: false },
    transcodeAttempts: { type: Number, default: 0 },
    processingError: { type: String, required: false },
    durationSeconds: { type: Number, required: false },
    language: {
      type: String,
      enum: [...REC.languages, 'und'],
      default: 'und',
    },
    format: {
      type: String,
      enum: REC.formats,
      default: 'other',
    },
    publishedAt: {
      type: Date,
      required: false,
    },
    features: [{ type: String }],
    stats: {
      impressions7d: { type: Number, default: 0 },
      plays7d: { type: Number, default: 0 },
      views7d: { type: Number, default: 0 },
      watchSeconds7d: { type: Number, default: 0 },
      trending: { type: Number, default: 0 },
      updatedAt: { type: Date, required: false },
    },
    category: { type: String, required: false },
    tags: [{ type: String }],
    likes: { type: Number, default: 0 },
    dislikes: { type: Number, default: 0 },
    likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: COLLECTIONS.USER }],
    dislikedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: COLLECTIONS.USER }],
    comments: [{ type: mongoose.Schema.Types.ObjectId, ref: COLLECTIONS.COMMENT }],
    views: { type: Number, default: 0 },
    viewedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: COLLECTIONS.USER }],
  },
  { timestamps: true }
);

videoSchema.index({ status: 1, type: 1, publishedAt: -1 });
videoSchema.index({ features: 1, publishedAt: -1 });
videoSchema.index({ 'stats.trending': -1, _id: -1 });
videoSchema.index({ user_id: 1, publishedAt: -1 });

// Prevent re-compiling model if it already exists
const Video = mongoose.models[COLLECTIONS.VIDEO] || mongoose.model(COLLECTIONS.VIDEO, videoSchema);

export default Video;

