// @ts-nocheck
import { Type } from '@sinclair/typebox';
import { pipeDataStreamToResponse } from 'ai';
import createDebug from 'debug';
import type { FastifyPluginAsync } from 'fastify';
import { last } from 'lodash-es';
import { PluginHookType } from '../../plugin';
import { runCode } from '../services/completions';
import type { RouteCompletionsOpts } from '../types';
import { type CompletionRequest, ContextType } from '../types/completions';

const debug = createDebug('neovate:server:completions');

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
  mode: Type.String(),
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
      const mode = request.body.mode;
      const lastMessage = last(messages);
      debug('Received messages:', messages);

      if (!lastMessage) {
        throw new Error('No messages provided');
      }

      await opts.context.apply({
        hook: 'serverRouteCompletions',
        args: [
          {
            message: lastMessage,
            attachedContexts: lastMessage.attachedContexts || [],
          },
        ],
        type: PluginHookType.Series,
      });

      const prompt = lastMessage.planContent ?? lastMessage.content;

      opts.context.addHistory(prompt);

      reply.header('Content-Type', 'text/plain; charset=utf-8');
      reply.header('Cache-Control', 'no-cache');
      reply.header('Connection', 'keep-alive');

      // Create an AbortController for cancelling requests
      const abortController = new AbortController();
      debug('Created AbortController');

      const handleAbort = (hadError: boolean) => {
        if (reply.sent) {
          return;
        }
        debug(`${hadError ? 'with error' : 'without error'}, aborting request`);
        abortController.abort();
      };

      // Register socket event listener (socket.close covers both user cancellation and network errors)
      if (request.raw.socket) {
        request.raw.socket.on('close', handleAbort);
      }

      try {
        await pipeDataStreamToResponse(reply.raw, {
          async execute(dataStream) {
            await runCode({
              ...opts,
              prompt,
              dataStream,
              mode,
              // Pass AbortSignal to runCode function
              abortSignal: abortController.signal,
              // files are processed through context in plugins, only handling other types here
              attachedContexts: (lastMessage.attachedContexts || []).filter(
                (context) => context.type !== ContextType.FILE,
              ),
            });
          },
          onError(error) {
            debug('Error in completion:', error);
            return error instanceof Error ? error.message : String(error);
          },
        });
      } catch (error) {
        debug('Unhandled error:', error);
        console.log('error', error);
        if (!reply.sent) {
          reply.status(500).send({ error: 'Internal server error' });
        }
        throw error;
      }
    },
  );
};

export default completionsRoute;
