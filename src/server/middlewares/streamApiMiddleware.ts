import { parse } from 'node:url';
import { editQuery } from '../../llms/query';
import * as logger from '../../utils/logger';
import { RequestHandler, ServerOptions } from '../types';

export const streamApiMiddleware = (opts: ServerOptions): RequestHandler => {
  return async (req, res, next) => {
    const url = parse(req.url || '', true);

    if (url.pathname !== '/api/chat/completions') {
      next();
      return;
    }

    if (req.method !== 'POST') {
      res.statusCode = 405;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    const eventManager = opts.context.pluginContext.eventManager;

    try {
      // @ts-expect-error
      const body = req.body;
      const isStream = body.stream === true;
      const prompt = body.messages[body.messages.length - 1].content;

      if (isStream) {
        try {
          // 设置流式响应头
          res.setHeader('Content-Type', 'text/event-stream');
          res.setHeader('Cache-Control', 'no-cache');
          res.setHeader('Connection', 'keep-alive');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

          // 禁用压缩以确保实时传输
          res.setHeader('X-Accel-Buffering', 'no');

          const id = `uid_${new Date().getTime()}`;
          let streamEnded = false;

          // 设置事件监听器
          eventManager.onStreamData((data) => {
            if (streamEnded) return;

            try {
              switch (data.type) {
                case 'text':
                  const { queryId } = data.metadata || {};
                  const content = {
                    id: queryId || id,
                    object: 'chat.completion.chunk',
                    created: Math.floor(Date.now() / 1000),
                    choices: [
                      {
                        index: 0,
                        delta: { content: data.content },
                        finish_reason: null,
                      },
                    ],
                  };
                  res.write(`data: ${JSON.stringify(content)}\n\n`);
                  break;
                case 'tool_call':
                  res.write(`data: ${JSON.stringify(data)}\n\n`);
                  break;
                default:
                  res.write(
                    createStreamChunk(id, data.content, false, data.metadata),
                  );
                  break;
              }

              // 立即刷新响应，确保数据实时发送
              if (res.flush) {
                res.flush();
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

          // 设置清理监听器
          res.on('close', cleanup);
          res.on('finish', cleanup);

          // 开始处理查询
          await editQuery({
            prompt,
            context: opts.context,
          });

          // 发送结束标记
          if (!streamEnded) {
            res.write('data: [DONE]\n\n');
            if (res.flush) {
              res.flush();
            }
          }

          // 结束响应
          res.end();
        } catch (error) {
          logger.logError({ error: `Stream processing error: ${error}` });
          if (!res.headersSent) {
            res.write(
              `data: ${JSON.stringify({
                error: {
                  message: 'Internal server error',
                  type: 'server_error',
                },
              })}\n\n`,
            );
            res.write('data: [DONE]\n\n');
            res.end();
          }
        }
      } else {
        // 处理非流式请求
        next();
      }
    } catch (error) {
      logger.logError({ error: `Request parsing error: ${error}` });
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Invalid JSON' }));
    }
  };
};

interface OpenAIStreamResponse {
  id: string;
  object: 'chat.completion.chunk';
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

export function createStreamChunk(
  id: string,
  content: string,
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
        delta: isFinished ? {} : { content },
        finish_reason: isFinished ? 'stop' : null,
      },
    ],
  };

  // 如果有元数据，添加到响应中
  if (metadata) {
    (chunk as any).metadata = metadata;
  }

  return `data: ${JSON.stringify(chunk)}\n\n`;
}
