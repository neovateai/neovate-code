import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { editQuery } from '../../llms/query';
import { PluginHookType } from '../../pluginManager/pluginManager';
import * as logger from '../../utils/logger';
import { ServerOptions } from '../types';

interface ChatCompletionRequest {
  messages: Array<{
    role: string;
    content: string;
  }>;
  contexts: {
    files: Array<{
      path: string;
      type: string;
    }>;
  };
  stream?: boolean;
}

type StreamType = 'chat.completion.chunk' | 'chat.completion.tool_call';

interface OpenAIStreamResponse {
  id: string;
  object: StreamType;
  created: number;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
    };
    finish_reason?: string | null;
  }>;
}

function createStreamChunk(
  id: string,
  content: string | Record<string, any>,
  isFinished = false,
  metadata?: Record<string, any>,
) {
  const chunk: OpenAIStreamResponse = {
    id,
    object: 'chat.completion.chunk',
    created: Math.floor(Date.now() / 1000),
    choices: [
      {
        index: 0,
        delta: isFinished
          ? {}
          : {
              content:
                typeof content === 'string'
                  ? JSON.stringify({
                      content,
                      type: 'text-delta',
                    })
                  : JSON.stringify(content),
            },
        finish_reason: isFinished ? 'stop' : null,
      },
    ],
    ...(metadata ? { metadata } : {}),
  };

  return `data: ${JSON.stringify(chunk)}\n\n`;
}

async function streamApiPlugin(fastify: FastifyInstance, opts: ServerOptions) {
  // 注册路由
  fastify.post<{
    Body: ChatCompletionRequest;
  }>(
    '/api/chat/completions',
    async (
      request: FastifyRequest<{
        Body: ChatCompletionRequest;
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const body = request.body;
        const isStream = body.stream === true;
        const prompt = body.messages[body.messages.length - 1].content;
        const contexts = body.contexts;

        await opts.context.pluginManager.apply({
          hook: 'browserStart',
          args: [{ body, contexts }],
          type: PluginHookType.Series,
          pluginContext: opts.context.pluginContext,
        });

        if (isStream) {
          // reply.header('Content-Type', 'text/plain; charset=utf-8');
          reply.header('Content-Type', 'text/event-stream; charset=utf-8');
          reply.header('Cache-Control', 'no-cache');
          reply.header('Connection', 'keep-alive');

          // 使用 flushHeaders 代替 flush
          reply.raw.flushHeaders?.();

          const id = `uid_${new Date().getTime()}`;
          let streamEnded = false;

          const eventManager = opts.context.pluginContext.eventManager;

          reply.raw.write(
            createStreamChunk(
              id,
              {
                type: 'connect',
                content: '@start',
              },
              false,
            ),
          );

          try {
            // 设置事件监听器
            eventManager.onStreamData((data) => {
              if (streamEnded) return;

              try {
                switch (data.type) {
                  case 'text-delta':
                    reply.raw.write(
                      createStreamChunk(
                        id,
                        {
                          type: 'text-delta',
                          content: data.content,
                        },
                        false,
                      ),
                    );
                    break;
                  case 'tool-call':
                    reply.raw.write(
                      createStreamChunk(
                        id,
                        {
                          content: data.content,
                          type: 'tool-call',
                        },
                        false,
                      ),
                    );
                    break;
                  default:
                    reply.raw.write(
                      createStreamChunk(
                        id,
                        {
                          type: 'other',
                          content: data,
                        },
                        false,
                      ),
                    );
                    break;
                }
              } catch (error) {
                console.error('Stream write error:', error);
              }
            });

            // 清理函数
            const cleanup = () => {
              streamEnded = true;
              eventManager.removeStreamListener();
            };

            // 开始处理查询
            await editQuery({
              prompt,
              context: opts.context,
            });

            cleanup();

            // 结束响应
            reply.raw.end();
          } catch (error) {
            logger.logError({ error: `Stream processing error: ${error}` });
            if (!reply.sent) {
              reply.raw.write(
                `data: ${JSON.stringify({
                  error: {
                    message: 'Internal server error',
                    type: 'server_error',
                  },
                })}\n\n`,
              );
              reply.raw.write('data: [DONE]\n\n');
              reply.raw.end();
            }
          }
        } else {
          // 处理非流式请求
          reply
            .code(200)
            .send({ message: 'Non-streaming not implemented yet' });
        }
      } catch (error) {
        logger.logError({ error: `Request parsing error: ${error}` });
        reply.code(400).send({ error: 'Invalid JSON' });
      }
    },
  );
}

export { streamApiPlugin };
