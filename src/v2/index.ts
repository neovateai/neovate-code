import { ModelProvider } from '@openai/agents';
import { PRODUCT_NAME } from './constants';

export interface RunCliOpts {
  productName: string;
  version: string;
  modelProvider?: ModelProvider;
}

export async function runCli(opts: RunCliOpts) {
  opts.productName = opts.productName || PRODUCT_NAME;
  opts.version = opts.version || '0.0.0';
  const command = process.argv[2];
  switch (command) {
    case 'config':
      const { runConfig } = await import('./commands/config');
      await runConfig(opts);
      break;
    case 'commit':
      const { runCommit } = await import('./commands/commit');
      await runCommit(opts);
      break;
    case 'mcp':
      const { runMCP } = await import('./commands/mcp');
      await runMCP(opts);
      break;
    default:
      if (process.env.FC) {
        const { runDefault } = await import('./commands/default-fc');
        await runDefault(opts);
      } else {
        const { runDefault } = await import('./commands/default');
        await runDefault(opts);
      }
      break;
  }
}
