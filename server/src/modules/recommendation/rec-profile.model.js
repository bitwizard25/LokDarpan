import mongoose from 'mongoose';
import { REC } from './rec.config.js';

const explicitKeySchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    weight: { type: Number, required: true },
    source: { type: String, enum: ['onboarding', 'tune', 'hint'], default: 'tune' },
  },
  { _id: false }
);

const excludedKeySchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
  },
  { _id: false }
);

const onboardingSchema = new mongoose.Schema(
  {
    version: { type: String, default: 'v1' },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date },
    answers: { type: mongoose.Schema.Types.Mixed },
    pickedVideoIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Video' }],
  },
  { _id: false }
);

const recProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    personalizationEnabled: {
      type: Boolean,
      default: false,
    },
    languages: [
      {
        type: String,
        enum: REC.languages,
      },
    ],
    discovery: {
      type: String,
      enum: ['low', 'balanced', 'high'],
      default: 'balanced',
    },
    explicit: [explicitKeySchema],
    excluded: [excludedKeySchema],
    hiddenCreators: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    notInterested: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Video',
      },
    ],
    onboarding: {
      type: onboardingSchema,
      default: () => ({ version: 'v1', completed: false }),
    },
  },
  {
    timestamps: true,
  }
);

export const RecProfile =
  mongoose.models.RecProfile || mongoose.model('RecProfile', recProfileSchema);

export default RecProfile;
