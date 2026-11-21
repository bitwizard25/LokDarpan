/**
 * Manual identity-verification request: used when DigiLocker is not configured.
 * One row per submission; the user's `identityVerification.verifiedAt` is only set
 * when an admin approves.
 */
import mongoose from 'mongoose';
import { COLLECTIONS } from '../../config/collections.js';

// Masked Aadhaar only: collecting full Aadhaar copies is restricted in India.
export const DOCUMENT_TYPES = ['passport', 'driving_licence', 'voter_id', 'pan', 'aadhaar_masked'];

const verificationRequestSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: COLLECTIONS.USER, required: true },
    provider: { type: String, enum: ['manual'], default: 'manual' },
    legalName: { type: String, required: true, trim: true, maxlength: 100 },
    documentType: { type: String, enum: DOCUMENT_TYPES, required: true },
    // Private S3 key. Never selected by default and never sent to a client.
    documentKey: { type: String, required: true, select: false },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
    submittedAt: { type: Date, default: Date.now },
    reviewedAt: { type: Date },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: COLLECTIONS.USER },
    rejectionReason: { type: String, maxlength: 500 },
  },
  { timestamps: true },
);

// Latest-request lookup per user (status screen).
verificationRequestSchema.index({ user_id: 1, submittedAt: -1 });
// A user can have only one request waiting for review at a time.
verificationRequestSchema.index({ user_id: 1 }, { unique: true, partialFilterExpression: { status: 'pending' } });

const VerificationRequest =
  mongoose.models[COLLECTIONS.VERIFICATION_REQUEST] ||
  mongoose.model(COLLECTIONS.VERIFICATION_REQUEST, verificationRequestSchema);

export default VerificationRequest;
