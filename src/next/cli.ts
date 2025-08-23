import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yargsParser from 'yargs-parser';
import { PRODUCT_NAME } from '../constants';
import { type Plugin } from '../plugin';
import { Context } from './context';
import { Project } from './project';

function parseArgs(argv: any) {
  return yargsParser(argv, {
    alias: {
      model: 'm',
      help: 'h',
      resume: 'r',
      quiet: 'q',
    },
    default: {
      mcp: true,
    },
    array: ['plugin'],
    boolean: ['help', 'quiet', 'mcp'],
    string: [
      'resume',
      'model',
      'smallModel',
      'planModel',
      'systemPrompt',
      'appendSystemPrompt',
      'outputStyle',
      'cwd',
    ],
  });
}

function printHelp() {}

export async function runNeovate(opts: {
  productName: string;
  version: string;
  plugins: Plugin[];
}) {
  const argv = parseArgs(process.argv.slice(2));
  if (argv.help) {
    printHelp();
    return;
  }
  const cwd = argv.cwd || process.cwd();
  const context = await Context.create({
    cwd,
    productName: opts.productName,
    version: opts.version,
    argvConfig: {
      model: argv.model,
      smallModel: argv.smallModel,
      planModel: argv.planModel,
      quiet: argv.quiet,
      plugins: argv.plugin,
      systemPrompt: argv.systemPrompt,
      appendSystemPrompt: argv.appendSystemPrompt,
      language: argv.language,
      outputStyle: argv.outputStyle,
    },
    plugins: opts.plugins,
  });
  const project = new Project({
    cwd,
    context,
    sessionId: argv.resume,
  });
  const result = await project.send('create a new file called "test.txt"');
  console.log(result);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../package.json'), 'utf-8'),
);
runNeovate({
  productName: PRODUCT_NAME,
  version: pkg.version,
  plugins: [],
}).catch((e) => {
  console.error(e);
});
