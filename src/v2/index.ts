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
      const { runConfig } = await import('./commands/config');
      await runConfig(opts);
      break;
    default:
      const { runDefault } = await import('./commands/default');
      await runDefault(opts);
      break;
  }
}
