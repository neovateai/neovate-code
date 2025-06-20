#!/usr/bin/env -S node --no-warnings=ExperimentalWarning
import fs from 'fs';
import path from 'path';
import pc from 'picocolors';
import { fileURLToPath } from 'url';
import { _checkAndUpdate } from '.';
import { logDebug } from './utils/logger';

async function checkUpdate() {
  if (process.env.TAKUMI_SELF_UPDATE === 'none') {
    return;
  }
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const pkg = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../package.json'), 'utf-8'),
  );
  const installDir = path.resolve(__dirname, '../');
  const isLocal = !installDir.includes('node_modules');
  if (isLocal) {
    return;
  }
  await _checkAndUpdate({
    name: pkg.name,
    version: pkg.version,
    debug: process.env.DEBUG !== undefined,
    registryBase: 'https://registry.npmjs.org',
    channel: 'latest',
    skipOnCI: true,
    updateCheckIntervalMs: 0,
    dryRun: false,
    installDir,
    onDisplay: (info) => {
      if (info.needReinstall) {
        console.log(
          `New version ${pc.green(info.version)} of ${pc.cyan(info.packageName)} is available, but ${pc.yellow('requires reinstallation')}.`,
        );
        console.log(`Run ${pc.cyan(`\`npm install -g ${info.packageName}\``)}`);
        console.log(`Changelog: ${pc.blue(info.changelogUrl)}`);
        console.log(pc.dim(`-`.repeat(60)));
      } else {
        console.log(
          `${pc.cyan(info.packageName)} has been updated to ${pc.green(info.version)}, ${pc.yellow('restart to apply')}.`,
        );
        console.log(`Changelog: ${pc.blue(info.changelogUrl)}`);
        console.log(pc.dim(`-`.repeat(60)));
      }
    },
  });
}

async function main() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const pkg = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../package.json'), 'utf-8'),
  );
  try {
    await checkUpdate();
  } catch (error) {
    logDebug(`Error checking update: ${error}`);
  }
  const { runCli } = await import('.');
  await runCli({
    cwd: process.cwd(),
    productName: 'TAKUMI',
    version: pkg.version,
  });
}

main()
  .catch(console.error)
  .finally(() => {});
