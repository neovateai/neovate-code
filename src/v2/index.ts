import { runConfig } from './commands/config';
import { runDefault } from './commands/default';
import { PRODUCT_NAME } from './constants';

export interface RunCliOpts {
  productName?: string;
  version?: string;
}

export async function runCli(opts: RunCliOpts) {
  opts.productName = opts.productName || PRODUCT_NAME;
  opts.version = opts.version || '0.0.0';
  const command = process.argv[2];
  switch (command) {
    case 'config':
      await runConfig(opts);
      break;
    default:
      await runDefault();
      break;
  }
}
