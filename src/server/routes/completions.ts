import { Type } from '@sinclair/typebox';
import { pipeDataStreamToResponse } from 'ai';
import createDebug from 'debug';
import { FastifyPluginAsync } from 'fastify';
import { last } from 'lodash-es';
import { PluginHookType } from '../../plugin';
import { runCode } from '../services/completions';
import { RouteCompletionsOpts } from '../types';
import { CompletionRequest, ContextType } from '../types/completions';
import { addActiveRequest, removeActiveRequest } from './cancel';

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
  id: Type.Optional(Type.String()),
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
      const requestId =
        request.body.id || Math.random().toString(36).substring(2, 15);
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

      // 创建 AbortController 用于取消请求
      const abortController = new AbortController();
      addActiveRequest(requestId, abortController);

      // 监听客户端断开连接
      request.raw.on('close', () => {
        debug(`Client disconnected for request ${requestId}`);
        abortController.abort();
        removeActiveRequest(requestId);
      });

      try {
        await pipeDataStreamToResponse(reply.raw, {
          async execute(dataStream) {
            await runCode({
              ...opts,
              prompt,
              dataStream,
              mode,
              requestId,
              signal: abortController.signal,
              // files are processed through context in plugins, only handling other types here
              attachedContexts: (lastMessage.attachedContexts || []).filter(
                (context) => context.type !== ContextType.FILE,
              ),
            });
          },
          onError(error: unknown) {
            // 检查是否是取消错误
            if (
              typeof error === 'object' &&
              error !== null &&
              'name' in error &&
              error.name === 'AbortError'
            ) {
              debug(`Request ${requestId} was aborted`);
              return 'Request was canceled';
            }

            debug('Error in completion:', error);
            return error instanceof Error ? error.message : String(error);
          },
        });
      } catch (error: unknown) {
        // 检查是否是取消错误
        if (
          typeof error === 'object' &&
          error !== null &&
          'name' in error &&
          error.name === 'AbortError'
        ) {
          debug(`Request ${requestId} was aborted`);
          if (!reply.sent) {
            reply.status(499).send({ error: 'Request canceled' });
          }
          return;
        }

        debug('Unhandled error:', error);
        console.log('error', error);
        if (!reply.sent) {
          reply.status(500).send({ error: 'Internal server error' });
        }
        throw error;
      } finally {
        removeActiveRequest(requestId);
      }
    },
  );
};

export default completionsRoute;
