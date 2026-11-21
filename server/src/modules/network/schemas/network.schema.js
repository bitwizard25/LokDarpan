import mongoose from 'mongoose';
import { COLLECTIONS } from '../../../config/collections.js';

const memberSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: COLLECTIONS.USER, required: true },
    role: { type: String, enum: ['member', 'admin'], default: 'member' },
    status: { type: String, enum: ['pending', 'active', 'removed'], default: 'pending' },
    joinedAt: { type: Date },
  },
  { _id: false }
);

const networkSchema = new mongoose.Schema(
  {
    _id: mongoose.Schema.Types.ObjectId,
    name: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, trim: true, maxlength: 500 },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: COLLECTIONS.USER, required: true },
    visibility: { type: String, enum: ['private', 'invite_only'], default: 'private' },
    members: { type: [memberSchema], default: [] },
  },
  { timestamps: true }
);

networkSchema.index({ owner: 1, name: 1 }, { unique: true });
networkSchema.index({ 'members.user': 1, 'members.status': 1 });

export default mongoose.models[COLLECTIONS.NETWORK] || mongoose.model(COLLECTIONS.NETWORK, networkSchema);
