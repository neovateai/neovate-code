import Fastify from 'fastify';
import * as logger from '../utils/logger';
import { fileContextApiPlugin } from './plugins/fileContextApiPlugin';
import { streamApiPlugin } from './plugins/streamApiPlugin';
import { ServerOptions } from './types';

export async function startBrowserServer(opts: ServerOptions) {
  await createServer(opts);
}

export async function createServer(opts: ServerOptions) {
  const fastify = Fastify({
    logger: false, // 使用自定义日志
    bodyLimit: 5 * 1024 * 1024, // 5MB limit
  });

  try {
    // 注册 CORS 插件
    await fastify.register(import('@fastify/cors'), {
      origin: true,
      methods: ['GET', 'HEAD', 'PUT', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      credentials: true,
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin',
        'Sec-WebSocket-Protocol',
      ],
    });

    // 注册压缩插件
    await fastify.register(import('@fastify/compress'), {
      global: true,
    });

    // 注册流式 API 插件
    await fastify.register(streamApiPlugin, opts);
    await fastify.register(fileContextApiPlugin, opts);

    // 404 处理
    fastify.setNotFoundHandler(async (request, reply) => {
      reply.code(404).send();
    });

    // 错误处理
    fastify.setErrorHandler(async (error, request, reply) => {
      logger.logError({ error: error.message });
      reply.code(500).send({ error: 'Internal Server Error' });
    });

    const { port, host } = opts;

    // 启动服务器
    await fastify.listen({ port, host });
    logger.logInfo(`Server is running on http://${host}:${port}`);

    // 错误监听
    process.on('uncaughtException', (err) => {
      logger.logError({ error: err.message });
      fastify.close(() => {
        process.exit(1);
      });
    });

    process.on('SIGINT', () => {
      fastify.close(() => {
        logger.logInfo('Server stopped');
        process.exit(0);
      });
    });
  } catch (err) {
    logger.logError({ error: `Server startup error: ${err}` });
    process.exit(1);
  }
}
