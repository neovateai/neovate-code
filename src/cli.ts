#!/usr/bin/env -S node --no-warnings=ExperimentalWarning
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { _checkAndUpdate, runCli } from '.';

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
          `New version ${info.version} of ${info.packageName} is available, but requires reinstallation.`,
        );
        console.log(`Run \`npm install -g ${info.packageName}\` to update.`);
        console.log(`Changelog: ${info.changelogUrl}`);
      } else {
        console.log(
          `${info.packageName} has been updated to ${info.version}, restart to apply.`,
        );
        console.log(`Changelog: ${info.changelogUrl}`);
      }
    },
  });
}

async function main() {
  await checkUpdate();
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const pkg = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../package.json'), 'utf-8'),
  );
  await runCli({
    plugins: [],
    productName: 'TAKUMI',
    version: pkg.version,
  });
}

main()
  .catch(console.error)
  .finally(() => {});
