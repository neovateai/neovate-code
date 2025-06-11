import { createServer as createHttpServer } from 'node:http';
import { Context } from '../types';
import * as logger from '../utils/logger';
import { gzipMiddleware } from './middlewares/gzipMiddleware';
import { notFoundMiddleware } from './middlewares/notFoundMiddleware';
import { SocketServer } from './socketServer';

interface ServerOptions {
  port: number;
  host: string;
  context: Context;
  prompt: string;
}

export async function startBrowserServer(opts: ServerOptions) {
  await createServer(opts);
}

export async function createServer(opts: ServerOptions) {
  const { default: connect } = await import('connect');
  const { default: cors } = await import('cors');
  const { default: compression } = await import('compression');

  const app = connect();

  // middlewares
  app.use(
    cors({
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
    }),
  );

  // @ts-expect-error
  app.use(compression());
  app.use(gzipMiddleware());
  app.use(notFoundMiddleware);

  const server = createHttpServer(app);
  const { port, host } = opts;

  const socketServer = new SocketServer({
    prompt: opts.prompt,
    sessionId: opts.context.sessionId,
  });

  await socketServer.prepare();

  server.on('upgrade', (req, socket, head) => {
    if (
      req.url?.startsWith('/ws-chat') &&
      req.headers['sec-websocket-protocol'] === 'chat'
    ) {
      // @ts-expect-error
      socketServer.upgrade(req, socket, head);
    }
  });

  server.listen(
    {
      port,
      host,
    },
    () => {
      logger.logInfo(`Server is running on http://${opts.host}:${opts.port}`);
    },
  );

  server.on('error', (err) => {
    logger.logError({ error: err.message });
    process.exit(1);
  });
}
