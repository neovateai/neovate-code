import { Type } from '@sinclair/typebox';
import { formatDataStreamPart, pipeDataStreamToResponse } from 'ai';
import createDebug from 'debug';
import { FastifyPluginAsync } from 'fastify';
import { last } from 'lodash-es';
import { PluginHookType } from '../../plugin';
import { isSlashCommand, parseSlashCommand } from '../../slash-commands';
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
            // Check if this is a slash command
            if (isSlashCommand(opts.prompt)) {
              debug('Processing slash command:', opts.prompt);
              const slashCommand = parseSlashCommand(opts.prompt);
              if (!slashCommand) {
                dataStream.writeMessageAnnotation({
                  type: 'text',
                  text: 'Invalid slash command',
                  mode,
                });
                return;
              }

              const service = mode === 'plan' ? opts.planService : opts.service;
              const command = service.context.slashCommands.get(
                slashCommand.command,
              );

              if (!command) {
                const errorText = `Unknown command: /${slashCommand.command}. Type /help to see available commands.`;
                dataStream.writeMessageAnnotation({
                  type: 'text',
                  text: errorText,
                  mode,
                });
                return;
              }

              try {
                if (command.type === 'local') {
                  const result = await command.call(
                    slashCommand.args,
                    service.context,
                  );
                  if (result) {
                    dataStream.writeMessageAnnotation({
                      type: 'text',
                      text: result,
                      mode,
                    });
                  }
                  return;
                } else if (command.type === 'prompt') {
                  const messages = await command.getPromptForCommand(
                    slashCommand.args,
                  );
                  const promptInput = messages.map((msg) => ({
                    role: msg.role as 'user',
                    content: msg.content,
                  }));

                  opts.prompt = promptInput
                    .map((msg) => msg.content)
                    .join('\n');
                }
              } catch (error) {
                const errorMessage =
                  error instanceof Error ? error.message : 'Unknown error';
                dataStream.write(
                  formatDataStreamPart(
                    'text',
                    `Error executing command: ${errorMessage}`,
                  ),
                );
                return;
              }
            }

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
