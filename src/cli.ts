#!/usr/bin/env -S node --no-warnings=ExperimentalWarning
import fs from 'fs';
import path from 'pathe';
import { fileURLToPath } from 'url';
import { parseArgs, runNeovate } from '.';
import { PRODUCT_ASCII_ART, PRODUCT_NAME } from './constants';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../package.json'), 'utf-8'),
);
const installDir = path.resolve(__dirname, '../');

const argv = await parseArgs(process.argv.slice(2));

const { shutdown } = await runNeovate({
  productName: PRODUCT_NAME,
  productASCIIArt: PRODUCT_ASCII_ART,
  version: pkg.version,
  plugins: [],
  upgrade: {
    registryBase: 'https://registry.npmjs.org',
    name: pkg.name,
    version: pkg.version,
    installDir,
    files: ['vendor', 'dist', 'package.json'],
  },
  argv,
});

let isShuttingDown = false;
const handleSignal = async () => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  try {
    if (shutdown) {
      await shutdown();
    }
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
};
process.on('SIGINT', handleSignal);
process.on('SIGTERM', handleSignal);
