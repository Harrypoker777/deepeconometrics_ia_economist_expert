const HEALTH_QUERY = `
  SELECT
    EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'sesiones'
    ) AS sessions_ready,
    EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'db_datos_perfiles_usuarios'
        AND table_name = 'perfiles_usuario'
    ) AS auth_ready
`;

export async function registerHealthRoute(fastify) {
  fastify.get('/api/health', async (request, reply) => {
    try {
      const { rows } = await fastify.pgQuery(HEALTH_QUERY);
      const row = rows[0] || {};
      const checks = {
        postgres: 'ok',
        sessions: row.sessions_ready ? 'ok' : 'missing',
        auth: row.auth_ready ? 'ok' : 'missing',
      };
      const healthy = Object.values(checks).every((value) => value === 'ok');

      if (!healthy) {
        reply.code(503);
      }

      return {
        status: healthy ? 'ok' : 'degraded',
        service: 'deepeconometrics-fastify-api',
        timestamp: new Date().toISOString(),
        checks,
      };
    } catch (error) {
      request.log.error(error, 'Health check failed');
      return reply.code(503).send({
        status: 'down',
        service: 'deepeconometrics-fastify-api',
        timestamp: new Date().toISOString(),
        checks: {
          postgres: 'error',
          sessions: 'unknown',
          auth: 'unknown',
        },
      });
    }
  });
}
