import * as p from '@umijs/clack-prompts';
import pc from 'picocolors';

export function logIntro(opts: { productName: string; version: string }) {
  console.log();
  const productName = opts.productName
    .toLowerCase()
    .replace(/^./, (char) => char.toUpperCase());
  p.intro(`${pc.bold(productName)} ${pc.dim(`v${opts.version}`)}`);
}

export function logGeneralInfo(opts: { infos: Record<string, string> }) {
  const infos = Object.entries(opts.infos)
    .map(([key, value]) => `↳ ${key}: ${value}`)
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

export async function getUserInput(opts: {
  message?: string;
  placeholder?: string;
  validate?: (input: string) => string | void;
}) {
  const input = await p.text({
    message: pc.bold(pc.blueBright(opts.message || 'user:')),
    placeholder: opts.placeholder,
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
  spinner1.start(pc.bold(pc.magentaBright(`${productName} is thinking...`)));
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
      task.text = `↳ ${result}`;
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

async function test2() {
  console.log();
  p.intro(`${pc.bold('Takumi')} ${pc.dim('v0.0.1')}`);
  const text = await getUserInput({
    message: 'Your Plan',
  });
  console.log(text);
  const result = await p.confirm({
    message: 'Do you want to proceed?',
  });
  console.log(result);
  p.note(
    `
↳ log: ${pc.dim('~/.takumi/sessions/xxxx.log')}
↳ workspace: ${pc.dim('~/workspace')}
↳ model: ${pc.dim('gpt-4o')}
↳ small model: ${pc.dim('gpt-4o-mini')}
↳ stream: ${pc.dim('true')}
    `.trim(),
    'General Info',
  );
  // run command commit
  p.log.step(
    pc.bold(
      pc.blueBright('command:') + '\n' + pc.reset(pc.bold(pc.dim('commit'))),
    ),
  );
  p.log.step(
    pc.bold(
      pc.blueBright('user:') +
        '\n' +
        pc.reset(pc.dim('write a commit message for the changes you made.')),
    ),
  );
  // await p.text({ message: pc.bold(pc.blueBright('User:')) });
  // await p.text({ message: pc.dim('Takumi') });
  const spinner1 = p.spinner();
  spinner1.start(pc.bold(pc.magentaBright('takumi is thinking...')));
  await delay(3000);
  spinner1.stop('💡');
  const task1 = p.taskLog(pc.bold(pc.magentaBright('takumi:')));
  task1.text = '...';
  await delay(1000);
  task1.text =
    "It looks like there was an issue executing the command. Let me resolve that for you. I'll try a different approach.";
  const task2 = p.taskLog(pc.bold(pc.magentaBright('tool: (git)')));
  task2.text = 'args: add -m "commit message"\n';
  task2.text = 'result: git add -m "commit message"';
  const spinner2 = p.spinner();
  spinner2.start(pc.bold(pc.magentaBright('takumi is thinking...')));
  await delay(2000);
  spinner2.stop('💡');
  p.log.step(pc.green('Done'));
  p.outro('✅');
  // await p.cancel('Hello, world!');
}

async function test() {
  await p.intro(`Takumi`);
  await p.text({ message: 'Hello, world!' });
  await p.note('Hello, world!', 'Takumi');
  await p.box('Hello, world!', 'Takumi');
  await p.log.info('Hello, world!');
  await p.log.success('Hello, world!');
  await p.log.warn('Hello, world!');
  await p.log.error('Hello, world!');
  await p.log.step('Hello, world!2');
  await p.log.message('Hello, world!1');
  const spinner = p.spinner();
  spinner.start('Hello, world!');
  await delay(1000);
  spinner.stop('Hello, world!');
  const task1 = await p.taskLog('Takumi');
  task1.text = '111';
  await delay(1000);
  task1.text = '2\n23';
  // task1.success('Hello, world!');
  const task2 = await p.taskLog('Takumi');
  task2.text = '1';
  await delay(1000);
  task2.text = '2';
  await delay(1000);
  task2.text = '23';
  task2.fail('Hello, world!');
  await p.outro(`Takumi`);
}

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// (async () => {
//   await test2();
// })();
