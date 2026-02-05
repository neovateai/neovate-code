import { Context } from './context';
import { MessageBus } from './messageBus';
import { PluginHookType } from './plugin';
import type { PreviewSkillsResult } from './skill';

import { registerConfigHandlers } from './nodeBridge/slices/config';
import { registerGitHandlers } from './nodeBridge/slices/git';
import { registerGlobalDataHandlers } from './nodeBridge/slices/globalData';
import { registerMcpHandlers } from './nodeBridge/slices/mcp';
import { registerModelsHandlers } from './nodeBridge/slices/models';
import { registerOutputStylesHandlers } from './nodeBridge/slices/outputStyles';
import { registerProjectHandlers } from './nodeBridge/slices/project';
import { registerProvidersHandlers } from './nodeBridge/slices/providers';
import { registerSessionHandlers } from './nodeBridge/slices/session';
import { registerSkillsHandlers } from './nodeBridge/slices/skills';
import { registerSlashCommandHandlers } from './nodeBridge/slices/slashCommand';
import { registerSnapshotHandlers } from './nodeBridge/slices/snapshot';
import { registerStatusHandlers } from './nodeBridge/slices/status';
import { registerUtilsHandlers } from './nodeBridge/slices/utils';

type NodeBridgeOpts = {
  contextCreateOpts: any;
};

export class NodeBridge {
  messageBus: MessageBus;
  private contextCreateOpts: any;
  constructor(opts: NodeBridgeOpts) {
    this.messageBus = new MessageBus();
    this.contextCreateOpts = opts.contextCreateOpts;
    new NodeHandlerRegistry(this.messageBus, this.contextCreateOpts);
  }
}

class NodeHandlerRegistry {
  private messageBus: MessageBus;
  private contextCreateOpts: any;
  private contexts = new Map<string, Context>();
  private abortControllers = new Map<string, AbortController>();
  private skillPreviews = new Map<string, PreviewSkillsResult>();

  constructor(messageBus: MessageBus, contextCreateOpts: any) {
    this.messageBus = messageBus;
    this.contextCreateOpts = contextCreateOpts;
    this.registerHandlers();
  }

  private async getContext(cwd: string) {
    if (this.contexts.has(cwd)) {
      return this.contexts.get(cwd)!;
    }
    const context = await Context.create({
      cwd,
      ...this.contextCreateOpts,
      messageBus: this.messageBus,
    });
    context.mcpManager.initAsync();
    this.contexts.set(cwd, context);

    await this.applyPluginHandlers(context);

    return context;
  }

  private async applyPluginHandlers(context: Context) {
    const pluginHandlers = await context.apply({
      hook: 'nodeBridgeHandler',
      args: [],
      memo: {},
      type: PluginHookType.SeriesMerge,
    });

    for (const [method, handler] of Object.entries(pluginHandlers)) {
      this.messageBus.registerHandler(method, async (data: any) => {
        return await (handler as Function)(data, context);
      });
    }
  }

  private async clearContext(cwd?: string) {
    if (cwd) {
      const context = this.contexts.get(cwd);
      if (context) {
        await context.destroy();
        this.contexts.delete(cwd);
      }
    } else {
      this.contexts.clear();
    }
  }

  private registerHandlers() {
    const getContext = this.getContext.bind(this);
    const clearContext = this.clearContext.bind(this);

    registerConfigHandlers(this.messageBus, getContext, clearContext);
    registerGlobalDataHandlers(this.messageBus, getContext);
    registerMcpHandlers(this.messageBus, getContext);
    registerModelsHandlers(this.messageBus, getContext, clearContext);
    registerOutputStylesHandlers(this.messageBus, getContext);
    registerProjectHandlers(this.messageBus, getContext, clearContext);
    registerGitHandlers(this.messageBus, getContext, this.abortControllers);
    registerProvidersHandlers(this.messageBus, getContext);
    registerSessionHandlers(this.messageBus, getContext, this.abortControllers);
    registerSkillsHandlers(this.messageBus, getContext, this.skillPreviews);
    registerSlashCommandHandlers(this.messageBus, getContext);
    registerSnapshotHandlers(this.messageBus, getContext, clearContext);
    registerStatusHandlers(this.messageBus, getContext);
    registerUtilsHandlers(this.messageBus, getContext);
  }
}
