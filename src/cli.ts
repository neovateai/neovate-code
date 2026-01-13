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

runNeovate({
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
}).catch((e) => {
  console.error(e);
});
