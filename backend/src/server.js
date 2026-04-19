import Fastify from 'fastify';
import cors from '@fastify/cors';
import { ensureDatabaseSetup } from './bootstrap/database.js';
import { config } from './config.js';
import { closePool, query } from './db.js';
import { registerAuthRoute } from './routes/auth.js';
import { registerChatRoute } from './routes/chat.js';
import { registerFilesRoute } from './routes/files.js';
import { registerHealthRoute } from './routes/health.js';
import { registerSessionsRoute } from './routes/sessions.js';

const app = Fastify({
  logger: true,
  trustProxy: true,
});

app.decorate('pgQuery', query);

await ensureDatabaseSetup();

const allowedOrigins = new Set([
  config.allowedOrigin,
  'http://localhost:3000',
  'http://127.0.0.1:3000',
]);

await app.register(cors, {
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Origin not allowed by CORS'), false);
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'x-api-secret'],
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
});

await registerHealthRoute(app);
await registerFilesRoute(app);
await registerAuthRoute(app);
await registerSessionsRoute(app);
await registerChatRoute(app);

app.setErrorHandler((error, request, reply) => {
  request.log.error(error);

  if (!reply.sent) {
    reply.code(error.statusCode && error.statusCode >= 400 ? error.statusCode : 500).send({
      error: error.message || 'Internal server error',
    });
  }
});

const closeSignals = ['SIGINT', 'SIGTERM'];

for (const signal of closeSignals) {
  process.on(signal, async () => {
    try {
      await app.close();
      await closePool();
      process.exit(0);
    } catch (error) {
      app.log.error(error);
      process.exit(1);
    }
  });
}

await app.listen({
  host: '0.0.0.0',
  port: config.port,
});
