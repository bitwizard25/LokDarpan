import Network from '../schemas/network.schema.js';
import { createObjectId, isValidObjectId } from '../../../utils/db.js';
import { ValidationError } from '../../../utils/errors.js';

async function createNetwork({ name, description, visibility, owner }) {
  if (!name?.trim()) throw new ValidationError('Network name is required');
  if (!isValidObjectId(owner)) throw new ValidationError('Invalid owner ID');

  const network = new Network({
    _id: createObjectId(), name: name.trim(), description,
    visibility: visibility || 'private', owner,
    members: [{ user: owner, role: 'admin', status: 'active', joinedAt: new Date() }],
  });
  return (await network.save()).toObject();
}

async function listNetworksForUser(userId) {
  if (!isValidObjectId(userId)) throw new ValidationError('Invalid user ID');
  return Network.find({ $or: [
    { owner: userId },
    { members: { $elemMatch: { user: userId, status: 'active' } } },
  ] }).sort({ updatedAt: -1 }).lean();
}

export default { createNetwork, listNetworksForUser };
