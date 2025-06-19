import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import fastify, { FastifyInstance } from 'fastify';
import { PRODUCT_NAME } from '../constants';
import * as logger from '../utils/logger';
import config from './config';
import { CreateServerOpts, RunBrowserServerOpts } from './types';

const registerPlugins = async (app: FastifyInstance) => {
  await app.register(import('@fastify/cors'), {
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
  await app.register(import('@fastify/compress'), {
    global: true,
  });
};

const registerRoutes = async (app: FastifyInstance, opts: CreateServerOpts) => {
  await app.register(import('./routes/completions'), {
    prefix: '/api/chat',
    ...opts,
  });
};

export async function runBrowserServer(opts: RunBrowserServerOpts) {
  const traceName = `${opts.context.productName ?? PRODUCT_NAME}-browser`;
  await createServer({
    ...opts,
    traceName,
  });
}

export async function createServer(opts: CreateServerOpts) {
  const app: FastifyInstance = fastify({
    logger: true,
  }).withTypeProvider<TypeBoxTypeProvider>();

  try {
    await registerPlugins(app);
    await registerRoutes(app, opts);

    await app.listen({
      port: config.port,
      host: config.host,
    });

    logger.logInfo(`Server is running on http://${config.host}:${config.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
  return app;
}
