import yargsParser from 'yargs-parser';
import { type Plugin, PluginHookType } from '../plugin';
import { Tools } from '../tool';
import { randomUUID } from '../utils/randomUUID';
import { Context } from './context';
import { runLoop } from './loop';
import { modelAlias, providers, resolveModel } from './model';
import { generateSystemPrompt } from './systemPrompt';
import { resolveTools } from './tool';
import { Usage } from './usage';

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

type SessionId = string;

class Project {
  cwd: string;
  session: Session;
  context: Context;
  constructor(opts: { cwd: string; sessionId: SessionId; context: Context }) {
    this.cwd = opts.cwd;
    this.session = opts.sessionId
      ? new Session({
          id: opts.sessionId,
          project: this,
        })
      : Session.create({
          project: this,
        });
    this.context = opts.context;
  }
  async send(message: string, opts: { model?: string } = {}) {
    await this.context.apply({
      hook: 'userPrompt',
      args: [
        {
          text: message,
          sessionId: this.session.id,
        },
      ],
      type: PluginHookType.Series,
    });
    const hookedProviders = await this.context.apply({
      hook: 'provider',
      args: [],
      memo: providers,
      type: PluginHookType.SeriesLast,
    });
    const hookedModelAlias = await this.context.apply({
      hook: 'modelAlias',
      args: [],
      memo: modelAlias,
      type: PluginHookType.SeriesLast,
    });
    const model = resolveModel(
      opts.model || this.context.config.model,
      hookedProviders,
      hookedModelAlias,
    );
    let tools = await resolveTools({
      context: this.context,
    });
    tools = await this.context.apply({
      hook: 'tool',
      args: [],
      memo: tools,
      type: PluginHookType.SeriesMerge,
    });
    const systemPrompt = generateSystemPrompt({
      todo: false,
      productName: this.context.productName,
    });
    const result = await runLoop({
      input: message,
      model,
      tools: new Tools(tools),
      systemPrompt,
      // TODO: signal
      onTextDelta: async (text) => {},
      onText: async (text) => {
        await this.context.apply({
          hook: 'text',
          args: [
            {
              text,
              sessionId: this.session.id,
            },
          ],
          type: PluginHookType.Series,
        });
      },
      onReasoning: async (text) => console.log(text),
      onToolUse: async (toolUse) => {
        await this.context.apply({
          hook: 'toolUse',
          args: [
            {
              toolUse,
              sessionId: this.session.id,
            },
          ],
          type: PluginHookType.Series,
        });
      },
      onToolUseResult: async (toolUseResult) => {
        const { toolUse, result } = toolUseResult;
        await this.context.apply({
          hook: 'toolUseResult',
          args: [
            {
              toolUse,
              result,
              sessionId: this.session.id,
            },
          ],
          type: PluginHookType.Series,
        });
      },
      onTurn: async (turn) => {},
      onToolApprove: async (toolUse) => {
        return true;
      },
    });
    return result;
  }
}

class Session {
  id: SessionId;
  project: Project;
  usage: Usage;
  constructor(opts: { id: SessionId; project: Project }) {
    this.id = opts.id;
    this.project = opts.project;
    this.usage = Usage.empty();
  }
  static create(opts: { project: Project }) {
    return new Session({
      id: randomUUID(),
      project: opts.project,
    });
  }
}

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

runNeovate({
  productName: 'neovate',
  version: '0.0.0',
  plugins: [],
}).catch((e) => {
  console.error(e);
});
