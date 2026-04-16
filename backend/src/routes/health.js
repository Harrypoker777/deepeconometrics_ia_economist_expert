export async function registerHealthRoute(fastify) {
  fastify.get('/api/health', async () => ({
    status: 'ok',
    service: 'deepeconometrics-fastify-api',
    timestamp: new Date().toISOString(),
  }));
}