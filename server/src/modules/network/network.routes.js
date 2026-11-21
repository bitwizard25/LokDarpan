import Network from './schemas/network.schema.js';
import Invitation from './schemas/invitation.schema.js';
import User from '../auth/schemas/user.schema.js';
import { objectId, pageOptions, pageResult, safeText } from '../../shared/http/pagination.js';
import { NotFoundError, AuthorizationError, ValidationError } from '../../utils/errors.js';

async function access(id, userId, manage = false) {
  const network = await Network.findById(objectId(id, 'network ID'));
  if (!network) throw new NotFoundError('Network');
  const owner = String(network.owner) === userId;
  const member = network.members.find(m => String(m.user) === userId && m.status === 'active');
  if (!owner && (!member || (manage && member.role !== 'admin'))) throw new AuthorizationError('Network access denied');
  return network;
}

function summary(network, userId) {
  return { id: String(network._id), name: network.name, description: network.description || '',
    owner: String(network.owner), visibility: network.visibility, isOwner: String(network.owner) === userId,
    role: String(network.owner) === userId ? 'owner' : network.members.find(m => String(m.user) === userId)?.role,
    memberCount: network.members.filter(m => m.status === 'active').length,
    createdAt: network.createdAt };
}

export default async function networkMembershipRoutes(app, { authenticate }) {
  app.addHook('preHandler', authenticate);
  app.get('/user/me/networks', async request => {
    const { relation } = request.query;
    if (!['created', 'joined'].includes(relation)) throw new ValidationError('Relation must be created or joined');
    const { limit, after } = pageOptions(request.query);
    const filter = relation === 'created' ? { owner: request.userId } : {
      owner: { $ne: request.userId }, members: { $elemMatch: { user: request.userId, status: 'active' } },
    };
    const [rows, total] = await Promise.all([
      Network.find({ ...filter, ...(after ? { _id: { $lt: after } } : {}) }).sort({ _id: -1 }).limit(limit + 1).lean(),
      Network.countDocuments(filter),
    ]);
    return { ...pageResult(rows, limit, network => summary(network, request.userId)), total };
  });
  app.get('/network/:networkId', async request => ({ network: summary(await access(request.params.networkId, request.userId), request.userId) }));
  app.patch('/network/:networkId', async request => {
    const network = await access(request.params.networkId, request.userId, true);
    const body = request.body || {};
    if (body.name !== undefined) network.name = safeText(body.name, 'Network name', 80);
    if (body.description !== undefined) {
      if (typeof body.description !== 'string' || body.description.length > 500) throw new ValidationError('Description must be at most 500 characters');
      network.description = body.description.trim();
    }
    await network.save();
    return { network: summary(network, request.userId) };
  });
  app.get('/network/:networkId/members', async request => {
    const network = await access(request.params.networkId, request.userId);
    const { limit, after } = pageOptions(request.query);
    const memberIds = network.members.filter(m => m.status === 'active').map(m => m.user);
    const rows = await User.find({ _id: { $in: memberIds, ...(after ? { $lt: after } : {}) } }).select('name avatarUrl').sort({ _id: -1 }).limit(limit + 1).lean();
    return pageResult(rows, limit, user => ({ id: String(user._id), name: user.name, avatarUrl: user.avatarUrl,
      role: String(network.owner) === String(user._id) ? 'owner' : network.members.find(m => String(m.user) === String(user._id))?.role }));
  });
  app.post('/network/:networkId/invitations', async (request, reply) => {
    const network = await access(request.params.networkId, request.userId, true);
    const recipient = objectId(request.body?.recipientId, 'recipient ID');
    if (network.members.some(m => String(m.user) === String(recipient) && m.status === 'active')) throw new ValidationError('User is already a member');
    const user = await User.findById(recipient).select('name');
    if (!user) throw new NotFoundError('Recipient');
    const invitation = await Invitation.findOneAndUpdate({ network: network._id, recipient },
      { $set: { inviter: request.userId, status: 'pending' } }, { upsert: true, new: true });
    return reply.code(201).send({ invitation: { id: String(invitation._id), status: invitation.status, recipient: { id: String(user._id), name: user.name } } });
  });
  app.get('/user/me/network-invitations', async request => {
    const { limit, after } = pageOptions(request.query);
    const rows = await Invitation.find({ recipient: request.userId, status: 'pending', ...(after ? { _id: { $lt: after } } : {}) })
      .sort({ _id: -1 }).limit(limit + 1).populate('network', 'name').populate('inviter', 'name avatarUrl').lean();
    return pageResult(rows, limit, row => ({ id: String(row._id), network: row.network, inviter: row.inviter, createdAt: row.createdAt, status: row.status }));
  });
  for (const action of ['accept', 'decline']) app.post(`/network-invitations/:invitationId/${action}`, async request => {
    const invitation = await Invitation.findOne({ _id: objectId(request.params.invitationId, 'invitation ID'), recipient: request.userId });
    if (!invitation) throw new NotFoundError('Invitation');
    const status = action === 'accept' ? 'accepted' : 'declined';
    if (invitation.status !== 'pending' && invitation.status !== status) throw new ValidationError('Invitation has already been answered');
    if (action === 'accept') {
      const network = await Network.findById(invitation.network).select('_id');
      if (!network) throw new NotFoundError('Network');
      await Network.updateOne({ _id: invitation.network, 'members.user': { $ne: request.userId } },
        { $push: { members: { user: request.userId, role: 'member', status: 'active', joinedAt: new Date() } } });
    }
    await Invitation.updateOne({ _id: invitation._id, status: { $in: ['pending', status] } }, { $set: { status } });
    return { status };
  });
  app.delete('/network/:networkId/members/me', async request => {
    const network = await access(request.params.networkId, request.userId);
    if (String(network.owner) === request.userId) throw new ValidationError('The owner cannot leave their own network');
    await Network.updateOne({ _id: network._id }, { $pull: { members: { user: request.userId } } });
    await Invitation.updateMany({ network: network._id, recipient: request.userId }, { $set: { status: 'declined' } });
    return { left: true };
  });
}
