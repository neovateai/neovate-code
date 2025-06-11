import { startBrowserServer } from '../server/server';
import { Context } from '../types';

const DEFAULT_PORT = 1024;
const DEFAULT_HOST = 'localhost';

export async function runBrowser(opts: { context: Context; prompt: string }) {
  const { context, prompt } = opts;
  const { argv } = context;

  const port = argv.port || DEFAULT_PORT;
  const host = argv.host || DEFAULT_HOST;

  await startBrowserServer({
    port,
    host,
    context,
    prompt,
  });
}
