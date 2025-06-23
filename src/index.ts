import { ModelProvider } from '@openai/agents';
import createDebug from 'debug';
import { PRODUCT_NAME } from './constants';
import { clearTracing } from './tracing';

const debug = createDebug('takumi:index');

export { Agent, Runner } from '@openai/agents';
export { checkAndUpdate as _checkAndUpdate } from 'upgear';
export { createOpenAI as _createOpenAI } from '@ai-sdk/openai';
export { createDeepSeek as _createDeepSeek } from '@ai-sdk/deepseek';

export interface RunCliOpts {
  cwd: string;
  productName: string;
  version: string;
  modelProvider?: ModelProvider;
}

export async function runCli(opts: RunCliOpts) {
  clearTracing();
  opts.productName = opts.productName || PRODUCT_NAME;
  opts.version = opts.version || '0.0.0';
  const command = process.argv[2];
  debug('command', command);
  debug('process.argv', process.argv);
  debug('opts', opts);
  switch (command) {
    // just for test
    case '__test':
      const { runTest } = await import('./commands/__test');
      await runTest();
      break;
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
    case 'run':
      const { runRun } = await import('./commands/run');
      await runRun(opts);
      break;
    case 'server':
      const { runBrowser } = await import('./commands/server');
      await runBrowser(opts);
      break;
    default:
      const { runDefault } = await import('./commands/default');
      await runDefault(opts);
      break;
  }
}
