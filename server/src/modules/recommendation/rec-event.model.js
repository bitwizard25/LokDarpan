import mongoose from 'mongoose';
import { REC } from './rec.config.js';

export const REC_EVENT_TYPES = [
  'impression',
  'click',
  'play_start',
  'watch_progress',
  'play_end',
  'view',
  'like',
  'save',
  'not_interested',
];

export const REC_CLIENT_EVENT_TYPES = [
  'impression',
  'click',
  'play_start',
  'watch_progress',
  'play_end',
  'view',
];

export const REC_SURFACES = [
  'home',
  'related',
  'search',
  'channel',
  'shorts',
  'other',
];

export const REC_SOURCES = [
  'interest',
  'following',
  'trending',
  'fresh',
  'explore',
  'related',
  'none',
];

const recEventSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
    },
    type: {
      type: String,
      enum: REC_EVENT_TYPES,
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    sessionId: {
      type: String,
      required: true,
    },
    video: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Video',
      required: true,
    },
    surface: {
      type: String,
      enum: REC_SURFACES,
      default: 'other',
    },
    requestId: {
      type: String,
      maxlength: 64,
    },
    position: {
      type: Number,
      min: 0,
      max: 199,
    },
    source: {
      type: String,
      enum: REC_SOURCES,
    },
    watchSeconds: {
      type: Number,
      min: 0,
      max: 15,
    },
    positionSeconds: {
      type: Number,
      min: 0,
    },
    dedupeKey: {
      type: String,
      index: {
        unique: true,
        sparse: true,
      },
    },
    policy: {
      type: String,
      default: REC.policyVersion,
    },
    clientTs: {
      type: Date,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Indexes
// Note: eventId unique is already on field definition or via index
recEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });
recEventSchema.index({ video: 1, type: 1, createdAt: -1 });
recEventSchema.index(
  { user: 1, createdAt: -1 },
  { partialFilterExpression: { user: { $type: 'objectId' } } }
);

const RecEvent = mongoose.models.RecEvent || mongoose.model('RecEvent', recEventSchema);

export default RecEvent;
