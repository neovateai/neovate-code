import portfinder from 'portfinder';
import { WebServer } from './web-server';

const DEFAULT_PORT = 1024;
const DEFAULT_HOST = '127.0.0.1';

export async function runServer(opts: {
  cwd: string;
  contextCreateOpts: any;
}): Promise<() => Promise<void>> {
  const { default: yargsParser } = await import('yargs-parser');
  const argv = yargsParser(process.argv.slice(2), {
    alias: {
      port: 'p',
      host: 'h',
    },
    number: ['port'],
    string: ['host'],
  });

  const port = await portfinder.getPortPromise({
    port: Number.parseInt(String(argv.port || DEFAULT_PORT), 10),
  });

  const server = new WebServer({
    port,
    host: argv.host || DEFAULT_HOST,
    contextCreateOpts: opts.contextCreateOpts,
    cwd: opts.cwd,
  });

  const shutdown = async () => {
    console.log('\n[WebServer] Shutting down...');
    await server.stop();
  };

  await server.start();

  return shutdown;
}
