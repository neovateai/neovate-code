import { Context } from './context';
import { JsonlLogger } from './jsonl';
import { MessageBus } from './messageBus';
import { Project } from './project';

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
    });
    this.contexts.set(cwd, context);
    return context;
  }

  private registerHandlers() {
    this.messageBus.registerHandler(
      'initialize',
      async (data: { cwd: string }) => {
        const context = await this.getContext(data.cwd);
        return {
          success: true,
          data: {
            productName: context.productName,
            version: context.version,
            model: context.config.model,
          },
        };
      },
    );

    this.messageBus.registerHandler(
      'send',
      async (data: {
        message: string;
        cwd: string;
        sessionId: string | undefined;
      }) => {
        const { message, cwd, sessionId } = data;
        const context = await this.getContext(cwd);
        const project = new Project({
          sessionId,
          context,
        });
        const abortController = new AbortController();
        const key = `${cwd}/${sessionId}`;
        this.abortControllers.set(key, abortController);
        const result = await project.send(message, {
          onMessage: async (opts) => {
            await this.messageBus.emitEvent('message', {
              message: opts.message,
            });
          },
          signal: abortController.signal,
        });
        this.abortControllers.delete(key);
        return result;
      },
    );

    this.messageBus.registerHandler(
      'cancel',
      async (data: { cwd: string; sessionId: string }) => {
        const { cwd, sessionId } = data;
        const key = `${cwd}/${sessionId}`;
        const abortController = this.abortControllers.get(key);
        abortController?.abort();
        this.abortControllers.delete(key);
        const context = await this.getContext(cwd);
        const jsonlLogger = new JsonlLogger({
          filePath: context.paths.getSessionLogPath(sessionId),
        });
        const message = jsonlLogger.addUserMessage(
          '[Request interrupted by user]',
          sessionId,
        );
        return {
          success: true,
          data: {
            message,
          },
        };
      },
    );
  }
}
