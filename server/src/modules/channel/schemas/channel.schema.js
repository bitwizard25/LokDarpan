
/**
 * Channel Schema
 */

import mongoose from 'mongoose';
import { COLLECTIONS } from '../../../config/collections.js';

const channelSchema = new mongoose.Schema(
    {
        _id: mongoose.Schema.Types.ObjectId,
        name: { type: String, required: true, unique: true },
        handle: { type: String, match: /^[a-z0-9_]{3,30}$/ },
        description: { type: String, maxlength: 1000 },
        avatarUrl: { type: String },
        bannerUrl: { type: String },
        logoUrl: { type: String, required: true },
        logoId: { type: String, required: true }, // S3/Storage ID
        owner: { type: mongoose.Schema.Types.ObjectId, ref: COLLECTIONS.USER, required: true, unique: true },
        subscribers: { type: Number, default: 0 },
        subscribersList: [{ type: mongoose.Schema.Types.ObjectId, ref: COLLECTIONS.USER }],
    },
    { timestamps: true }
);

// A partial index allows existing channels without handles to keep working.
channelSchema.index({ handle: 1 }, { unique: true, partialFilterExpression: { handle: { $type: 'string' } } });

// Prevent re-compiling model if it already exists
const Channel = mongoose.models[COLLECTIONS.CHANNEL] || mongoose.model(COLLECTIONS.CHANNEL, channelSchema);

export default Channel;
