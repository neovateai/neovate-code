import yargsParser from 'yargs-parser';
import { RunCliOpts } from '..';
import { Config, ConfigManager } from '../config';

function printHelp(p: string) {
  console.log(
    `
Usage:
  ${p} config [options] [command]

Manage configuration. (e.g. ${p} config set -g model gpt-4o)

Options:
  -h, --help                            Show help

Commands:
  get [options] <key>                   Get a config value
  set [options] <key> <value>           Set a config value
  remove|rm [options] <key> [values...] Remove a config value or items from a config array
  list|ls [options]                     List all config values
  add [options] <key> <value>           Add a config value
  help                                  Show help

Examples:
  ${p} config get model               Get current model setting
  ${p} config set model gpt-4o        Set model for current project
  ${p} config set -g model gpt-4o     Set model globally
  ${p} config list                    Show all current config values
  ${p} config ls -g                   Show all global config values
  ${p} config add plugins "custom"    Add value to plugins array
  ${p} config rm model                Remove model setting
  ${p} config rm plugins "custom"     Remove specific value from plugins array
      `.trim(),
  );
}

export async function runConfig(opts: RunCliOpts) {
  const productName = opts.productName!;
  const argv = yargsParser(process.argv.slice(3), {
    alias: {
      help: 'h',
      global: 'g',
    },
    boolean: ['help', 'global'],
  });
  const command = argv._[0];

  // help
  if (!command || argv.help) {
    printHelp(productName.toLowerCase());
    return;
  }

  const cwd = process.cwd();
  const configManager = new ConfigManager(cwd, productName, {});
  const configPath = argv.global
    ? configManager.globalConfigPath
    : configManager.projectConfigPath;

  // get
  if (command === 'get') {
    const key = argv._[1];
    if (!key) {
      console.error('Missing key');
      return;
    }
    if (argv.global) {
      console.log(configManager.globalConfig[key as keyof Config]);
    } else {
      console.log(configManager.projectConfig[key as keyof Config]);
    }
  }

  // set
  if (command === 'set') {
    const key = argv._[1] as string | undefined;
    const value = argv._[2] as string | undefined;
    if (!key || !value) {
      console.error('Missing key or value');
      return;
    }
    configManager.setConfig(argv.global, key, value);
    console.log(`Set ${key} = ${value} to ${configPath}`);
  }

  // remove
  if (command === 'remove' || command === 'rm') {
    const key = argv._[1] as string;
    if (!key) {
      console.error('Missing key');
      return;
    }
    const values = argv._[2]
      ? (argv._[2] as string).split(',').map((v) => v.trim())
      : undefined;
    configManager.removeConfig(argv.global, key, values);
    if (values) {
      console.log(`Removed ${values.join(', ')} from ${key} in ${configPath}`);
    } else {
      console.log(`Removed ${key} from ${configPath}`);
    }
  }

  // add
  if (command === 'add') {
    const key = argv._[1] as string | undefined;
    const value = argv._[2] as string | undefined;
    if (!key || !value) {
      console.error('Missing key or value');
      return;
    }
    const splitted = value.split(',').map((v) => v.trim());
    configManager.addConfig(argv.global, key, splitted);
    console.log(`Added ${splitted.join(', ')} to ${key} in ${configPath}`);
  }

  // list
  if (command === 'list' || command === 'ls') {
    const config = argv.global
      ? configManager.globalConfig
      : configManager.projectConfig;
    console.log(JSON.stringify(config, null, 2));
  }
}
