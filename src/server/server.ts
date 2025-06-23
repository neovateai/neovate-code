import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import createDebug from 'debug';
import fastify, { FastifyInstance } from 'fastify';
import fs from 'fs';
import path from 'path';
import portfinder from 'portfinder';
import { PRODUCT_NAME } from '../constants';
import { PluginHookType } from '../plugin';
import * as logger from '../utils/logger';
import config from './config';
import { CreateServerOpts, RunBrowserServerOpts } from './types';

const debug = createDebug('takumi:server:completions');

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const BROWSER_DIST_PATH = path.resolve(
  __dirname,
  process.env.BROWSER_DIST_PATH || '../dist-browser',
);

debug('BROWSER_DIST_PATH', BROWSER_DIST_PATH);

const BASE_API_PREFIX = '/api';

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

  await app.register(import('@fastify/static'), {
    root: BROWSER_DIST_PATH,
    prefix: '/',
    wildcard: false,
  });

  app.get('*', async (request, reply) => {
    if (request.url.startsWith(BASE_API_PREFIX)) {
      return reply.status(404).send('Not Found');
    }

    const htmlPath = path.join(BROWSER_DIST_PATH, 'index.html');
    if (fs.existsSync(htmlPath)) {
      return reply.sendFile('index.html');
    } else {
      debug('index.html not found');
      return reply.status(404).send('Not Found');
    }
  });
};

const registerRoutes = async (app: FastifyInstance, opts: CreateServerOpts) => {
  const { logLevel: _, ...pluginOpts } = opts;

  await app.register(import('./routes/completions'), {
    prefix: `${BASE_API_PREFIX}/chat`,
    ...pluginOpts,
  });
  await app.register(import('./routes/files'), {
    prefix: BASE_API_PREFIX,
    ...pluginOpts,
  });
  await app.register(import('./routes/app-data'), {
    prefix: BASE_API_PREFIX,
    ...pluginOpts,
  });

  await opts.context.apply({
    hook: 'serverRoutes',
    args: [
      {
        opts: {
          app,
          prefix: BASE_API_PREFIX,
          opts,
        },
      },
    ],
    type: PluginHookType.Series,
  });
};

export async function runBrowserServer(opts: RunBrowserServerOpts) {
  const traceName = `${opts.context.productName ?? PRODUCT_NAME}-browser`;

  const appData = await opts.context.apply({
    hook: 'serverAppData',
    args: [
      {
        context: opts.context,
        cwd: opts.cwd,
      },
    ],
    memo: {
      productName: opts.context.productName,
      version: opts.context.version,
      cwd: opts.cwd,
      config: opts.context.config,
    },
    type: PluginHookType.SeriesMerge,
  });

  const exit = () => {
    debug('exit');
    opts.context.destroy().then(() => {
      process.exit(0);
    });
  };

  process.on('SIGINT', exit);
  process.on('SIGQUIT', exit);
  process.on('SIGTERM', exit);

  await createServer({
    ...opts,
    traceName,
    appData,
  });
}

export async function createServer(opts: CreateServerOpts) {
  const app: FastifyInstance = fastify({
    logger: opts.logLevel ? { level: opts.logLevel } : false,
  }).withTypeProvider<TypeBoxTypeProvider>();

  const port = await portfinder.getPortPromise({
    port: Number.parseInt(String(opts.port || config.port), 10),
  });
  const host = config.host;

  try {
    await registerPlugins(app);
    await registerRoutes(app, opts);

    await app.listen({
      port,
      host,
    });

    const baseUrl = `http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`;
    logger.logInfo(`Browser is running on ${baseUrl}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
  return app;
}
