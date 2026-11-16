/**
 * User Controller
 * Handles HTTP request/response for user endpoints
 */

import userService from '../services/user.service.js';

/**
 * Handle subscribe to channel
 * @param {FastifyRequest} request - Fastify request
 * @param {FastifyReply} reply - Fastify reply
 */
async function subscribe(request, reply) {
  const { channelId } = request.params;
  const userId = request.userId;

  await userService.subscribeToChannel(userId, channelId);

  return reply.status(200).send({
    message: 'Subscribed to channel successfully',
  });
}

/**
 * Handle unsubscribe from channel
 * @param {FastifyRequest} request - Fastify request
 * @param {FastifyReply} reply - Fastify reply
 */
async function unsubscribe(request, reply) {
  const { channelId } = request.params;
  const userId = request.userId;

  await userService.unsubscribeFromChannel(userId, channelId);

  return reply.status(200).send({
    message: 'Unsubscribed from channel successfully',
  });
}

async function me(request, reply) {
  const profile = await userService.getUserSummary(request.userId);
  return reply.status(200).send({ user: profile });
}

export {
  subscribe,
  unsubscribe,
  me,
};

async function updateProfile(request, reply) {
  return reply.send({ message: 'Profile updated successfully', user: await userService.updateProfile(request.userId, request.body) });
}
async function changePassword(request, reply) {
  await userService.changePassword(request.userId, request.body.currentPassword, request.body.newPassword);
  return reply.send({ message: 'Password changed successfully' });
}
async function deleteAccount(request, reply) {
  await userService.deleteAccount(request.userId, request.body.password);
  return reply.send({ message: 'Account deleted successfully' });
}

export default {
  updateProfile, changePassword, deleteAccount,
  subscribe,
  unsubscribe,
  me,
};

