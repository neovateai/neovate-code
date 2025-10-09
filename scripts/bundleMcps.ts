import { $ } from 'bun';
import { existsSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';

const MCPS_DIR = 'mcps';
const DIST_DIR = 'dist/mcps';

function log(message: string) {
  console.log(`[bundle-mcps] ${message}`);
}

async function bundleMcp(fileName: string): Promise<boolean> {
  try {
    const baseName = fileName.replace(/\.ts$/, '');
    const inputPath = join(MCPS_DIR, fileName);
    const outputPath = join(DIST_DIR, `${baseName}.mjs`);

    log(`Bundling ${fileName} -> ${outputPath}`);

    await $`bun build ${inputPath} --minify --outfile ${outputPath} --target=node`;

    log(`✅ Successfully bundled: ${fileName}`);
    return true;
  } catch (error) {
    log(`❌ Error bundling ${fileName}: ${error}`);
    return false;
  }
}

async function main() {
  log('Starting MCP bundling...');

  // Check if mcps directory exists
  if (!existsSync(MCPS_DIR)) {
    log(`❌ Directory not found: ${MCPS_DIR}`);
    process.exit(1);
  }

  // Create dist/mcps directory if it doesn't exist
  if (!existsSync(DIST_DIR)) {
    mkdirSync(DIST_DIR, { recursive: true });
    log(`Created directory: ${DIST_DIR}`);
  }

  // Get all .ts files in mcps directory
  const files = readdirSync(MCPS_DIR).filter((file) => file.endsWith('.mjs'));

  if (files.length === 0) {
    log('⚠️  No .ts files found in mcps directory');
    process.exit(0);
  }

  log(`Found ${files.length} MCP file(s) to bundle`);

  let successCount = 0;
  for (const file of files) {
    if (await bundleMcp(file)) {
      successCount++;
    }
  }

  log(`Complete! Successfully bundled ${successCount}/${files.length} file(s)`);

  if (successCount === 0) {
    log('⚠️  No files were bundled');
    process.exit(1);
  }
}

main();
