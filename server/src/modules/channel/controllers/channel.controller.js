import { safeChannel } from '../services/channel.service.js';

/**
 * Channel Controller
 * Handles HTTP request/response for channel endpoints
 */

import channelService from '../services/channel.service.js';
import storageService from '../../../services/storage.service.js';
import { validateImageFile } from '../../../utils/upload.js';

/**
 * Handle channel creation
 * @param {FastifyRequest} request - Fastify request
 * @param {FastifyReply} reply - Fastify reply
 */
async function createChannel(request, reply) {
    // Parse multipart form data
    const parts = request.parts();
    const data = {};
    let logoFile = null;

    for await (const part of parts) {
        if (part.file) {
            // It's a file
            if (part.fieldname === 'logo') {
                logoFile = part;
            }
        } else {
            // It's a field
            data[part.fieldname] = part.value;
        }
    }

    const { name, description } = data;

    if (!logoFile) {
        return reply.status(400).send({
            error: {
                message: 'Logo file is required',
            },
        });
    }

    // Validate logo file
    validateImageFile(logoFile);

    // Upload logo to S3
    const logoUpload = await storageService.uploadLogo(logoFile);

    // Create channel
    const channel = await channelService.createChannel({
        name,
        description,
        logoUrl: logoUpload.url,
        logoId: logoUpload.key,
        owner: request.userId,
    });

    return reply.status(201).send({
        message: 'Channel created successfully',
        channel,
    });
}

/**
 * Get my channel
 * @param {FastifyRequest} request - Fastify request
 * @param {FastifyReply} reply - Fastify reply
 */
async function getMyChannel(request, reply) {
    const channel = await channelService.getChannelByOwner(request.userId);

    if (!channel) {
        return reply.status(404).send({
            error: {
                message: 'Channel not found',
            }
        });
    }

    return reply.status(200).send({
        channel: safeChannel(channel)
    });
}

async function getPublicChannel(request, reply) {
    return reply.send({ channel: await channelService.getPublicChannel(request.params.channelId, request.userId) });
}
async function getChannelVideos(request, reply) {
    return reply.send(await channelService.getChannelVideos(request.params.channelId, request.query));
}
async function updateMyChannel(request, reply) {
    return reply.send({ message: 'Channel updated successfully', channel: await channelService.updateMyChannel(request.userId, request.body) });
}
async function deleteMyChannel(request, reply) {
    await channelService.deleteMyChannel(request.userId, request.body.confirmHandle);
    return reply.send({ message: 'Channel deleted successfully' });
}

export default {
    getPublicChannel, getChannelVideos, updateMyChannel, deleteMyChannel,
    createChannel,
    getMyChannel
};
