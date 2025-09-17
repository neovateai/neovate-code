import yargsParser from 'yargs-parser';
import { WebServer } from './web-server';

const DEFAULT_PORT = 7001;
const DEFAULT_HOST = '127.0.0.1';

export async function runServerNext(opts: { contextCreateOpts: any }) {
  const argv = yargsParser(process.argv.slice(2), {
    alias: {
      port: 'p',
      host: 'h',
    },
    number: ['port'],
    string: ['host'],
  });
  const server = new WebServer({
    port: argv.port || DEFAULT_PORT,
    host: argv.host || DEFAULT_HOST,
    contextCreateOpts: opts.contextCreateOpts,
  });
  process.on('SIGINT', async () => {
    console.log('\n[WebServer] Shutting down...');
    await server.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n[WebServer] Shutting down...');
    await server.stop();
    process.exit(0);
  });
  try {
    await server.start();
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}
