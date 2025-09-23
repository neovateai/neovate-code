import { type EventHandler, MessageBus } from './messageBus';
import type { ApprovalCategory, ToolUse } from './tool';
import type { AppStore } from './ui/store';

export class UIBridge {
  appStore: AppStore;
  messageBus: MessageBus;
  constructor(opts: { appStore: AppStore }) {
    this.appStore = opts.appStore;
    this.messageBus = new MessageBus();
    new UIHandlerRegistry(this.messageBus, this.appStore);
  }
  request(method: string, params: any, options: { timeout?: number } = {}) {
    return this.messageBus.request(method, params, options);
  }
  emitEvent(event: string, data: any) {
    return this.messageBus.emitEvent(event, data);
  }
  onEvent(event: string, handler: EventHandler) {
    return this.messageBus.onEvent(event, handler);
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
        return { approved: result };
      },
    );
  }
}
