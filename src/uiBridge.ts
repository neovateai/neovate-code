import { BASH_EVENTS } from './constants';
import { type EventHandler, MessageBus } from './messageBus';
import type { HandlerMap } from './nodeBridge.types';
import type { ApprovalCategory, ToolUse } from './tool';
import type { AppStore, BashPromptBackgroundEvent } from './ui/store';

export class UIBridge {
  appStore: AppStore;
  messageBus: MessageBus;
  constructor(opts: { appStore: AppStore }) {
    this.appStore = opts.appStore;
    this.messageBus = new MessageBus();
    new UIHandlerRegistry(this.messageBus, this.appStore);
  }
  // Typed overload for known handler methods
  request<K extends keyof HandlerMap>(
    method: K,
    params: HandlerMap[K]['input'],
    options?: { timeout?: number },
  ): Promise<HandlerMap[K]['output']>;
  // Untyped overload for dynamic/unknown handler methods
  request(
    method: string,
    params: any,
    options?: { timeout?: number },
  ): Promise<any>;
  // Implementation
  request(method: string, params: any, options: { timeout?: number } = {}) {
    return this.messageBus.request(method, params, options);
  }
  emitEvent(event: string, data: any) {
    return this.messageBus.emitEvent(event, data);
  }
  onEvent(event: string, handler: EventHandler) {
    return this.messageBus.onEvent(event, handler);
  }

  async requestMoveToBackground(taskId: string) {
    return this.messageBus.emitEvent(BASH_EVENTS.MOVE_TO_BACKGROUND, {
      taskId,
    });
  }
}

class UIHandlerRegistry {
  private messageBus: MessageBus;
  private appStore: AppStore;
  constructor(messageBus: MessageBus, appStore: AppStore) {
    this.messageBus = messageBus;
    this.appStore = appStore;
    this.registerHandlers();
  }

  private registerHandlers() {
    this.messageBus.registerHandler(
      'toolApproval',
      async ({
        toolUse,
        category,
      }: {
        toolUse: ToolUse;
        category?: ApprovalCategory;
      }) => {
        const result = await this.appStore.approveToolUse({
          toolUse,
          category,
        });
        return {
          approved: result.approved,
          params: result.params,
          denyReason: result.denyReason,
        };
      },
    );

    this.messageBus.onEvent(
      BASH_EVENTS.PROMPT_BACKGROUND,
      (data: BashPromptBackgroundEvent) => {
        this.appStore.setBashBackgroundPrompt(data);
      },
    );

    this.messageBus.onEvent(BASH_EVENTS.BACKGROUND_MOVED, () => {
      this.appStore.clearBashBackgroundPrompt();
    });
  }
}
