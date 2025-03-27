#!/usr/bin/env -S node --no-warnings=ExperimentalWarning
import dotenv from 'dotenv';
import yParser from 'yargs-parser';
import { runAct } from './commands/act';
import { runInit } from './commands/init';
import { runPlan } from './commands/plan';
import { getConfig, printConfig } from './config';
import { logError, logPrompt } from './logger';
import { getCodebaseContext } from './codebase';

async function main() {
  dotenv.config();
  const argv = yParser(process.argv.slice(2));
  const config = await getConfig({ argv });
  printConfig(config);
  console.log();

  const command = argv._[0] as string;
  if (!command) {
    logError('No command provided');
    process.exit(1);
  }
  switch (command) {
    // tmp command for testing
    case '__test':
      logPrompt('/__test');
      await getCodebaseContext();
      break;
    case 'plan':
      logPrompt('/plan');
      await runPlan({
        prompt: argv._[1] as string,
        config,
      });
      break;
    case 'init':
      logPrompt('/init');
      await runInit({ config });
      break;
    default:
      const prompt = command;
      logPrompt(prompt);
      await runAct({ prompt, config });
  }
}

main()
  .catch(console.error)
  .finally(() => {
    process.exit(0);
  });
