import { Type } from '@sinclair/typebox';
import { pipeDataStreamToResponse } from 'ai';
import createDebug from 'debug';
import { FastifyPluginAsync } from 'fastify';
import {
  createCompletionResponse,
  runCompletion,
} from '../services/completions';
import { CreateServerOpts } from '../types';
import { CompletionRequest } from '../types/completions';

const debug = createDebug('takumi:server:completions');

const CompletionRequestSchema = Type.Object({
  messages: Type.Array(
    Type.Object({
      role: Type.String(),
      content: Type.String(),
    }),
  ),
  contexts: Type.Optional(
    Type.Object({
      files: Type.Array(
        Type.Object({
          path: Type.String(),
          type: Type.String(),
        }),
      ),
    }),
  ),
});

const completionsRoute: FastifyPluginAsync<CreateServerOpts> = async (
  app,
  opts,
) => {
  app.post<{ Body: CompletionRequest }>(
    '/completions',
    {
      schema: {
        body: CompletionRequestSchema,
      },
    },
    async (request, reply) => {
      const messages = request.body.messages;
      const prompt = messages[messages.length - 1].content;
      debug('Received messages:', messages);
      reply.header('Content-Type', 'text/plain; charset=utf-8');
      reply.header('Cache-Control', 'no-cache');
      reply.header('Connection', 'keep-alive');

      try {
        pipeDataStreamToResponse(reply.raw, {
          async execute(dataStream) {
            await runCompletion({
              ...opts,
              prompt,
              dataStream,
            });
          },
          onError(error) {
            return error instanceof Error ? error.message : String(error);
          },
        });
      } catch (error) {
        reply.status(500).send({ error: 'Internal server error' });
        throw error;
      }
    },
  );
};

export default completionsRoute;
