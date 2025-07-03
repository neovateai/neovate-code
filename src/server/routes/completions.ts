import { Type } from '@sinclair/typebox';
import { pipeDataStreamToResponse } from 'ai';
import createDebug from 'debug';
import { FastifyPluginAsync } from 'fastify';
import { last } from 'lodash-es';
import { PluginHookType } from '../../plugin';
import { runCode } from '../services/completions';
import { RouteCompletionsOpts } from '../types';
import { CompletionRequest, ContextType } from '../types/completions';

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

      try {
        await pipeDataStreamToResponse(reply.raw, {
          async execute(dataStream) {
            await runCode({
              ...opts,
              prompt,
              dataStream,
              mode,
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
