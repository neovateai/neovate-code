import { Type } from '@sinclair/typebox';
import { pipeDataStreamToResponse } from 'ai';
import createDebug from 'debug';
import { FastifyPluginAsync } from 'fastify';
import { runCode } from '../services/completions';
import { RouteCompletionsOpts } from '../types';
import { CompletionRequest } from '../types/completions';

const debug = createDebug('takumi:server:completions');

const CompletionRequestSchema = Type.Object({
  messages: Type.Array(
    Type.Object({
      role: Type.Union([
        Type.Literal('user'),
        Type.Literal('assistant'),
        Type.Literal('system'),
      ]),
      content: Type.String(),
    }),
    { minItems: 1 },
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
  plan: Type.Optional(Type.Boolean()),
});

const completionsRoute: FastifyPluginAsync<RouteCompletionsOpts> = async (
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

      // 设置响应头
      reply.header('Content-Type', 'text/plain; charset=utf-8');
      reply.header('Cache-Control', 'no-cache');
      reply.header('Connection', 'keep-alive');

      try {
        await pipeDataStreamToResponse(reply.raw, {
          async execute(dataStream) {
            await runCode({
              ...opts,
              prompt,
              dataStream,
            });
          },
          onError(error) {
            debug('Error in completion:', error);
            return error instanceof Error ? error.message : String(error);
          },
        });
      } catch (error) {
        debug('Unhandled error:', error);
        if (!reply.sent) {
          reply.status(500).send({ error: 'Internal server error' });
        }
        throw error;
      }
    },
  );
};

export default completionsRoute;
