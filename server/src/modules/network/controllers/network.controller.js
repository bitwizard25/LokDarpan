import networkService from '../services/network.service.js';

async function create(request, reply) {
  const network = await networkService.createNetwork({ ...request.body, owner: request.userId });
  return reply.status(201).send({ network });
}

async function list(request, reply) {
  const networks = await networkService.listNetworksForUser(request.userId);
  return reply.status(200).send({ networks });
}

export default { create, list };
