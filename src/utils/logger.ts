import * as p from '@umijs/clack-prompts';
import pc from 'picocolors';
import { MarkdownTaskLogger } from './markdown';
import { symbols } from './symbols';

export function logIntro(opts: { productName: string; version: string }) {
  console.log();
  const productName = opts.productName
    .toLowerCase()
    .replace(/^./, (char) => char.toUpperCase());
  p.intro(`${pc.bold(productName)} ${pc.dim(`v${opts.version}`)}`);
}

export function logGeneralInfo(opts: { infos: Record<string, string> }) {
  const infos = Object.entries(opts.infos)
    .map(([key, value]) => `${symbols.arrowDown} ${key}: ${value}`)
    .join('\n');
  p.note(infos, 'General Info');
}

export function logCommand(opts: { command: string }) {
  p.log.step(
    pc.bold(
      pc.blueBright('command:') +
        '\n' +
        pc.reset(pc.bold(pc.dim(opts.command))),
    ),
  );
}

export function logUserInput(opts: { input: string }) {
  p.log.step(
    pc.bold(pc.blueBright('user:') + '\n' + pc.reset(pc.dim(opts.input))),
  );
}

export async function getUserInput(opts?: {
  message?: string;
  placeholder?: string;
  validate?: (input: string) => string | void;
  defaultValue?: string;
}) {
  opts = opts || {};
  const input = await p.text({
    message: pc.bold(pc.blueBright(opts.message || 'user:')),
    placeholder: opts.placeholder,
    initialValue: opts.defaultValue,
    validate:
      opts.validate ||
      ((input) => {
        if (!input || input.trim() === '') {
          return `Empty input is not allowed.`;
        }
      }),
  });
  if (p.isCancel(input)) {
    throw new Error('User cancelled the input.');
  }
  return input;
}

export function spinThink(opts: { productName: string }) {
  const productName = opts.productName.toLowerCase();
  const spinner1 = p.spinner();
  spinner1.start(pc.bold(pc.magentaBright(`${productName} is thinking`)));
  return () => {
    spinner1.stop('💡');
  };
}

export function logThink(opts: { productName: string }) {
  const productName = opts.productName.toLowerCase();
  const task = p.taskLog(pc.bold(pc.magentaBright(`${productName}:`)));
  return {
    text: (text: string) => {
      task.text = text;
    },
  };
}

export function logThinkWithMarkdown(opts: { productName: string }) {
  const productName = opts.productName.toLowerCase();
  const logger = new MarkdownTaskLogger(productName);

  return {
    text: (text: string) => {
      logger.updateText(text);
    },
  };
}

export function logUsage(usage: Record<string, number | string>) {
  const text = Object.entries(usage)
    .map(([key, value]) => `${key}: ${value}`)
    .join(' | ');
  p.log.info(pc.dim(`[Usage] ${text}`));
}

export function logTool(opts: {
  toolUse: {
    toolName: string;
    arguments: Record<string, string>;
  };
}) {
  const task = p.taskLog(
    pc.bold(pc.magentaBright(`tool: (${opts.toolUse.toolName})`)),
  );
  task.text = `args: ${JSON.stringify(opts.toolUse.arguments)}\n`;
  return {
    result: (result: string) => {
      task.text = `${symbols.arrowDown} ${result}`;
    },
  };
}

export function logResult(result: string) {
  p.log.step(pc.green(result));
}

export function logOutro() {
  p.outro('✅');
}

export function logError(opts: { error: any }) {
  p.log.error(pc.red(opts.error) + '\n');
  p.cancel(`❌`);
}

export function logAction(opts: { message: string }) {
  p.log.step(pc.cyan(`[ACTION] ${opts.message}`));
}

export function logWarn(message: string) {
  p.log.warn(pc.yellow(`[WARN] ${message}`));
}

export function logInfo(message: string) {
  p.log.info(pc.cyan(`[INFO] ${message}`));
}

export function logDebug(message: string) {
  if (process.env.DEBUG) {
    console.debug(`[DEBUG] ${message}`);
  }
}

export async function confirm(opts: {
  message: string;
  active?: string;
  inactive?: string;
  initialValue?: boolean;
}) {
  return await p.confirm(opts);
}

export function isCancel(result: unknown) {
  return p.isCancel(result);
}
