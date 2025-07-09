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

      // Create an AbortController for cancelling requests
      const abortController = new AbortController();
      debug('Created AbortController');

      // Listen for request close event
      request.raw.on('close', () => {
        debug('close event triggered');
        if (!reply.sent) {
          debug('Client closed connection, aborting request');
          abortController.abort();
        }
      });

      // Listen for request abort event
      request.raw.on('aborted', () => {
        debug('aborted event triggered');
        if (!reply.sent) {
          debug('Client aborted connection, aborting request');
          abortController.abort();
        }
      });

      // Listen for socket error event
      request.raw.socket.on('error', (err) => {
        debug('socket error event triggered', err);
        if (!reply.sent) {
          debug('Socket error, aborting request');
          abortController.abort();
        }
      });

      // Listen for socket close event
      request.raw.socket.on('close', (hadError) => {
        debug(
          'socket close event triggered',
          hadError ? 'with error' : 'without error',
        );
        if (!reply.sent) {
          debug('Socket closed, aborting request');
          abortController.abort();
        }
      });

      try {
        await pipeDataStreamToResponse(reply.raw, {
          async execute(dataStream) {
            debug('Starting runCode execution');
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
            debug('runCode execution completed');
          },
          onError(error) {
            // Check if it's a cancellation error
            if (error instanceof Error && error.name === 'AbortError') {
              debug('Request was aborted, returning cancellation message');
              return 'Request was cancelled by the client';
            }
            debug('Request error:', error);
            debug('Error in completion:', error);
            return error instanceof Error ? error.message : String(error);
          },
        });
        debug('pipeDataStreamToResponse completed');
      } catch (error) {
        // Check if it's a cancellation error
        if (error instanceof Error && error.name === 'AbortError') {
          debug('Caught AbortError, request was aborted');
          if (!reply.sent) {
            reply.status(499).send({ error: 'Client closed request' });
          }
          return;
        }

        debug('Unhandled error:', error);
        debug('Unhandled error:', error);
        console.log('error', error);
        if (!reply.sent) {
          reply.status(500).send({ error: 'Internal server error' });
        }
        throw error;
      }
      debug('completions request processing completed');
    },
  );
};

export default completionsRoute;
