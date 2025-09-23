import assert from 'assert';
import path from 'path';
import { fileURLToPath } from 'url';
import type { TaskModule } from '../../../types';

const __dirname = fileURLToPath(import.meta.url);
const root = path.join(__dirname, '../../../../../');

const mcpScriptPath = path.join(root, 'e2e/mcp/stdio.js');

export const task: TaskModule = {
  cliArgs: [
    `sum 0.11 and 0.7 with sum tool`,
    '--mcp-config',
    JSON.stringify({
      mcpServers: { e2etest: { command: 'node', args: [mcpScriptPath] } },
    }),
  ],
  test: (opts) => {
    console.log(opts.result);
    assert(opts.result.includes('0.81'));
    assert(opts.assistantMessages.length === 2);
  },
};
