import Video from '../../video/schemas/video.schema.js';
import channelService, { channelHandle } from '../../channel/services/channel.service.js';
import { hashPassword, comparePassword } from '../../auth/services/auth.service.js';
import { AuthenticationError } from '../../../utils/errors.js';
import { SavedVideo, WatchHistory, Playlist } from '../../library/library.models.js';
/**
 * User Service
 * Handles user-related business logic (subscriptions, profile)
 */

import User from '../schemas/user.schema.js';
import Channel from '../../channel/schemas/channel.schema.js';
import Network from '../../network/schemas/network.schema.js';
import { NotFoundError, ValidationError } from '../../../utils/errors.js';
import { isAdminEmail } from '../../verification/admin.js';
import { isValidObjectId } from '../../../utils/db.js';

/**
 * Get user by ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User object
 */
async function getUserById(userId) {
  if (!isValidObjectId(userId)) {
    throw new ValidationError('Invalid user ID');
  }

  const user = await User.findById(userId).select('-password');

  if (!user) {
    throw new NotFoundError('User');
  }

  return user;
}

async function getUserSummary(userId) {
  if (!isValidObjectId(userId)) {
    throw new ValidationError('Invalid user ID');
  }

  const user = await User.findById(userId).select('_id name email phone bio avatarUrl channel identityVerification.verifiedAt');
  // isAdmin is a UI hint only; every admin route re-checks on the server.
  if (!user) {
    throw new NotFoundError('User');
  }

  const [channel, createdNetworksCount, memberNetworksCount] = await Promise.all([
    user.channel ? Channel.findById(user.channel).select('_id name logoUrl') : null,
    Network.countDocuments({ owner: user._id }),
    Network.countDocuments({ owner: { $ne: user._id }, members: { $elemMatch: { user: user._id, status: 'active' } } }),
  ]);

  return {
    _id: user._id,
    name: user.name,
    displayName: user.name,
    bio: user.bio || '',
    avatarUrl: user.avatarUrl || null,
    email: user.email,
    phone: user.phone,
    avatarUrl: user.avatarUrl || null,
    identityVerified: Boolean(user.identityVerification?.verifiedAt),
    isAdmin: isAdminEmail(user.email),
    hasChannel: Boolean(channel),
    channelId: channel?._id || null,
    channel: channel || null,
    createdNetworksCount,
    memberNetworksCount,
  };
}

/**
 * Subscribe to a channel
 * @param {string} subscriberId - User ID of subscriber
 * @param {string} channelId - Channel ID to subscribe to
 * @returns {Promise<void>}
 */
async function subscribeToChannel(subscriberId, channelId) {
  if (!isValidObjectId(subscriberId) || !isValidObjectId(channelId)) {
    throw new ValidationError('Invalid user or channel ID');
  }

  // Get the subscriber and the channel being followed.
  const subscriber = await User.findById(subscriberId);
  const channel = await Channel.findById(channelId);

  if (!subscriber) {
    throw new NotFoundError('Subscriber');
  }

  if (!channel) {
    throw new NotFoundError('Channel');
  }

  if (channel.owner.toString() === subscriberId.toString()) {
    throw new ValidationError('Cannot subscribe to your own channel');
  }

  // Check if already subscribed
  if (subscriber.subscribedChannels.includes(channelId)) {
    throw new ValidationError('Already subscribed to this channel');
  }

  // Add channel to subscriber's list
  subscriber.subscribedChannels.push(channelId);
  await subscriber.save();

  // Increment channel's subscriber count
  channel.subscribers++;
  await channel.save();
}

/**
 * Unsubscribe from a channel
 * @param {string} subscriberId - User ID of subscriber
 * @param {string} channelId - Channel ID to unsubscribe from
 * @returns {Promise<void>}
 */
async function unsubscribeFromChannel(subscriberId, channelId) {
  if (!isValidObjectId(subscriberId) || !isValidObjectId(channelId)) {
    throw new ValidationError('Invalid user or channel ID');
  }

  // Get the subscriber and the channel being followed.
  const subscriber = await User.findById(subscriberId);
  const channel = await Channel.findById(channelId);

  if (!subscriber) {
    throw new NotFoundError('Subscriber');
  }

  if (!channel) {
    throw new NotFoundError('Channel');
  }

  // Check if subscribed
  if (!subscriber.subscribedChannels.includes(channelId)) {
    throw new ValidationError('Not subscribed to this channel');
  }

  // Remove channel from subscriber's list
  subscriber.subscribedChannels.pull(channelId);
  await subscriber.save();

  // Decrement channel's subscriber count
  if (channel.subscribers > 0) {
    channel.subscribers--;
    await channel.save();
  }
}

async function updateProfile(userId, data) {
  const update = {};
  if (data.name !== undefined) update.name = data.name;
  if (data.displayName !== undefined) update.name = data.displayName;
  if (data.bio !== undefined) update.bio = data.bio;
  if (data.avatarUrl !== undefined) update.avatarUrl = data.avatarUrl;
  const user = await User.findByIdAndUpdate(userId, { $set: update }, { new: true, runValidators: true }).select('_id name email bio avatarUrl');
  if (!user) throw new NotFoundError('User');
  return getUserSummary(userId);
}

async function verifyPassword(userId, password) {
  const user = await User.findById(userId).select('password');
  if (!user) throw new NotFoundError('User');
  if (!user.password || !await comparePassword(password, user.password)) throw new AuthenticationError('Current password is incorrect');
  return user;
}

async function changePassword(userId, currentPassword, newPassword) {
  if (typeof newPassword !== 'string' || newPassword.length < 6) throw new ValidationError('New password must be at least 6 characters');
  await verifyPassword(userId, currentPassword);
  await User.findByIdAndUpdate(userId, { $set: { password: await hashPassword(newPassword) } });
}

async function deleteAccount(userId, password) {
  await verifyPassword(userId, password);
  const channel = await channelService.getChannelByOwner(userId);
  if (channel) await channelService.deleteMyChannel(userId, channelHandle(channel));
  else await Video.updateMany({ user_id: userId }, { $set: { visibility: 'private' } });
  await SavedVideo.deleteMany({ user: userId });
  await WatchHistory.deleteMany({ user: userId });
  await Playlist.deleteMany({ owner: userId });
  await Network.deleteMany({ owner: userId });
  await Network.updateMany({ 'members.user': userId }, { $pull: { members: { user: userId } } });
  await User.findByIdAndDelete(userId);
}

export {
  updateProfile, changePassword, deleteAccount,
  getUserById,
  getUserSummary,
  subscribeToChannel,
  unsubscribeFromChannel,
};

export default {
  updateProfile, changePassword, deleteAccount,
  getUserById,
  getUserSummary,
  subscribeToChannel,
  unsubscribeFromChannel,
};

