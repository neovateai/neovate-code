import { Runner, setTraceProcessors, withTrace } from '@openai/agents';
import * as p from '@umijs/clack-prompts';
import assert from 'assert';
import { execSync } from 'child_process';
import pc from 'picocolors';
import yargsParser from 'yargs-parser';
import { RunCliOpts } from '..';
import { createShellAgent } from '../agents/shell';
import { Context } from '../context';
import * as logger from '../utils/logger';

async function executeShell(
  command: string,
  cwd: string,
): Promise<{ success: boolean; output: string }> {
  try {
    logger.logAction({ message: `Executing command: ${command}` });
    const output = execSync(command, {
      cwd,
      encoding: 'utf-8',
      stdio: ['ignore', 'inherit', 'inherit'],
    });
    logger.logAction({ message: `Command executed successfully` });
    return { success: true, output: output?.toString() || '' };
  } catch (error: any) {
    logger.logError({
      error: `Command execution failed: ${error.message || 'Unknown error'}`,
    });
    return {
      success: false,
      output: error.message || 'Command execution failed',
    };
  }
}

function printHelp(p: string) {
  console.log(
    `
Usage:
  ${p} run [options] <prompt>

Convert natural language to shell commands using AI and optionally execute them.

Arguments:
  prompt                Natural language description of what you want to do

Options:
  -h, --help            Show help
  -m, --model <model>   Specify model to use
  --yes                 Execute the command without confirmation

Examples:
  ${p} run "list all files in current directory"
  ${p} run "find all .js files modified in last 7 days"
  ${p} run --yes "update all npm dependencies"
    `.trim(),
  );
}

export async function runRun(opts: RunCliOpts) {
  setTraceProcessors([]);
  const traceName = `${opts.productName}-run`;
  return await withTrace(traceName, async () => {
    const argv = yargsParser(process.argv.slice(2), {
      alias: {
        model: 'm',
        help: 'h',
        yes: 'y',
      },
      boolean: ['help', 'yes'],
      string: ['model'],
    });

    if (argv.help) {
      printHelp(opts.productName.toLowerCase());
      return;
    }

    logger.logIntro({
      productName: opts.productName,
      version: opts.version,
    });

    let prompt = argv._[1] as string;
    if (!prompt || prompt.trim() === '') {
      prompt = await logger.getUserInput();
    } else {
      logger.logUserInput({ input: prompt });
    }

    // Use AI to convert natural language to shell command
    logger.logAction({
      message: `AI is converting natural language to shell command...`,
    });

    const context = await Context.create({
      productName: opts.productName,
      version: opts.version,
      cwd: process.cwd(),
      argvConfig: {
        model: argv.model,
        plugins: argv.plugin,
      },
      plugins: opts.plugins,
    });
    await context.destroy();

    const agent = createShellAgent({
      model: context.config.model,
    });
    const runner = new Runner({
      modelProvider: context.getModelProvider(),
    });
    const result = await runner.run(agent, prompt);
    let command = result.finalOutput;
    assert(command, 'Command is not a string');

    // Display the generated command and request confirmation
    logger.logInfo(
      `
${pc.bold(pc.blueBright('AI generated shell command:'))}
${command}
  `.trim(),
    );

    // If --yes mode is enabled, execute the command without confirmation
    if (argv.yes) {
      const result = await executeShell(command, process.cwd());

      if (!result.success) {
        logger.logError({
          error: `Command execution failed: ${result.output}`,
        });
      }
      return;
    }

    // Default behavior: request confirmation
    const execution = await p.select({
      message: 'Confirm execution',
      options: [
        { value: 'execute', label: 'Execute' },
        { value: 'edit', label: 'Edit' },
        { value: 'cancel', label: 'Cancel' },
      ],
    });

    if (logger.isCancel(execution)) {
      logger.logInfo('Command execution cancelled');
      return;
    }

    if (execution === 'edit') {
      const editedCommand = await logger.getUserInput({
        message: 'Edit command',
        defaultValue: command,
      });

      if (editedCommand) {
        command = editedCommand;
      }

      const confirmExecution = await logger.confirm({
        message: `Execute command: ${pc.reset(pc.gray(command))}`,
        active: pc.green('Execute'),
        inactive: pc.red('Cancel'),
      });

      if (!confirmExecution || logger.isCancel(confirmExecution)) {
        logger.logInfo('Command execution cancelled');
        return;
      }
    }

    if (execution === 'cancel') {
      logger.logInfo('Command execution cancelled');
      return;
    }

    const executeResult = await executeShell(command, process.cwd());

    if (executeResult.success) {
      logger.logOutro();
    } else {
      logger.logError({
        error: `Command execution failed: ${executeResult.output}`,
      });
    }
  });
}
