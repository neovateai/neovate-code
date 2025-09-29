import assert from 'assert';
import path from 'path';
import { fileURLToPath } from 'url';
import type { TaskModule } from '../../../types';

const __dirname = fileURLToPath(import.meta.url);
const root = path.join(__dirname, '../../../../../');

const outputStylePath = path.join(root, 'e2e/output-styles/miao.md');

export const task: TaskModule = {
  cliArgs: [`say hi`, '--output-style', outputStylePath],
  test: (opts) => {
    console.log(opts.result);
    assert(opts.result.includes('miao~~~'));
  },
};
