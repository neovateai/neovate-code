import { platform } from 'process';
import { Context } from './context';
import {
  CodebaseContributor,
  ContextContributor,
  DirectoryStructureContributor,
  FilesContributor,
  GitStatusContributor,
  IDEContributor,
  ReadmeContributor,
  RulesContributor,
} from './context-contributor';
import { PluginHookType } from './plugin';
import { isProjectDirectory } from './utils/project';

export class SystemPromptBuilder {
  private context: Context;
  constructor(context: Context) {
    this.context = context;
  }

  async buildSystemPrompts() {
    const contextPrompt = await this.#buildContextPrompt();
    const envPrompt = await this.#buildEnvPrompt();
    return [contextPrompt, envPrompt];
  }

  async #buildContextPrompt() {
    const appContext = this.context;
    const contributors: ContextContributor[] = [
      new GitStatusContributor(),
      new IDEContributor(),
      ...(isProjectDirectory(appContext.cwd)
        ? [new DirectoryStructureContributor()]
        : []),
      new RulesContributor(),
      new ReadmeContributor(),
      new CodebaseContributor(),
      new FilesContributor(),
    ];
    let context: Record<string, string> = {};
    for (const contributor of contributors) {
      const content = await contributor.getContent({ context: appContext });
      if (content) {
        context[contributor.name] = content;
      }
    }
    context = await appContext.apply({
      hook: 'context',
      args: [],
      memo: context,
      type: PluginHookType.SeriesMerge,
    });
    return `
# Context
As you answer the user's questions, you can use the following context:
${Object.entries(context)
  .map(([key, value]) => `<context name="${key}">${value}</context>`)
  .join('\n')}
    `.trim();
  }

  async #buildEnvPrompt() {
    const context = this.context;
    let envs = {
      'Working directory': context.cwd,
      'Is directory a git repo': context.git ? 'YES' : 'NO',
      Platform: platform,
      "Today's date": new Date().toLocaleDateString(),
    };
    envs = await this.context.apply({
      hook: 'env',
      args: [],
      memo: envs,
      type: PluginHookType.SeriesMerge,
    });
    return `
# Environment
Here is useful information about the environment you are running in.
${Object.entries(envs)
  .map(([key, value]) => `<env name="${key}">${value}</env>`)
  .join('\n')}
    `.trim();
  }
}
