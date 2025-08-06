import createDebug from 'debug';
import { PRODUCT_NAME } from './constants';
import type { Context } from './context';
import type { Plugin } from './plugin';
import { clearTracing } from './tracing';

const debug = createDebug('takumi:index');

export { Agent, Runner, tool as _tool } from '@openai/agents';
export { checkAndUpdate as _checkAndUpdate } from 'upgear';
export { createOpenAI as _createOpenAI } from '@ai-sdk/openai';
export { createDeepSeek as _createDeepSeek } from '@ai-sdk/deepseek';
export { createAnthropic as _createAnthropic } from '@ai-sdk/anthropic';
export { aisdk as _aisdk } from './utils/ai-sdk';
export { default as _picocolors } from 'picocolors';
export { enhanceTool as _enhanceTool } from './tool';
export { z as _zod } from 'zod';

export type { Plugin, Context };

export interface RunCliOpts {
  cwd: string;
  productName: string;
  version: string;
  plugins?: Plugin[];
}

// ref:
// https://github.com/yargs/yargs-parser/blob/6d69295/lib/index.ts#L19
process.env.YARGS_MIN_NODE_VERSION = '18';

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
      const { runServer } = await import('./commands/server');
      await runServer(opts);
      break;
    case 'log':
      const { runLog } = await import('./commands/log');
      await runLog(opts);
      break;
    default:
      const { runDefault } = await import('./commands/default');
      await runDefault(opts);
      break;
  }
}
