import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import createDebug from 'debug';
import fastify, { FastifyInstance } from 'fastify';
import * as fs from 'fs/promises';
import { homedir } from 'os';
import path from 'path';
import portfinder from 'portfinder';
import { fileURLToPath } from 'url';
import yargsParser from 'yargs-parser';
import { RunCliOpts } from '..';
import projectRoute from '../project';
import * as logger from '../utils/logger';

const debug = createDebug('takumi:commands:log');

function printHelp(p: string) {
  console.log(
    `
Usage:
  ${p} log [options]

Start ${p} log viewer server to view conversation logs via REST API and WebSocket.

Options:
  -h, --help                    Show help
  --port <port>                 Specify port to use (default: 2006)
  --projects-dir <dir>          Projects directory path (default: ~/.${p}/projects)
  --logLevel <level>            Specify log level (error|warn|info|debug)

API Endpoints:
  GET  /api/projects                              List all projects
  GET  /api/projects/:projectId/sessions          List sessions for a project
  GET  /api/projects/:projectId/sessions/:sessionId  Get logs for a session
  WS   /ws/watch                                  Real-time updates via WebSocket

Examples:
  ${p} log                                        Start log viewer on default port
  ${p} log --port 3000                           Start on port 3000
  ${p} log --projects-dir /custom/path            Use custom projects directory
  ${p} log --logLevel debug                      Enable debug logging
    `.trimEnd(),
  );
}

async function createLogServer(opts: {
  port?: number;
  projectsDir?: string;
  logLevel?: string;
  productName: string;
}) {
  const app: FastifyInstance = fastify({
    logger: opts.logLevel ? { level: opts.logLevel } : false,
  }).withTypeProvider<TypeBoxTypeProvider>();

  const port = await portfinder.getPortPromise({
    port: opts.port || 2006,
  });
  const host = '0.0.0.0';

  // Register CORS for API access
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

  process.env.TAKUMI_PROJECTS_DIR = opts.projectsDir;

  // Register project routes
  await app.register(projectRoute, {
    prefix: '/api',
  });

  // Health check endpoint
  app.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Get path to logfiles directory
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const isLocal = __dirname.endsWith('takumi/src/commands');
  const logfilesDir = isLocal
    ? path.resolve(__dirname, '../../logfiles')
    : path.resolve(__dirname, './logfiles');

  // Serve index.html at root
  app.get('/', async (request, reply) => {
    try {
      const indexPath = path.join(logfilesDir, 'index.html');
      const content = await fs.readFile(indexPath, 'utf-8');
      reply.type('text/html');
      return content;
    } catch (error) {
      debug('Error serving index.html:', error);
      // Fallback to API info if HTML file not found
      return {
        name: `${opts.productName} Log Viewer API`,
        version: '1.0.0',
        endpoints: {
          projects: '/api/projects',
          sessions: '/api/projects/:projectId/sessions',
          logs: '/api/projects/:projectId/sessions/:sessionId',
          websocket: '/ws/watch',
          health: '/health',
        },
        documentation: 'Use --help for API endpoint details',
      };
    }
  });

  // Serve live.html at /live
  app.get('/live', async (request, reply) => {
    try {
      const livePath = path.join(logfilesDir, 'live.html');
      const content = await fs.readFile(livePath, 'utf-8');
      reply.type('text/html');
      return content;
    } catch (error) {
      debug('Error serving live.html:', error);
      reply.status(404);
      return { error: 'Live activity page not found' };
    }
  });

  // Serve index.html for project routes (SPA routing)
  app.get<{ Params: { projectId: string } }>(
    '/project/:projectId',
    async (_request, reply) => {
      try {
        const indexPath = path.join(logfilesDir, 'index.html');
        const content = await fs.readFile(indexPath, 'utf-8');
        reply.type('text/html');
        return content;
      } catch (error) {
        debug('Error serving index.html for project route:', error);
        reply.status(404);
        return { error: 'Project page not found' };
      }
    },
  );

  // Serve index.html for session routes (SPA routing)
  app.get<{ Params: { projectId: string; sessionId: string } }>(
    '/project/:projectId/session/:sessionId',
    async (_request, reply) => {
      try {
        const indexPath = path.join(logfilesDir, 'index.html');
        const content = await fs.readFile(indexPath, 'utf-8');
        reply.type('text/html');
        return content;
      } catch (error) {
        debug('Error serving index.html for session route:', error);
        reply.status(404);
        return { error: 'Session page not found' };
      }
    },
  );

  try {
    await app.listen({
      port,
      host,
    });

    const baseUrl = `http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`;
    logger.logInfo(`Log Viewer started on ${baseUrl}`);

    return app;
  } catch (err) {
    app.log.error(err);
    logger.logError({ error: err });
    process.exit(1);
  }
}

export async function runLog(opts: RunCliOpts) {
  const argv = yargsParser(process.argv.slice(2), {
    alias: {
      help: 'h',
    },
    default: {},
    boolean: ['help'],
    string: ['logLevel', 'projects-dir'],
    number: ['port'],
  });

  if (argv.help) {
    printHelp(opts.productName.toLowerCase());
    return;
  }

  debug('argv', argv);

  const productName = opts.productName.toLowerCase();
  const projectsDir =
    argv['projects-dir'] || path.join(homedir(), `.${productName}`, 'projects');

  logger.logIntro({
    productName: opts.productName,
    version: opts.version,
  });

  // Check if projects directory exists
  try {
    const fs = await import('fs/promises');
    await fs.access(projectsDir);
  } catch {
    logger.logError({
      error: new Error(`Projects directory does not exist: ${projectsDir}`),
    });
    console.log('\n💡 Tips:');
    console.log(
      `  - Make sure you have used ${opts.productName} to create some conversations`,
    );
    console.log('  - Check if the projects directory path is correct');
    console.log('  - Use --projects-dir to specify a custom directory');
    process.exit(1);
  }

  await createLogServer({
    port: argv.port,
    projectsDir,
    logLevel: argv.logLevel,
    productName: opts.productName,
  });

  // Graceful shutdown
  const gracefulShutdown = async () => {
    debug('Shutting down gracefully...');
    try {
      // await server.close();
      debug('Server closed');
      process.exit(0);
    } catch (error) {
      debug('Error during shutdown:', error);
      process.exit(1);
    }
  };

  // Set up signal handlers for graceful shutdown
  process.on('SIGINT', () => {
    debug('Received SIGINT, shutting down...');
    gracefulShutdown();
  });
  process.on('SIGTERM', () => {
    debug('Received SIGTERM, shutting down...');
    gracefulShutdown();
  });
  process.on('SIGQUIT', () => {
    debug('Received SIGQUIT, shutting down...');
    gracefulShutdown();
  });

  // Force exit after timeout if graceful shutdown fails
  // const forceExitTimeout = setTimeout(() => {
  //   debug('Force exiting after timeout');
  //   process.exit(1);
  // }, 5000);

  // Clear timeout if process exits normally
  // process.on('exit', () => {
  //   clearTimeout(forceExitTimeout);
  // });
}
