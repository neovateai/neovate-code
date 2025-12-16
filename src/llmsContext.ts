import fs from 'fs';
import path from 'pathe';
import { platform } from 'process';
import type { Context } from './context';
import { PluginHookType } from './plugin';
import { getLlmsRules } from './rules';
import { createLSTool } from './tools/ls';
import { getGitStatus, getLlmGitStatus } from './utils/git';
import { isProjectDirectory } from './utils/project';

export type LlmsContextCreateOpts = {
  context: Context;
  sessionId: string;
  userPrompt: string | null;
  additionalDirectories?: string[];
};

export class LlmsContext {
  messages: string[];
  constructor(opts: { messages: string[] }) {
    this.messages = opts.messages;
  }

  static async create(opts: LlmsContextCreateOpts) {
    const gitStatus = await getGitStatus({ cwd: opts.context.cwd });

    let llmsContext: Record<string, string> = {};
    // 1. git status
    const llmsGitStatus = await getLlmGitStatus(gitStatus);
    if (llmsGitStatus) {
      llmsContext.gitStatus = llmsGitStatus;
    }
    // 2. directory structure
    const isProject = isProjectDirectory(opts.context.cwd);
    if (isProject) {
      const LSTool = createLSTool({
        cwd: opts.context.cwd,
      });
      const result = await LSTool.execute({ dir_path: '.' });
      if (result) {
        llmsContext.directoryStructure = `
${result.returnDisplay}
<directory_structure>
${result.llmContent}
</directory_structure>
        `.trim();
      }
    }
    // 3. rules
    const rules = getLlmsRules({
      cwd: opts.context.cwd,
      productName: opts.context.productName,
      globalConfigDir: opts.context.paths.globalConfigDir,
    });
    if (rules) {
      llmsContext.rules = rules.llmsDescription;
    }
    // 4. readme
    const readmePath = path.join(opts.context.cwd, 'README.md');
    if (fs.existsSync(readmePath)) {
      llmsContext.readme = fs.readFileSync(readmePath, 'utf-8');
    }

    llmsContext = await opts.context.apply({
      hook: 'context',
      args: [
        {
          sessionId: opts.sessionId,
          userPrompt: opts.userPrompt,
        },
      ],
      memo: llmsContext,
      type: PluginHookType.SeriesMerge,
    });
    const llmsContextStr = `
# Context
As you answer the user's questions, you can use the following context:
${Object.entries(llmsContext)
  .map(([key, value]) => `<context name="${key}">${value}</context>`)
  .join('\n')}
    `.trim();

    let llmsEnv = {
      'Working directory': opts.context.cwd,
      ...(opts.additionalDirectories &&
        opts.additionalDirectories.length > 0 && {
          'Additional working directories':
            opts.additionalDirectories.join(', '),
        }),
      'Is directory a git repo': gitStatus ? 'YES' : 'NO',
      Platform: platform,
      "Today's date": new Date().toLocaleDateString(),
    };
    llmsEnv = await opts.context.apply({
      hook: 'env',
      args: [
        {
          sessionId: opts.sessionId,
          userPrompt: opts.userPrompt,
        },
      ],
      memo: llmsEnv,
      type: PluginHookType.SeriesMerge,
    });
    const llmsEnvStr = `
# Environment
Here is useful information about the environment you are running in.
${Object.entries(llmsEnv)
  .map(([key, value]) => `<env name="${key}">${value}</env>`)
  .join('\n')}
    `.trim();

    return new LlmsContext({ messages: [llmsContextStr, llmsEnvStr] });
  }
}
