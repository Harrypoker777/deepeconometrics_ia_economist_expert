import { randomUUID } from 'node:crypto';
import { createOpenAI } from '@ai-sdk/openai';
import {
  convertToModelMessages,
  pipeUIMessageStreamToResponse,
  stepCountIs,
  streamText,
} from 'ai';
import { config } from '../config.js';
import { getRequestAuth } from '../lib/auth.js';
import { checkApiSecret } from '../lib/check-api-secret.js';
import { saveSessionSnapshot } from '../lib/sessions.js';
import { SYSTEM_PROMPT } from '../system-prompt.js';
import { createEconomicTools } from '../tools/index.js';

const openai = createOpenAI({
  apiKey: config.openaiApiKey,
});

export async function registerChatRoute(fastify) {
  fastify.post('/api/chat', { preHandler: checkApiSecret }, async (request, reply) => {
    if (!config.openaiApiKey) {
      return reply.code(500).send({ error: 'Missing OPENAI_API_KEY in backend environment.' });
    }

    const body = request.body || {};
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const auth = await getRequestAuth(request);
    const userId = auth.user?.id || null;
    const persistSession = Boolean(userId && body.persist !== false);
    const sessionId = typeof body.sessionId === 'string' && body.sessionId.trim()
      ? body.sessionId.trim()
      : typeof body.id === 'string' && body.id.trim()
        ? body.id.trim()
        : randomUUID();

    if (messages.length === 0) {
      return reply.code(400).send({ error: 'messages[] is required.' });
    }

    try {
      if (persistSession) {
        await saveSessionSnapshot({
          sessionId,
          userId,
          messages,
        });
      }
    } catch (error) {
      request.log.error(error, 'Failed to persist the session before streaming');
      return reply.code(403).send({ error: 'No puedes escribir en esta sesion.' });
    }

    const abortController = new AbortController();
    request.raw.on('close', () => {
      if (request.raw.aborted) {
        abortController.abort();
      }
    });

    const tools = createEconomicTools({
      queryClient: fastify.pgQuery,
      request,
      sessionId: persistSession ? sessionId : null,
    });

    // Ensure every message has a parts array (AI SDK v6 requirement)
    const sanitizedMessages = messages.map((message) => {
      if (Array.isArray(message.parts)) {
        return message;
      }

      if (typeof message.content === 'string') {
        return { ...message, parts: [{ type: 'text', text: message.content }] };
      }

      return { ...message, parts: message.parts || [] };
    });

    let modelMessages;

    try {
      modelMessages = await convertToModelMessages(sanitizedMessages, { tools });
    } catch (conversionError) {
      request.log.error(conversionError, 'Failed to convert UI messages to model messages');
      return reply.code(400).send({ error: 'Formato de mensajes invalido. Intenta iniciar una nueva conversacion.' });
    }

    const result = streamText({
      model: openai('gpt-4o-mini'),
      system: SYSTEM_PROMPT,
      messages: modelMessages,
      tools,
      temperature: 0.2,
      stopWhen: stepCountIs(6),
      maxRetries: 1,
      abortSignal: abortController.signal,
    });

    const requestOrigin = request.headers.origin || config.allowedOrigin;

    reply.hijack();

    pipeUIMessageStreamToResponse({
      response: reply.raw,
      headers: {
        'Access-Control-Allow-Origin': requestOrigin,
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Headers': 'Content-Type, x-api-secret',
        Vary: 'Origin',
      },
      stream: result.toUIMessageStream({
        originalMessages: messages,
        onFinish: async ({ messages: completedMessages }) => {
          if (!persistSession) {
            return;
          }

          try {
            await saveSessionSnapshot({
              sessionId,
              userId,
              messages: completedMessages,
            });
          } catch (error) {
            request.log.error(error, 'Failed to persist the completed session');
          }
        },
        onError: (error) => {
          request.log.error(error);
          return error instanceof Error ? error.message : 'Unexpected streaming error';
        },
      }),
    });
  });
}
