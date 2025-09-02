import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { runNeovate } from '.';
import { PRODUCT_ASCII_ART, PRODUCT_NAME } from '../constants';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf-8'),
);
runNeovate({
  productName: PRODUCT_NAME,
  productASCIIArt: PRODUCT_ASCII_ART.trim(),
  version: pkg.version,
  plugins: [],
}).catch((e) => {
  console.error(e);
});
