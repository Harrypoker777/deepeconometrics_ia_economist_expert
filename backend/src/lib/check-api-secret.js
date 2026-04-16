import { config } from '../config.js';

export function checkApiSecret(request, reply) {
  if (!config.apiSecret || request.headers['x-api-secret'] !== config.apiSecret) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }
}
