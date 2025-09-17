#!/usr/bin/env -S node --no-warnings=ExperimentalWarning
import fs from 'fs';
import path from 'pathe';
import { fileURLToPath } from 'url';
import { runNeovate } from '.';
import { PRODUCT_ASCII_ART, PRODUCT_NAME } from './constants';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../package.json'), 'utf-8'),
);
const installDir = path.resolve(__dirname, '../');
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
}).catch((e) => {
  console.error(e);
});
