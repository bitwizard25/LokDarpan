import Video from '../../video/schemas/video.schema.js';
import { listStudioVideos } from '../../video/services/studio-video.service.js';
import { AppError } from '../../../utils/errors.js';
import { isValidObjectId } from '../../../utils/db.js';

/**
 * Channel Service
 * Handles channel business logic
 */

import Channel from '../schemas/channel.schema.js';
import User from '../../auth/schemas/user.schema.js';
import { createObjectId } from '../../../utils/db.js';
import { ValidationError, NotFoundError, AuthorizationError } from '../../../utils/errors.js';

/**
 * Check if channel name exists
 * @param {string} name - Channel name
 * @returns {Promise<boolean>}
 */
async function channelNameExists(name) {
    const channel = await Channel.findOne({ name });
    return !!channel;
}

/**
 * Get channel by owner ID
 * @param {string} ownerId - User ID
 * @returns {Promise<Object>} Channel object
 */
async function getChannelByOwner(ownerId) {
    return Channel.findOne({ owner: ownerId });
}

/**
 * Create a new channel
 * @param {Object} channelData - Channel data
 * @param {string} channelData.name - Channel name
 * @param {string} channelData.description - Channel description
 * @param {string} channelData.logoUrl - Logo URL
 * @param {string} channelData.logoId - Logo S3 key
 * @param {string} channelData.owner - Owner User ID
 * @returns {Promise<Object>} Created channel
 */
async function createChannel(channelData) {
    const { name, description, logoUrl, logoId, owner } = channelData;

    const creator = await User.findById(owner).select('identityVerification.verifiedAt');
    if (!creator) throw new NotFoundError('User');
    if (!creator.identityVerification?.verifiedAt) {
        throw new AuthorizationError('Verify your identity before creating a channel');
    }

    // Check if user already has a channel
    const existingChannel = await getChannelByOwner(owner);
    if (existingChannel) {
        throw new ValidationError('User already has a channel');
    }

    // Check if channel name already exists
    if (await channelNameExists(name)) {
        throw new ValidationError('Channel name already exists');
    }

    // Create channel
    const id = createObjectId();
    const newChannel = new Channel({
        _id: id,
        handle: `c_${id}`,
        name,
        description,
        logoUrl,
        logoId,
        owner,
    });

    const savedChannel = await newChannel.save();

    try {
        // Update user with channel reference
        await User.findByIdAndUpdate(owner, { channel: savedChannel._id });
    } catch (error) {
        // Rollback: delete the created channel if user update fails
        await Channel.findByIdAndDelete(savedChannel._id);
        throw error;
    }

    return safeChannel(savedChannel);
}


export function channelHandle(channel) {
    return channel.handle || `c_${channel._id}`;
}

export function safeChannel(channel) {
    const c = channel.toObject ? channel.toObject() : channel;
    return { _id: c._id, id: String(c._id), name: c.name, handle: channelHandle(c),
        description: c.description || '', logoUrl: c.avatarUrl || c.logoUrl || null,
        avatarUrl: c.avatarUrl || c.logoUrl || null, bannerUrl: c.bannerUrl || null,
        subscribers: c.subscribers || 0, createdAt: c.createdAt };
}

async function resolveChannel(identifier) {
    const choices = [{ handle: identifier }];
    if (isValidObjectId(identifier)) choices.push({ _id: identifier });
    if (/^c_[a-f0-9]{24}$/.test(identifier)) choices.push({ _id: identifier.slice(2), handle: { $exists: false } });
    const channel = await Channel.findOne({ $or: choices });
    if (!channel) throw new NotFoundError('Channel');
    return channel;
}

async function getPublicChannel(identifier, viewerId) {
    const channel = await resolveChannel(identifier);
    const publicVideos = { user_id: channel.owner, status: 'COMPLETED', visibility: { $in: ['public', null] } };
    const [subscriberCount, videoCount, views, viewer] = await Promise.all([
        User.countDocuments({ subscribedChannels: channel._id }),
        Video.countDocuments(publicVideos),
        Video.aggregate([{ $match: publicVideos }, { $group: { _id: null, total: { $sum: '$views' } } }]),
        viewerId ? User.findById(viewerId).select('subscribedChannels').lean() : null,
    ]);
    const isOwner = Boolean(viewerId && String(channel.owner) === String(viewerId));
    const isSubscribed = Boolean(viewer?.subscribedChannels?.some(id => String(id) === String(channel._id)));
    return { ...safeChannel(channel), subscribers: subscriberCount, subscriberCount, videoCount,
        totalVideos: videoCount, totalViews: views[0]?.total || 0, isOwner, isSubscribed,
        viewer: { isOwner, isSubscribed } };
}

async function getChannelVideos(identifier, query) {
    const channel = await resolveChannel(identifier);
    const result = await listStudioVideos({ user_id: channel.owner, status: 'COMPLETED', visibility: { $in: ['public', null] } }, query);
    result.items = result.items.map(video => ({ ...video,
        channel: { id: String(channel._id), name: channel.name, avatarUrl: channel.avatarUrl || channel.logoUrl || null } }));
    return { ...result, videos: result.items };
}

async function updateMyChannel(owner, data) {
    const channel = await getChannelByOwner(owner);
    if (!channel) throw new NotFoundError('Channel');
    if (data.handle) {
        const choices = [{ handle: data.handle }];
        if (isValidObjectId(data.handle)) choices.push({ _id: data.handle });
        if (/^c_[a-f0-9]{24}$/.test(data.handle)) choices.push({ _id: data.handle.slice(2), handle: { $exists: false } });
        const conflict = await Channel.findOne({ _id: { $ne: channel._id }, $or: choices });
        if (conflict) throw new AppError('Channel handle already exists', 409);
    }
    const update = { ...data };
    if (data.avatarUrl !== undefined) update.logoUrl = data.avatarUrl;
    try {
        const updated = await Channel.findByIdAndUpdate(channel._id, { $set: update }, { new: true, runValidators: true });
        if (!updated) throw new NotFoundError('Channel');
        return safeChannel(updated);
    } catch (error) {
        if (error.code === 11000) throw new AppError('Channel name or handle already exists', 409);
        throw error;
    }
}

async function deleteMyChannel(owner, confirmHandle) {
    const channel = await getChannelByOwner(owner);
    if (!channel) throw new NotFoundError('Channel');
    if (confirmHandle !== channelHandle(channel)) throw new ValidationError('Channel handle confirmation does not match');
    // Retain assets and processing state. Completion cannot make these videos public again.
    await Video.updateMany({ user_id: owner }, { $set: { visibility: 'private' } });
    await User.updateMany({ subscribedChannels: channel._id }, { $pull: { subscribedChannels: channel._id } });
    await User.updateOne({ _id: owner }, { $unset: { channel: 1 } });
    await Channel.findByIdAndDelete(channel._id);
}

export default {
    getPublicChannel,
    getChannelVideos,
    updateMyChannel,
    deleteMyChannel,
    createChannel,
    getChannelByOwner,
    channelNameExists
};
