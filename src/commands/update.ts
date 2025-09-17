import yargsParser from 'yargs-parser';
import type { Context } from '../context';
import { Upgrade, type UpgradeOptions } from '../upgrade';

function printHelp(p: string) {
  console.log(
    `
Usage:
  ${p} update [options]

Check for and apply updates to ${p}.

Options:
  -h, --help                Show help

Examples:
  ${p} update                       Check and apply updates if available
    `.trim(),
  );
}

export async function runUpdate(
  context: Context,
  upgradeOptions?: UpgradeOptions,
) {
  const productName = context.productName;
  const argv = yargsParser(process.argv.slice(3), {
    alias: {
      help: 'h',
    },
    boolean: ['help'],
  });
  // help
  if (argv.help) {
    printHelp(productName.toLowerCase());
    return;
  }
  if (!upgradeOptions) {
    console.error('Update functionality is not available');
    process.exit(1);
  }
  const upgrade = new Upgrade(upgradeOptions);
  try {
    console.log('Checking for updates...');
    const result = await upgrade.check();
    if (!result.hasUpdate) {
      console.log(
        `${productName} is already up to date (v${upgradeOptions.version})`,
      );
      return;
    }
    if (result.hasUpdate && result.tarballUrl) {
      console.log(
        `Updating from v${upgradeOptions.version} to v${result.latestVersion}...`,
      );
      // Set up event listeners for progress
      upgrade.on('status', (status) => {
        switch (status.type) {
          case 'downloading':
            console.log(`Downloading update from ${status.tarballUrl}...`);
            break;
          case 'saving':
            console.log(`Saving to ${status.tarballPath}...`);
            break;
          case 'extracting':
            console.log(`Extracting to ${status.extractDir}...`);
            break;
          case 'copying':
            console.log(`Installing files: ${status.files.join(', ')}...`);
            break;
        }
      });
      await upgrade.upgrade({ tarballUrl: result.tarballUrl });
      console.log(`✅ Successfully updated to v${result.latestVersion}`);
      console.log('Restart the application to use the new version.');
    }
  } catch (error: any) {
    console.error(`Update failed: ${error.message}`);
    process.exit(1);
  }
}
